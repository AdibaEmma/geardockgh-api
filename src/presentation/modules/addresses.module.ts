import { Module } from '@nestjs/common';
import { AddressesController } from '../controllers/addresses.controller.js';
import { AddressesService } from '../../application/addresses/services/addresses.service.js';

@Module({
  controllers: [AddressesController],
  providers: [AddressesService],
  exports: [AddressesService],
})
export class AddressesModule {}
