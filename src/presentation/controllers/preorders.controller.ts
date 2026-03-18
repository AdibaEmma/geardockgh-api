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
import { PreordersService } from '../../application/preorders/services/preorders.service.js';
import { CreatePreorderDto } from '../../application/preorders/dtos/create-preorder.dto.js';
import { PreorderQueryDto } from '../../application/preorders/dtos/preorder-query.dto.js';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard.js';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../../infrastructure/auth/jwt.strategy.js';

@ApiTags('Preorders')
@Controller('preorders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PreordersController {
  constructor(private readonly preordersService: PreordersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a pre-order' })
  async create(
    @Body() dto: CreatePreorderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.preordersService.create(dto, user.userId, user.tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'List customer pre-orders' })
  async findAll(
    @Query() query: PreorderQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.preordersService.findByCustomer(user.userId, user.tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get pre-order by ID' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.preordersService.findById(id, user.userId, user.tenantId);
  }
}
