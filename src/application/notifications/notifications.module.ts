import { Module } from '@nestjs/common';
import { NotificationService } from './services/notification.service.js';
import { ArkeselService } from './services/arkesel.service.js';
import { ResendEmailService } from './services/resend-email.service.js';
import { QueueModule } from '../../infrastructure/queue/queue.module.js';

@Module({
  imports: [QueueModule.register()],
  providers: [NotificationService, ArkeselService, ResendEmailService],
  exports: [NotificationService, ArkeselService, ResendEmailService],
})
export class NotificationsModule {}
