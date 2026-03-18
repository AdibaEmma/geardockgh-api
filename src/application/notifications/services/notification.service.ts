import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { NotificationJobData } from '../../../infrastructure/queue/processors/notification.processor.js';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly queue: Queue | null;

  constructor(
    @Optional() @InjectQueue('notifications') notificationsQueue?: Queue,
  ) {
    this.queue = notificationsQueue ?? null;
    if (!this.queue) {
      this.logger.warn(
        'Notifications queue not available — notifications will be logged only',
      );
    }
  }

  async enqueueNotification(data: NotificationJobData): Promise<void> {
    if (!this.queue) {
      this.logger.log(
        `[DRY RUN] ${data.type} → ${data.recipient} via ${data.channel} (${data.templateName})`,
      );
      return;
    }

    await this.queue.add(data.type, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
    this.logger.log(
      `Enqueued ${data.type} notification for ${data.recipient} via ${data.channel}`,
    );
  }

  async sendPreorderConfirmation(params: {
    tenantId: string;
    customerId: string;
    email: string;
    phone?: string;
    productName: string;
    depositAmount: number;
    totalAmount: number;
    preorderId: string;
  }): Promise<void> {
    await this.enqueueNotification({
      type: 'send-preorder-confirmation',
      tenantId: params.tenantId,
      customerId: params.customerId,
      channel: 'email',
      recipient: params.email,
      templateName: 'preorder-confirmation',
      payload: {
        productName: params.productName,
        depositAmount: params.depositAmount,
        totalAmount: params.totalAmount,
        preorderId: params.preorderId,
      },
    });

    if (params.phone) {
      await this.enqueueNotification({
        type: 'send-preorder-confirmation',
        tenantId: params.tenantId,
        customerId: params.customerId,
        channel: 'whatsapp',
        recipient: params.phone,
        templateName: 'preorder-confirmation',
        payload: {
          productName: params.productName,
          depositAmount: params.depositAmount,
          totalAmount: params.totalAmount,
          preorderId: params.preorderId,
        },
      });
    }
  }

  async sendBalanceRequest(params: {
    tenantId: string;
    customerId: string;
    email: string;
    phone?: string;
    productName: string;
    balanceAmount: number;
    preorderId: string;
  }): Promise<void> {
    await this.enqueueNotification({
      type: 'send-balance-request',
      tenantId: params.tenantId,
      customerId: params.customerId,
      channel: 'email',
      recipient: params.email,
      templateName: 'balance-request',
      payload: {
        productName: params.productName,
        balanceAmount: params.balanceAmount,
        preorderId: params.preorderId,
      },
    });

    if (params.phone) {
      await this.enqueueNotification({
        type: 'send-balance-request',
        tenantId: params.tenantId,
        customerId: params.customerId,
        channel: 'whatsapp',
        recipient: params.phone,
        templateName: 'balance-request',
        payload: {
          productName: params.productName,
          balanceAmount: params.balanceAmount,
          preorderId: params.preorderId,
        },
      });
    }
  }
}
