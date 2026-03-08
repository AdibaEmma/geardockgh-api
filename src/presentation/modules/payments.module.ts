import { Module } from '@nestjs/common';
import { PaymentsController } from '../controllers/payments.controller.js';
import { PaymentsService } from '../../application/payments/services/payments.service.js';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
