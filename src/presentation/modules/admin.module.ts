import { Module } from '@nestjs/common';
import { AdminOrdersController } from '../controllers/admin-orders.controller.js';
import { AdminStatsController } from '../controllers/admin-stats.controller.js';
import { AdminCustomersController } from '../controllers/admin-customers.controller.js';
import { AdminTenantsController } from '../controllers/admin-tenants.controller.js';
import { AdminProductsController } from '../controllers/admin-products.controller.js';
import { OrdersModule } from './orders.module.js';
import { ProductsModule } from './products.module.js';

@Module({
  imports: [OrdersModule, ProductsModule],
  controllers: [
    AdminOrdersController,
    AdminStatsController,
    AdminCustomersController,
    AdminTenantsController,
    AdminProductsController,
  ],
})
export class AdminModule {}
