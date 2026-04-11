import { Module } from '@nestjs/common';
import { DiscountsController } from '../controllers/discounts.controller.js';
import { DiscountService } from '../../application/discounts/services/discount.service.js';

@Module({
  controllers: [DiscountsController],
  providers: [DiscountService],
  exports: [DiscountService],
})
export class DiscountsModule {}
