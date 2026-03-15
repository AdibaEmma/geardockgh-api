import { Module } from '@nestjs/common';
import { AdminIntegrationsController } from '../controllers/admin-integrations.controller.js';
import { ImportBrainConnectionService } from '../../application/integrations/services/importbrain-connection.service.js';
import { ImportBrainSyncService } from '../../application/integrations/services/importbrain-sync.service.js';

@Module({
  controllers: [AdminIntegrationsController],
  providers: [ImportBrainConnectionService, ImportBrainSyncService],
  exports: [ImportBrainConnectionService, ImportBrainSyncService],
})
export class IntegrationsModule {}
