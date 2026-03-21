import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StockNotificationService } from '../../application/notifications/services/stock-notification.service.js';
import { CreateStockNotificationDto } from '../../application/notifications/dtos/stock-notification.dto.js';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard.js';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator.js';
import { ParseUUIDPipe } from '../pipes/parse-uuid.pipe.js';
import type { AuthenticatedUser } from '../../infrastructure/auth/jwt.strategy.js';

@ApiTags('Stock Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stock-notifications')
export class StockNotificationsController {
  constructor(
    private readonly stockNotificationService: StockNotificationService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Subscribe to stock notification for a product' })
  async subscribe(
    @Body() dto: CreateStockNotificationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.stockNotificationService.subscribe(
      dto.productId,
      user.userId,
      user.tenantId,
    );
  }

  @Delete(':productId')
  @ApiOperation({ summary: 'Unsubscribe from stock notification' })
  async unsubscribe(
    @Param('productId', ParseUUIDPipe) productId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.stockNotificationService.unsubscribe(
      productId,
      user.userId,
      user.tenantId,
    );
  }

  @Get(':productId')
  @ApiOperation({ summary: 'Check if subscribed to stock notification' })
  async check(
    @Param('productId', ParseUUIDPipe) productId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.stockNotificationService.isSubscribed(
      productId,
      user.userId,
      user.tenantId,
    );
  }
}
