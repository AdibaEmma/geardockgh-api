import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { OrdersService } from '../../application/orders/services/orders.service.js';
import { CreateOrderDto } from '../../application/orders/dtos/create-order.dto.js';
import { OrderQueryDto } from '../../application/orders/dtos/order-query.dto.js';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard.js';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator.js';
import { ParseUUIDPipe } from '../pipes/parse-uuid.pipe.js';
import type { AuthenticatedUser } from '../../infrastructure/auth/jwt.strategy.js';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  async create(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.create(dto, user.userId, user.tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'List orders for the authenticated customer' })
  async findAll(
    @Query() query: OrderQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.findAll(query, user.userId, user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an order by ID' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.findById(id, user.userId, user.tenantId);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel an order (only pending payment orders)' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.cancel(id, user.userId, user.tenantId);
  }
}
