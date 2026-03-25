import { Module } from '@nestjs/common';
import { EmailSequencesController } from '../controllers/email-sequences.controller.js';
import { EmailSequenceService } from '../../application/email-sequences/services/email-sequence.service.js';
import { QueueModule } from '../../infrastructure/queue/queue.module.js';
import { NotificationsModule } from '../../application/notifications/notifications.module.js';

@Module({
  imports: [QueueModule.register(), NotificationsModule],
  controllers: [EmailSequencesController],
  providers: [EmailSequenceService],
  exports: [EmailSequenceService],
})
export class EmailSequencesModule {}
