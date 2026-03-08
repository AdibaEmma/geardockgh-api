import { Module } from '@nestjs/common';
import { AdminIntegrationsController } from '../controllers/admin-integrations.controller.js';
import { ImportBrainConnectionService } from '../../application/integrations/services/importbrain-connection.service.js';

@Module({
  controllers: [AdminIntegrationsController],
  providers: [ImportBrainConnectionService],
  exports: [ImportBrainConnectionService],
})
export class IntegrationsModule {}
