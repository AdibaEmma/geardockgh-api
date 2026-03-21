import { Module } from '@nestjs/common';
import { ProductsController } from '../controllers/products.controller.js';
import { ProductsService } from '../../application/products/services/products.service.js';
import { NotificationsModule } from '../../application/notifications/notifications.module.js';

@Module({
  imports: [NotificationsModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
