import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BundlesService } from '../../application/bundles/services/bundles.service.js';
import { CreateBundleDto, UpdateBundleDto } from '../../application/bundles/dtos/bundle.dto.js';
import { TenantId } from '../../infrastructure/tenant/tenant-id.decorator.js';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard.js';
import { ParseUUIDPipe } from '../pipes/parse-uuid.pipe.js';

@ApiTags('Bundles')
@Controller('bundles')
export class BundlesController {
  constructor(private readonly bundlesService: BundlesService) {}

  @Get()
  @ApiOperation({ summary: 'List all published bundles' })
  async findAll(@TenantId() tenantId: string) {
    const bundles = await this.bundlesService.findAll(tenantId);
    return { data: bundles };
  }

  @Get('featured')
  @ApiOperation({ summary: 'List featured bundles' })
  async findFeatured(@TenantId() tenantId: string) {
    const bundles = await this.bundlesService.findFeatured(tenantId);
    return { data: bundles };
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get bundle by slug' })
  async findBySlug(
    @Param('slug') slug: string,
    @TenantId() tenantId: string,
  ) {
    const bundle = await this.bundlesService.findBySlug(slug, tenantId);
    return { data: bundle };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new bundle (admin)' })
  async create(
    @Body() dto: CreateBundleDto,
    @TenantId() tenantId: string,
  ) {
    const bundle = await this.bundlesService.create(dto, tenantId);
    return { data: bundle };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a bundle (admin)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBundleDto,
    @TenantId() tenantId: string,
  ) {
    const bundle = await this.bundlesService.update(id, dto, tenantId);
    return { data: bundle };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a bundle (admin)' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ) {
    const result = await this.bundlesService.remove(id, tenantId);
    return { data: result };
  }
}
