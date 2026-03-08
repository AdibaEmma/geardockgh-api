import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard.js';
import { RolesGuard } from '../../infrastructure/auth/roles.guard.js';
import { Roles } from '../../infrastructure/auth/roles.decorator.js';

class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;
}

class UpdateTenantDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

@ApiTags('Admin - Tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/tenants')
export class AdminTenantsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List all tenants' })
  async findAll() {
    return this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tenant by ID' })
  async findById(@Param('id') id: string) {
    return this.prisma.tenant.findUniqueOrThrow({
      where: { id },
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create a new tenant' })
  async create(@Body() dto: CreateTenantDto) {
    return this.prisma.tenant.create({
      data: { id: dto.id, name: dto.name },
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a tenant' })
  async update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.prisma.tenant.update({
      where: { id },
      data: dto,
    });
  }
}
