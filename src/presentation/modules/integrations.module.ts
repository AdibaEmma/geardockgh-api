import { Module } from '@nestjs/common';
import { AdminIntegrationsController } from '../controllers/admin-integrations.controller.js';
import { ImportBrainConnectionService } from '../../application/integrations/services/importbrain-connection.service.js';
import { ImportBrainSyncService } from '../../application/integrations/services/importbrain-sync.service.js';
import { ImportBrainSyncPullService } from '../../application/integrations/services/importbrain-sync-pull.service.js';
import { EventsModule } from './events.module.js';

@Module({
  imports: [EventsModule],
  controllers: [AdminIntegrationsController],
  providers: [ImportBrainConnectionService, ImportBrainSyncService, ImportBrainSyncPullService],
  exports: [ImportBrainConnectionService, ImportBrainSyncService, ImportBrainSyncPullService],
})
export class IntegrationsModule {}
