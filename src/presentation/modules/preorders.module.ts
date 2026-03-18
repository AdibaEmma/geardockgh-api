import { Module } from '@nestjs/common';
import { PreordersController } from '../controllers/preorders.controller.js';
import { PreordersService } from '../../application/preorders/services/preorders.service.js';

@Module({
  controllers: [PreordersController],
  providers: [PreordersService],
  exports: [PreordersService],
})
export class PreordersModule {}
