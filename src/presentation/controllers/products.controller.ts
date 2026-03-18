import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ProductsService } from '../../application/products/services/products.service.js';
import { CreateProductDto } from '../../application/products/dtos/create-product.dto.js';
import { UpdateProductDto } from '../../application/products/dtos/update-product.dto.js';
import { ProductQueryDto } from '../../application/products/dtos/product-query.dto.js';
import { ProductResponseDto } from '../../application/products/dtos/product-response.dto.js';
import { ApiPaginatedResponse } from '../decorators/api-paginated.decorator.js';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard.js';
import { RolesGuard } from '../../infrastructure/auth/roles.guard.js';
import { Roles } from '../../infrastructure/auth/roles.decorator.js';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator.js';
import { TenantId } from '../../infrastructure/tenant/tenant-id.decorator.js';
import { ParseUUIDPipe } from '../pipes/parse-uuid.pipe.js';
import type { AuthenticatedUser } from '../../infrastructure/auth/jwt.strategy.js';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List published products (public, paginated)' })
  @ApiPaginatedResponse(ProductResponseDto)
  async findAll(
    @Query() query: ProductQueryDto,
    @TenantId() tenantId: string,
  ) {
    return this.productsService.findAll(query, tenantId);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured products (public)' })
  async findFeatured(@TenantId() tenantId: string) {
    return this.productsService.findFeatured(tenantId);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a product by slug (public)' })
  async findBySlug(
    @Param('slug') slug: string,
    @TenantId() tenantId: string,
  ) {
    return this.productsService.findBySlug(slug, tenantId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new product (admin only)' })
  async create(
    @Body() dto: CreateProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.create(dto, user.tenantId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a product (admin only)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.update(id, dto, user.tenantId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft-delete a product (admin only)' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.remove(id, user.tenantId);
  }
}
