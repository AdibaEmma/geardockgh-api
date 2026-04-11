import { Module } from '@nestjs/common';
import { AdminOrdersController } from '../controllers/admin-orders.controller.js';
import { AdminStatsController } from '../controllers/admin-stats.controller.js';
import { AdminCustomersController } from '../controllers/admin-customers.controller.js';
import { AdminTenantsController } from '../controllers/admin-tenants.controller.js';
import { AdminProductsController } from '../controllers/admin-products.controller.js';
import { AdminLeadsController } from '../controllers/admin-leads.controller.js';
import { AdminDiscountsController } from '../controllers/admin-discounts.controller.js';
import { OrdersModule } from './orders.module.js';
import { ProductsModule } from './products.module.js';
import { LeadsModule } from './leads.module.js';
import { DiscountsModule } from './discounts.module.js';

@Module({
  imports: [OrdersModule, ProductsModule, LeadsModule, DiscountsModule],
  controllers: [
    AdminOrdersController,
    AdminStatsController,
    AdminCustomersController,
    AdminTenantsController,
    AdminProductsController,
    AdminLeadsController,
    AdminDiscountsController,
  ],
})
export class AdminModule {}
