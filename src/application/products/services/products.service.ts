import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';
import { StockNotificationService } from '../../notifications/services/stock-notification.service.js';
import type { CreateProductDto } from '../dtos/create-product.dto.js';
import type { UpdateProductDto } from '../dtos/update-product.dto.js';
import type { ProductQueryDto } from '../dtos/product-query.dto.js';
import type { PaginatedResult } from '../../../core/interfaces/pagination.interface.js';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stockNotificationService: StockNotificationService,
  ) {}

  async create(dto: CreateProductDto, tenantId: string, userId?: string) {
    this.validateImagesJson(dto.imagesJson);
    const slug = this.generateSlug(dto.name);

    const product = await this.prisma.product.create({
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
        isFlashDeal: dto.isFlashDeal ?? false,
        category: dto.category,
        subcategory: dto.subcategory,
        imagesJson: dto.imagesJson,
        specsJson: dto.specsJson,
        optionsJson: dto.optionsJson,
        preorderSlotTarget: dto.preorderSlotTarget ?? 0,
      },
      include: { variants: true },
    });

    await this.prisma.productAuditLog.create({
      data: {
        tenantId,
        productId: product.id,
        action: 'created',
        changes: JSON.stringify([{ field: 'name', label: 'Name', from: null, to: dto.name }]),
        userId,
      },
    });

    return product;
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
      const categories = query.category.split(',').map(c => c.trim()).filter(Boolean);
      where.category = categories.length === 1 ? categories[0] : { in: categories };
    }

    if (query.subcategory) {
      where.subcategory = query.subcategory;
    }

    if (query.isPreorder !== undefined) {
      where.isPreorder = query.isPreorder === 'true';
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
      const categories = query.category.split(',').map(c => c.trim()).filter(Boolean);
      where.category = categories.length === 1 ? categories[0] : { in: categories };
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

  async update(id: string, dto: UpdateProductDto, tenantId: string, userId?: string) {
    if (dto.imagesJson !== undefined) {
      this.validateImagesJson(dto.imagesJson);
    }
    const existing = await this.findById(id, tenantId);

    const data: Prisma.ProductUpdateInput = { ...dto };

    if (dto.name) {
      data.slug = this.generateSlug(dto.name);
    }

    // Capture field-level changes for audit trail
    const changes = this.diffChanges(existing as Record<string, unknown>, dto as unknown as Record<string, unknown>);

    const wasOutOfStock = existing.stockCount === 0;

    const updated = await this.prisma.product.update({
      where: { id },
      data,
      include: { variants: true },
    });

    // Auto-notify subscribers when restocked
    if (wasOutOfStock && updated.stockCount > 0) {
      this.stockNotificationService
        .notifySubscribers(id, tenantId)
        .catch(() => {}); // fire-and-forget
    }

    if (changes.length > 0) {
      // Determine action type from the changes
      let action = 'updated';
      if (changes.length === 1 && changes[0].field === 'isPublished') {
        action = changes[0].to === true ? 'published' : 'unpublished';
      }

      await this.prisma.productAuditLog.create({
        data: {
          tenantId,
          productId: id,
          action,
          changes: JSON.stringify(changes),
          userId,
        },
      });
    }

    return updated;
  }

  async getAuditLogs(productId: string, tenantId: string) {
    return this.prisma.productAuditLog.findMany({
      where: { productId, tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async remove(id: string, tenantId: string, userId?: string) {
    const product = await this.findById(id, tenantId);

    await this.prisma.productAuditLog.create({
      data: {
        tenantId,
        productId: id,
        action: 'deleted',
        changes: JSON.stringify([{ field: 'name', label: 'Name', from: product.name, to: null }]),
        userId,
      },
    });

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

  async findNewArrivals(tenantId: string, limit = 8) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return this.prisma.product.findMany({
      where: {
        tenantId,
        isPublished: true,
        deletedAt: null,
        createdAt: { gte: sevenDaysAgo },
      },
      include: { variants: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findFlashDeal(tenantId: string) {
    return this.prisma.product.findFirst({
      where: {
        tenantId,
        isPublished: true,
        isFlashDeal: true,
        deletedAt: null,
      },
      include: { variants: true },
    });
  }

  async toggleFlashDeal(id: string, tenantId: string, userId?: string) {
    const product = await this.findById(id, tenantId);
    const newValue = !product.isFlashDeal;

    if (newValue) {
      await this.prisma.product.updateMany({
        where: { tenantId, isFlashDeal: true, id: { not: id } },
        data: { isFlashDeal: false },
      });
    }

    return this.update(id, { isFlashDeal: newValue }, tenantId, userId);
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

  private readonly FIELD_LABELS: Record<string, string> = {
    name: 'Name',
    description: 'Description',
    pricePesewas: 'Price',
    comparePricePesewas: 'Compare Price',
    stockCount: 'Stock',
    isPreorder: 'Pre-order',
    isPublished: 'Published',
    isFeatured: 'Featured',
    isFlashDeal: 'Flash Deal',
    category: 'Category',
    subcategory: 'Subcategory',
    estArrivalDate: 'ETA',
    preorderDepositType: 'Deposit Type',
    preorderDepositValue: 'Deposit Value',
    preorderMinUnits: 'Min Units',
    preorderSlotTarget: 'Slot Target',
    imagesJson: 'Images',
    specsJson: 'Specs',
    optionsJson: 'Options',
  };

  private diffChanges(
    existing: Record<string, unknown>,
    dto: Record<string, unknown>,
  ): Array<{ field: string; label: string; from: unknown; to: unknown }> {
    const changes: Array<{ field: string; label: string; from: unknown; to: unknown }> = [];

    for (const [key, newValue] of Object.entries(dto)) {
      if (newValue === undefined) continue;

      const oldValue = existing[key];

      // Normalize for comparison
      const oldNorm = oldValue instanceof Date ? oldValue.toISOString() : oldValue;
      const newNorm = key === 'estArrivalDate' && typeof newValue === 'string'
        ? new Date(newValue).toISOString()
        : newValue;

      // Skip if values are the same (handle null vs undefined)
      if (oldNorm === newNorm) continue;
      if (oldNorm == null && newNorm == null) continue;

      // For numeric fields stored as Prisma Decimals, compare as numbers
      const oldNum = typeof oldNorm === 'object' && oldNorm !== null ? Number(oldNorm) : oldNorm;
      if (oldNum === newNorm) continue;

      changes.push({
        field: key,
        label: this.FIELD_LABELS[key] ?? key,
        from: oldNum ?? null,
        to: newValue,
      });
    }

    return changes;
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
