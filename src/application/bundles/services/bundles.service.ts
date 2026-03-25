import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';
import type { CreateBundleDto, UpdateBundleDto } from '../dtos/bundle.dto.js';

@Injectable()
export class BundlesService {
  private readonly logger = new Logger(BundlesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, onlyPublished = true) {
    return this.prisma.bundle.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(onlyPublished ? { isPublished: true } : {}),
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                pricePesewas: true,
                imagesJson: true,
                category: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findFeatured(tenantId: string) {
    return this.prisma.bundle.findMany({
      where: {
        tenantId,
        deletedAt: null,
        isPublished: true,
        isFeatured: true,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                pricePesewas: true,
                imagesJson: true,
                category: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findBySlug(slug: string, tenantId: string) {
    const bundle = await this.prisma.bundle.findUnique({
      where: { slug_tenantId: { slug, tenantId } },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                pricePesewas: true,
                comparePricePesewas: true,
                imagesJson: true,
                category: true,
                stockCount: true,
                isPreorder: true,
              },
            },
          },
        },
      },
    });

    if (!bundle || bundle.deletedAt) {
      throw new NotFoundException(`Bundle "${slug}" not found`);
    }

    return bundle;
  }

  async create(dto: CreateBundleDto, tenantId: string) {
    const { items, ...bundleData } = dto;

    const bundle = await this.prisma.bundle.create({
      data: {
        ...bundleData,
        tenantId,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity ?? 1,
            isBonus: item.isBonus ?? false,
          })),
        },
      },
      include: { items: { include: { product: true } } },
    });

    this.logger.log(`Bundle created: ${bundle.name} (${bundle.id})`);
    return bundle;
  }

  async update(id: string, dto: UpdateBundleDto, tenantId: string) {
    const existing = await this.prisma.bundle.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException(`Bundle not found`);
    }

    const { items, ...bundleData } = dto;

    const bundle = await this.prisma.bundle.update({
      where: { id },
      data: {
        ...bundleData,
        ...(items
          ? {
              items: {
                deleteMany: {},
                create: items.map((item) => ({
                  productId: item.productId,
                  quantity: item.quantity ?? 1,
                  isBonus: item.isBonus ?? false,
                })),
              },
            }
          : {}),
      },
      include: { items: { include: { product: true } } },
    });

    this.logger.log(`Bundle updated: ${bundle.name} (${bundle.id})`);
    return bundle;
  }

  async remove(id: string, tenantId: string) {
    const existing = await this.prisma.bundle.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException(`Bundle not found`);
    }

    await this.prisma.bundle.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    this.logger.log(`Bundle soft-deleted: ${id}`);
    return { deleted: true };
  }
}
