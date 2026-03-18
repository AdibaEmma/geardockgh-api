import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';
import type { CreateProductDto } from '../dtos/create-product.dto.js';
import type { UpdateProductDto } from '../dtos/update-product.dto.js';
import type { ProductQueryDto } from '../dtos/product-query.dto.js';
import type { PaginatedResult } from '../../../core/interfaces/pagination.interface.js';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto, tenantId: string) {
    this.validateImagesJson(dto.imagesJson);
    const slug = this.generateSlug(dto.name);

    return this.prisma.product.create({
      data: {
        tenantId,
        name: dto.name,
        slug,
        description: dto.description,
        pricePesewas: dto.pricePesewas,
        comparePricePesewas: dto.comparePricePesewas,
        stockCount: dto.stockCount ?? 0,
        isPreorder: dto.isPreorder ?? false,
        preorderDepositType: dto.preorderDepositType,
        preorderDepositValue: dto.preorderDepositValue,
        preorderMinUnits: dto.preorderMinUnits,
        estArrivalDate: dto.estArrivalDate ? new Date(dto.estArrivalDate) : undefined,
        isPublished: dto.isPublished ?? false,
        isFeatured: dto.isFeatured ?? false,
        category: dto.category,
        imagesJson: dto.imagesJson,
        specsJson: dto.specsJson,
      },
      include: { variants: true },
    });
  }

  async findAll(
    query: ProductQueryDto,
    tenantId: string,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      tenantId,
      isPublished: true,
      deletedAt: null,
    };

    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.isPreorder !== undefined) {
      where.isPreorder = query.isPreorder;
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput = {};
    const sortField = query.sortBy ?? 'createdAt';
    const sortDir = query.sortOrder ?? 'desc';

    if (sortField === 'pricePesewas' || sortField === 'name' || sortField === 'createdAt') {
      orderBy[sortField] = sortDir;
    }

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: { variants: true },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAllAdmin(
    query: { page?: number; limit?: number; search?: string; category?: string; status?: string },
    tenantId: string,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      tenantId,
      deletedAt: null,
    };

    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.status === 'published') {
      where.isPublished = true;
    } else if (query.status === 'draft') {
      where.isPublished = false;
    }

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: { variants: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findBySlug(slug: string, tenantId: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug_tenantId: { slug, tenantId } },
      include: { variants: true },
    });

    if (!product || product.deletedAt) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async findById(id: string, tenantId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { variants: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(id: string, dto: UpdateProductDto, tenantId: string) {
    if (dto.imagesJson !== undefined) {
      this.validateImagesJson(dto.imagesJson);
    }
    await this.findById(id, tenantId);

    const data: Prisma.ProductUpdateInput = { ...dto };

    if (dto.name) {
      data.slug = this.generateSlug(dto.name);
    }

    return this.prisma.product.update({
      where: { id },
      data,
      include: { variants: true },
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findById(id, tenantId);

    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findFeatured(tenantId: string, limit = 8) {
    return this.prisma.product.findMany({
      where: {
        tenantId,
        isPublished: true,
        isFeatured: true,
        deletedAt: null,
      },
      include: { variants: true },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
  }

  private validateImagesJson(imagesJson?: string | null): void {
    if (!imagesJson) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(imagesJson);
    } catch {
      throw new BadRequestException('imagesJson must be a valid JSON string');
    }

    if (!Array.isArray(parsed)) {
      throw new BadRequestException('imagesJson must be a JSON array');
    }

    if (parsed.length > 8) {
      throw new BadRequestException('Maximum 8 images allowed per product');
    }

    for (const url of parsed) {
      if (typeof url !== 'string' || !url.startsWith('https://')) {
        throw new BadRequestException('Each image must be a valid HTTPS URL');
      }
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
