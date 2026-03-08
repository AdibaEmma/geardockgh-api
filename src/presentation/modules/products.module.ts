import { Module } from '@nestjs/common';
import { ProductsController } from '../controllers/products.controller.js';
import { ProductsService } from '../../application/products/services/products.service.js';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
