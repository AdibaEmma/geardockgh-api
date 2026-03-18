import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

export interface NotificationJobData {
  type: 'send-preorder-confirmation' | 'send-balance-request' | 'send-delivery-confirmation';
  tenantId: string;
  customerId: string;
  channel: 'whatsapp' | 'sms' | 'email';
  recipient: string;
  templateName: string;
  payload: Record<string, unknown>;
}

@Processor('notifications')
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  async process(job: Job<NotificationJobData>): Promise<void> {
    this.logger.log(`Processing notification job ${job.id}: ${job.data.type}`);

    const { channel } = job.data;

    switch (channel) {
      case 'email':
        await this.sendEmail(job.data);
        break;
      case 'sms':
      case 'whatsapp':
        await this.sendSms(job.data);
        break;
      default:
        this.logger.warn(`Unknown notification channel: ${channel}`);
    }
  }

  private async sendEmail(data: NotificationJobData): Promise<void> {
    // Delegates to ResendEmailService — will be wired in NotificationsModule
    this.logger.log(`Email notification queued for ${data.recipient}: ${data.templateName}`);
  }

  private async sendSms(data: NotificationJobData): Promise<void> {
    // Delegates to ArkeselService — will be wired in NotificationsModule
    this.logger.log(`${data.channel} notification queued for ${data.recipient}: ${data.templateName}`);
  }
}
