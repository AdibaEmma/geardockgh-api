import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { appConfig } from './infrastructure/config/app.config.js';
import { DatabaseModule } from './infrastructure/database/database.module.js';
import { TenantMiddleware } from './infrastructure/tenant/tenant.middleware.js';
import { HealthModule } from './presentation/modules/health.module.js';
import { AuthModule } from './presentation/modules/auth.module.js';
import { ProductsModule } from './presentation/modules/products.module.js';
import { OrdersModule } from './presentation/modules/orders.module.js';
import { EventsModule } from './presentation/modules/events.module.js';
import { AddressesModule } from './presentation/modules/addresses.module.js';
import { PaymentsModule } from './presentation/modules/payments.module.js';
import { AdminModule } from './presentation/modules/admin.module.js';
import { IntegrationsModule } from './presentation/modules/integrations.module.js';
import { ExportModule } from './presentation/modules/export.module.js';
import { QueueModule } from './infrastructure/queue/queue.module.js';
import { NotificationsModule } from './application/notifications/notifications.module.js';
import { PreordersModule } from './presentation/modules/preorders.module.js';
import { UploadsModule } from './presentation/modules/uploads.module.js';
import { NewsletterModule } from './presentation/modules/newsletter.module.js';
import { BundlesModule } from './presentation/modules/bundles.module.js';
import { EmailSequencesModule } from './presentation/modules/email-sequences.module.js';
import { LeadsModule } from './presentation/modules/leads.module.js';
import { DiscountsModule } from './presentation/modules/discounts.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },
      { name: 'long', ttl: 60000, limit: 60 },
    ]),
    DatabaseModule,
    HealthModule,
    AuthModule,
    ProductsModule,
    OrdersModule,
    EventsModule,
    AddressesModule,
    PaymentsModule,
    AdminModule,
    IntegrationsModule,
    ExportModule,
    QueueModule.register(),
    NotificationsModule,
    PreordersModule,
    UploadsModule,
    NewsletterModule,
    BundlesModule,
    EmailSequencesModule,
    LeadsModule,
    DiscountsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
