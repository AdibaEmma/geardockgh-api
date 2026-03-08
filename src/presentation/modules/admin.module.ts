import { Module } from '@nestjs/common';
import { AdminOrdersController } from '../controllers/admin-orders.controller.js';
import { AdminStatsController } from '../controllers/admin-stats.controller.js';
import { AdminCustomersController } from '../controllers/admin-customers.controller.js';
import { AdminTenantsController } from '../controllers/admin-tenants.controller.js';
import { OrdersService } from '../../application/orders/services/orders.service.js';

@Module({
  controllers: [
    AdminOrdersController,
    AdminStatsController,
    AdminCustomersController,
    AdminTenantsController,
  ],
  providers: [OrdersService],
})
export class AdminModule {}
