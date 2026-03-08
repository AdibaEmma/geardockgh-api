import { Injectable, NotFoundException } from '@nestjs/common';
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
        isPublished: dto.isPublished ?? false,
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
