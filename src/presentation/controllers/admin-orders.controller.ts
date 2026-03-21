import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { OrdersService } from '../../application/orders/services/orders.service.js';
import { OrderQueryDto } from '../../application/orders/dtos/order-query.dto.js';
import { UpdateOrderDto } from '../../application/orders/dtos/update-order.dto.js';
import { BulkUpdateOrdersDto } from '../../application/orders/dtos/bulk-update-orders.dto.js';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard.js';
import { RolesGuard } from '../../infrastructure/auth/roles.guard.js';
import { Roles } from '../../infrastructure/auth/roles.decorator.js';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator.js';
import { ParseUUIDPipe } from '../pipes/parse-uuid.pipe.js';
import type { AuthenticatedUser } from '../../infrastructure/auth/jwt.strategy.js';

@ApiTags('Admin - Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List all orders (admin)' })
  async findAll(
    @Query() query: OrderQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.findAllAdmin(query, user.tenantId);
  }

  @Patch('bulk-status')
  @ApiOperation({ summary: 'Bulk update order statuses (admin)' })
  async bulkUpdateStatus(
    @Body() dto: BulkUpdateOrdersDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.bulkUpdateStatus(dto, user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get any order by ID (admin)' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.findByIdAdmin(id, user.tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update order status (admin)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.update(id, dto, user.tenantId);
  }
}
