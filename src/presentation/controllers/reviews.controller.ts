import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReviewsService } from '../../application/reviews/services/reviews.service.js';
import { CreateReviewDto } from '../../application/reviews/dtos/create-review.dto.js';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard.js';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator.js';
import { TenantId } from '../../infrastructure/tenant/tenant-id.decorator.js';
import { ParseUUIDPipe } from '../pipes/parse-uuid.pipe.js';
import type { AuthenticatedUser } from '../../infrastructure/auth/jwt.strategy.js';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @ApiOperation({ summary: 'List approved reviews for a product (public)' })
  async findByProduct(
    @Query('productId') productId: string,
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @TenantId() tenantId: string,
  ) {
    return this.reviewsService.findByProduct(
      productId,
      tenantId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
    );
  }

  @Get('product/:productId/summary')
  @ApiOperation({ summary: 'Get rating summary for a product (public)' })
  async getRatingSummary(
    @Param('productId', ParseUUIDPipe) productId: string,
    @TenantId() tenantId: string,
  ) {
    return this.reviewsService.getProductRatingSummary(productId, tenantId);
  }

  @Get('testimonials')
  @ApiOperation({ summary: 'Get featured testimonials (public)' })
  async getFeaturedTestimonials(
    @Query('limit') limit: string | undefined,
    @TenantId() tenantId: string,
  ) {
    return this.reviewsService.findFeaturedTestimonials(
      tenantId,
      limit ? Number(limit) : 4,
    );
  }

  @Get('can-review/:productId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if current user can review a product' })
  async canReview(
    @Param('productId', ParseUUIDPipe) productId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reviewsService.canReview(
      productId,
      user.userId,
      user.tenantId,
    );
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a product review' })
  async create(
    @Body() dto: CreateReviewDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reviewsService.create(dto, user.userId, user.tenantId);
  }
}
