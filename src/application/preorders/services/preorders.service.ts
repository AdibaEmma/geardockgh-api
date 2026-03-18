import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PreorderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';
import type { CreatePreorderDto } from '../dtos/create-preorder.dto.js';
import type { PreorderQueryDto } from '../dtos/preorder-query.dto.js';
import type { PaginatedResult } from '../../../core/interfaces/pagination.interface.js';

@Injectable()
export class PreordersService {
  private readonly logger = new Logger(PreordersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePreorderDto, customerId: string, tenantId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId, deletedAt: null },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!product.isPreorder) {
      throw new BadRequestException('Product is not available for pre-order');
    }

    // Calculate deposit
    const unitPrice = product.pricePesewas;
    const totalPesewas = unitPrice * dto.quantity;
    let depositPesewas: number;

    if (product.preorderDepositType === 'percentage' && product.preorderDepositValue != null) {
      depositPesewas = Math.round((totalPesewas * product.preorderDepositValue) / 100);
    } else if (product.preorderDepositType === 'fixed' && product.preorderDepositValue != null) {
      depositPesewas = product.preorderDepositValue * dto.quantity;
    } else {
      // No deposit config — charge full amount
      depositPesewas = totalPesewas;
    }

    const balancePesewas = totalPesewas - depositPesewas;

    const preorder = await this.prisma.$transaction(async (tx) => {
      const created = await tx.preorder.create({
        data: {
          tenantId,
          customerId,
          productId: dto.productId,
          quantity: dto.quantity,
          depositPesewas,
          balancePesewas,
          totalPesewas,
          estArrivalDate: product.estArrivalDate,
          status: PreorderStatus.RESERVED,
          notes: dto.notes,
        },
        include: { product: true, customer: true },
      });

      // Increment slots taken
      await tx.product.update({
        where: { id: dto.productId },
        data: { preorderSlotsTaken: { increment: dto.quantity } },
      });

      return created;
    });

    return preorder;
  }

  async findByCustomer(
    customerId: string,
    tenantId: string,
    query: PreorderQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.PreorderWhereInput = {
      customerId,
      tenantId,
      deletedAt: null,
    };

    if (query.status) {
      where.status = query.status as PreorderStatus;
    }

    const [data, total] = await Promise.all([
      this.prisma.preorder.findMany({
        where,
        include: { product: true, payments: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.preorder.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string, customerId: string, tenantId: string) {
    const preorder = await this.prisma.preorder.findFirst({
      where: { id, customerId, tenantId, deletedAt: null },
      include: { product: true, payments: true, customer: true },
    });

    if (!preorder) {
      throw new NotFoundException('Pre-order not found');
    }

    return preorder;
  }

  async findByIdInternal(id: string, tenantId: string) {
    const preorder = await this.prisma.preorder.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { product: true, payments: true, customer: true },
    });

    if (!preorder) {
      throw new NotFoundException('Pre-order not found');
    }

    return preorder;
  }

  async updateStatus(id: string, tenantId: string, status: PreorderStatus) {
    return this.prisma.preorder.update({
      where: { id },
      data: { status },
      include: { product: true },
    });
  }

  async findByProductIds(productIds: string[], tenantId: string, status?: PreorderStatus) {
    return this.prisma.preorder.findMany({
      where: {
        productId: { in: productIds },
        tenantId,
        deletedAt: null,
        ...(status && { status }),
      },
      include: { product: true, customer: true },
    });
  }
}
