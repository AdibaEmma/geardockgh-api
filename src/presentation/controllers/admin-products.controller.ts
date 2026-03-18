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
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ProductsService } from '../../application/products/services/products.service.js';
import { CreateProductDto } from '../../application/products/dtos/create-product.dto.js';
import { UpdateProductDto } from '../../application/products/dtos/update-product.dto.js';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard.js';
import { RolesGuard } from '../../infrastructure/auth/roles.guard.js';
import { Roles } from '../../infrastructure/auth/roles.decorator.js';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator.js';
import { ParseUUIDPipe } from '../pipes/parse-uuid.pipe.js';
import type { AuthenticatedUser } from '../../infrastructure/auth/jwt.strategy.js';

@ApiTags('Admin - Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/products')
export class AdminProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List all products including drafts (admin)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'status', required: false, description: 'published | draft' })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.productsService.findAllAdmin(
      { page: Number(page), limit: Number(limit), search, category, status },
      user!.tenantId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID (admin)' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.findById(id, user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new product (admin)' })
  async create(
    @Body() dto: CreateProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.create(dto, user.tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product (admin)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.update(id, dto, user.tenantId);
  }

  @Patch(':id/toggle-publish')
  @ApiOperation({ summary: 'Toggle product published status (admin)' })
  async togglePublish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const product = await this.productsService.findById(id, user.tenantId);
    return this.productsService.update(id, { isPublished: !product.isPublished }, user.tenantId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a product (admin)' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.remove(id, user.tenantId);
  }
}
