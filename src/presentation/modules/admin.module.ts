import { Module } from '@nestjs/common';
import { AdminOrdersController } from '../controllers/admin-orders.controller.js';
import { AdminStatsController } from '../controllers/admin-stats.controller.js';
import { AdminCustomersController } from '../controllers/admin-customers.controller.js';
import { AdminTenantsController } from '../controllers/admin-tenants.controller.js';
import { AdminProductsController } from '../controllers/admin-products.controller.js';
import { ProductsService } from '../../application/products/services/products.service.js';
import { OrdersModule } from './orders.module.js';

@Module({
  imports: [OrdersModule],
  controllers: [
    AdminOrdersController,
    AdminStatsController,
    AdminCustomersController,
    AdminTenantsController,
    AdminProductsController,
  ],
  providers: [ProductsService],
})
export class AdminModule {}
