import { Module, forwardRef } from '@nestjs/common';
import { NewsletterController } from '../controllers/newsletter.controller.js';
import { NewsletterService } from '../../application/newsletter/services/newsletter.service.js';
import { NotificationsModule } from '../../application/notifications/notifications.module.js';
import { EmailSequencesModule } from './email-sequences.module.js';

@Module({
  imports: [NotificationsModule, forwardRef(() => EmailSequencesModule)],
  controllers: [NewsletterController],
  providers: [NewsletterService],
  exports: [NewsletterService],
})
export class NewsletterModule {}
