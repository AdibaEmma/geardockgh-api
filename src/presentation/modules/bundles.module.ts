import { Module } from '@nestjs/common';
import { BundlesController } from '../controllers/bundles.controller.js';
import { BundlesService } from '../../application/bundles/services/bundles.service.js';

@Module({
  controllers: [BundlesController],
  providers: [BundlesService],
  exports: [BundlesService],
})
export class BundlesModule {}
