import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';
import type { CreateDiscountDto } from '../dtos/create-discount.dto.js';

@Injectable()
export class DiscountService {
  private readonly logger = new Logger(DiscountService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateDiscountDto) {
    const code = dto.code.toUpperCase().trim();

    const existing = await this.prisma.discountCode.findUnique({
      where: { code_tenantId: { code, tenantId } },
    });

    if (existing) {
      throw new BadRequestException(`Discount code "${code}" already exists`);
    }

    return this.prisma.discountCode.create({
      data: {
        tenantId,
        code,
        type: dto.type,
        value: dto.value,
        minOrderPesewas: dto.minOrderPesewas,
        maxUses: dto.maxUses,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });
  }

  async findAll(
    tenantId: string,
    query: { page?: number; limit?: number; search?: string; isActive?: string },
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.DiscountCodeWhereInput = { tenantId };

    if (query.search) {
      where.code = { contains: query.search.toUpperCase(), mode: 'insensitive' };
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive === 'true';
    }

    const [data, total] = await Promise.all([
      this.prisma.discountCode.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.discountCode.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async validate(
    code: string,
    subtotalPesewas: number,
    tenantId: string,
  ): Promise<{ valid: boolean; discountPesewas: number; type: string; message: string }> {
    const normalizedCode = code.toUpperCase().trim();

    const discount = await this.prisma.discountCode.findUnique({
      where: { code_tenantId: { code: normalizedCode, tenantId } },
    });

    if (!discount) {
      return { valid: false, discountPesewas: 0, type: '', message: 'Invalid discount code' };
    }

    if (!discount.isActive) {
      return { valid: false, discountPesewas: 0, type: discount.type, message: 'This code is no longer active' };
    }

    if (discount.expiresAt && discount.expiresAt < new Date()) {
      return { valid: false, discountPesewas: 0, type: discount.type, message: 'This code has expired' };
    }

    if (discount.maxUses && discount.usedCount >= discount.maxUses) {
      return { valid: false, discountPesewas: 0, type: discount.type, message: 'This code has reached its usage limit' };
    }

    if (discount.minOrderPesewas && subtotalPesewas < discount.minOrderPesewas) {
      const minGhs = (discount.minOrderPesewas / 100).toFixed(2);
      return { valid: false, discountPesewas: 0, type: discount.type, message: `Minimum order of GH₵${minGhs} required` };
    }

    let discountPesewas: number;
    if (discount.type === 'percentage') {
      discountPesewas = Math.round((subtotalPesewas * discount.value) / 10000);
    } else {
      discountPesewas = discount.value;
    }

    // Cap discount at subtotal
    discountPesewas = Math.min(discountPesewas, subtotalPesewas);

    const label = discount.type === 'percentage'
      ? `${(discount.value / 100).toFixed(0)}% off`
      : `GH₵${(discount.value / 100).toFixed(2)} off`;

    return { valid: true, discountPesewas, type: discount.type, message: label };
  }

  async redeem(code: string, tenantId: string): Promise<void> {
    const normalizedCode = code.toUpperCase().trim();

    await this.prisma.discountCode.updateMany({
      where: { code: normalizedCode, tenantId },
      data: { usedCount: { increment: 1 } },
    });

    this.logger.log(`Discount code redeemed: ${normalizedCode}`);
  }

  async toggleActive(id: string, tenantId: string) {
    const discount = await this.prisma.discountCode.findFirst({
      where: { id, tenantId },
    });

    if (!discount) {
      throw new NotFoundException('Discount code not found');
    }

    return this.prisma.discountCode.update({
      where: { id },
      data: { isActive: !discount.isActive },
    });
  }

  async delete(id: string, tenantId: string) {
    const discount = await this.prisma.discountCode.findFirst({
      where: { id, tenantId },
    });

    if (!discount) {
      throw new NotFoundException('Discount code not found');
    }

    return this.prisma.discountCode.delete({ where: { id } });
  }
}
