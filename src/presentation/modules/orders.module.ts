import { Module } from '@nestjs/common';
import { OrdersController } from '../controllers/orders.controller.js';
import { OrdersService } from '../../application/orders/services/orders.service.js';
import { IntegrationsModule } from './integrations.module.js';
import { LeadsModule } from './leads.module.js';

@Module({
  imports: [IntegrationsModule, LeadsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
