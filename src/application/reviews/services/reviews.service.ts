import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ReviewStatus } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';
import type { CreateReviewDto } from '../dtos/create-review.dto.js';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateReviewDto, customerId: string, tenantId: string) {
    const existing = await this.prisma.review.findFirst({
      where: { productId: dto.productId, customerId, tenantId },
    });

    if (existing) {
      throw new BadRequestException(
        'You have already reviewed this product',
      );
    }

    const deliveredOrder = await this.prisma.order.findFirst({
      where: {
        customerId,
        tenantId,
        status: 'DELIVERED',
        deletedAt: null,
        items: { some: { productId: dto.productId } },
      },
    });

    return this.prisma.review.create({
      data: {
        tenantId,
        productId: dto.productId,
        customerId,
        orderId: deliveredOrder?.id ?? null,
        rating: dto.rating,
        title: dto.title,
        text: dto.text,
        imagesJson: dto.imagesJson,
        isVerified: !!deliveredOrder,
      },
    });
  }

  async findByProduct(
    productId: string,
    tenantId: string,
    page = 1,
    limit = 10,
  ) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { productId, tenantId, status: ReviewStatus.APPROVED },
        include: {
          customer: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.review.count({
        where: { productId, tenantId, status: ReviewStatus.APPROVED },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getProductRatingSummary(productId: string, tenantId: string) {
    const where = {
      productId,
      tenantId,
      status: ReviewStatus.APPROVED,
    };

    const [aggregate, groups] = await Promise.all([
      this.prisma.review.aggregate({
        where,
        _avg: { rating: true },
        _count: true,
      }),
      this.prisma.review.groupBy({
        by: ['rating'],
        where,
        _count: true,
      }),
    ]);

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const group of groups) {
      distribution[group.rating] = group._count;
    }

    return {
      averageRating: aggregate._avg.rating
        ? Math.round(aggregate._avg.rating * 10) / 10
        : 0,
      totalReviews: aggregate._count,
      distribution,
    };
  }

  async findFeaturedTestimonials(tenantId: string, limit = 4) {
    return this.prisma.review.findMany({
      where: {
        tenantId,
        status: ReviewStatus.APPROVED,
        isVerified: true,
        rating: { gte: 4 },
        text: { not: null },
      },
      include: {
        customer: { select: { firstName: true, lastName: true } },
      },
      orderBy: [{ rating: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });
  }

  async canReview(
    productId: string,
    customerId: string,
    tenantId: string,
  ) {
    const [existingReview, deliveredOrder] = await Promise.all([
      this.prisma.review.findFirst({
        where: { productId, customerId, tenantId },
      }),
      this.prisma.order.findFirst({
        where: {
          customerId,
          tenantId,
          status: 'DELIVERED',
          deletedAt: null,
          items: { some: { productId } },
        },
      }),
    ]);

    const hasExisting = !!existingReview;
    const hasDeliveredOrder = !!deliveredOrder;

    return {
      canReview: !hasExisting && hasDeliveredOrder,
      hasExisting,
      hasDeliveredOrder,
    };
  }

  async findAll(
    tenantId: string,
    query: { page?: number; limit?: number; status?: string; rating?: number },
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId };
    if (query.status) {
      where.status = query.status;
    }
    if (query.rating) {
      where.rating = query.rating;
    }

    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: {
          customer: { select: { firstName: true, lastName: true } },
          product: { select: { name: true, slug: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateStatus(id: string, status: ReviewStatus, tenantId: string) {
    const review = await this.prisma.review.findFirst({
      where: { id, tenantId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return this.prisma.review.update({
      where: { id },
      data: { status },
    });
  }

  async remove(id: string, tenantId: string) {
    const review = await this.prisma.review.findFirst({
      where: { id, tenantId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return this.prisma.review.delete({ where: { id } });
  }
}
