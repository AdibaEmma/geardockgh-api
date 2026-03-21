import { Module } from '@nestjs/common';
import { NotificationService } from './services/notification.service.js';
import { StockNotificationService } from './services/stock-notification.service.js';
import { ArkeselService } from './services/arkesel.service.js';
import { ResendEmailService } from './services/resend-email.service.js';
import { StockNotificationsController } from '../../presentation/controllers/stock-notifications.controller.js';
import { QueueModule } from '../../infrastructure/queue/queue.module.js';

@Module({
  imports: [QueueModule.register()],
  controllers: [StockNotificationsController],
  providers: [
    NotificationService,
    StockNotificationService,
    ArkeselService,
    ResendEmailService,
  ],
  exports: [
    NotificationService,
    StockNotificationService,
    ArkeselService,
    ResendEmailService,
  ],
})
export class NotificationsModule {}
