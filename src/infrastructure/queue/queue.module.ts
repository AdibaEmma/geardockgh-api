import { DynamicModule, Logger, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import type { AppConfiguration } from '../config/app.config.js';
import { NotificationProcessor } from './processors/notification.processor.js';
import { PreorderEventProcessor } from './processors/preorder-event.processor.js';
import { EmailSequenceProcessor } from './processors/email-sequence.processor.js';
import { ResendEmailService } from '../../application/notifications/services/resend-email.service.js';

const logger = new Logger('QueueModule');

@Module({})
export class QueueModule {
  static register(): DynamicModule {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      logger.warn(
        'REDIS_URL not set — BullMQ queues disabled. Notifications will be logged only.',
      );
      return {
        module: QueueModule,
        providers: [],
        exports: [],
      };
    }

    return {
      module: QueueModule,
      imports: [
        BullModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => {
            const appConf = configService.get<AppConfiguration>('app')!;
            return {
              connection: { url: appConf.redis.url },
            };
          },
        }),
        BullModule.registerQueue(
          { name: 'notifications' },
          { name: 'preorder-events' },
          { name: 'email-sequences' },
        ),
      ],
      providers: [NotificationProcessor, PreorderEventProcessor, EmailSequenceProcessor, ResendEmailService],
      exports: [BullModule],
    };
  }
}
