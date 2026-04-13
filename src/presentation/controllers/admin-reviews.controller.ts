import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReviewStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard.js';
import { RolesGuard } from '../../infrastructure/auth/roles.guard.js';
import { Roles } from '../../infrastructure/auth/roles.decorator.js';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator.js';
import { ReviewsService } from '../../application/reviews/services/reviews.service.js';
import { ParseUUIDPipe } from '../pipes/parse-uuid.pipe.js';
import type { AuthenticatedUser } from '../../infrastructure/auth/jwt.strategy.js';

@ApiTags('Admin - Reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/reviews')
export class AdminReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @ApiOperation({ summary: 'List all reviews (admin)' })
  async findAll(
    @Query()
    query: {
      page?: string;
      limit?: string;
      status?: string;
    },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reviewsService.findAll(user.tenantId, {
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
      status: query.status,
    });
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update review status (approve/reject)' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { status: ReviewStatus },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reviewsService.updateStatus(id, body.status, user.tenantId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a review' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reviewsService.remove(id, user.tenantId);
  }
}
