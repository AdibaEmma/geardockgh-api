import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard.js';
import { RolesGuard } from '../../infrastructure/auth/roles.guard.js';
import { Roles } from '../../infrastructure/auth/roles.decorator.js';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator.js';
import { DiscountService } from '../../application/discounts/services/discount.service.js';
import { CreateDiscountDto } from '../../application/discounts/dtos/create-discount.dto.js';
import type { AuthenticatedUser } from '../../infrastructure/auth/jwt.strategy.js';

@ApiTags('Admin - Discounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/discounts')
export class AdminDiscountsController {
  constructor(private readonly discountService: DiscountService) {}

  @Post()
  @ApiOperation({ summary: 'Create a discount code' })
  async create(
    @Body() dto: CreateDiscountDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.discountService.create(user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List discount codes' })
  async findAll(
    @Query() query: { page?: string; limit?: string; search?: string; isActive?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.discountService.findAll(user.tenantId, {
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
      search: query.search,
      isActive: query.isActive,
    });
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Toggle discount code active status' })
  async toggleActive(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.discountService.toggleActive(id, user.tenantId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a discount code' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.discountService.delete(id, user.tenantId);
  }
}
