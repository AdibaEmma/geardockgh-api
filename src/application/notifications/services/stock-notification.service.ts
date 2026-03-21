import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';
import { NotificationService } from './notification.service.js';

@Injectable()
export class StockNotificationService {
  private readonly logger = new Logger(StockNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async subscribe(productId: string, customerId: string, tenantId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId, deletedAt: null },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.stockCount > 0) {
      throw new BadRequestException('Product is currently in stock');
    }

    const existing = await this.prisma.stockNotification.findUnique({
      where: { productId_customerId: { productId, customerId } },
    });

    if (existing) {
      return { subscribed: true, alreadySubscribed: true };
    }

    await this.prisma.stockNotification.create({
      data: { tenantId, productId, customerId },
    });

    return { subscribed: true, alreadySubscribed: false };
  }

  async unsubscribe(productId: string, customerId: string, tenantId: string) {
    await this.prisma.stockNotification.deleteMany({
      where: { productId, customerId, tenantId },
    });

    return { subscribed: false };
  }

  async isSubscribed(productId: string, customerId: string, tenantId: string) {
    const record = await this.prisma.stockNotification.findFirst({
      where: { productId, customerId, tenantId, notifiedAt: null },
    });

    return { subscribed: !!record };
  }

  async notifySubscribers(productId: string, tenantId: string) {
    const subscribers = await this.prisma.stockNotification.findMany({
      where: { productId, tenantId, notifiedAt: null },
      include: {
        customer: { select: { email: true, phone: true, firstName: true } },
        product: { select: { name: true, slug: true } },
      },
    });

    if (subscribers.length === 0) return;

    this.logger.log(
      `Notifying ${subscribers.length} subscriber(s) for product ${productId}`,
    );

    for (const sub of subscribers) {
      await this.notificationService.sendStockAvailableNotification({
        tenantId,
        customerId: sub.customerId,
        email: sub.customer.email,
        phone: sub.customer.phone ?? undefined,
        customerName: sub.customer.firstName,
        productName: sub.product.name,
        productSlug: sub.product.slug,
      });
    }

    // Mark all as notified and clean up
    await this.prisma.stockNotification.deleteMany({
      where: { productId, tenantId, notifiedAt: null },
    });

    this.logger.log(
      `Sent stock notifications and cleaned up ${subscribers.length} record(s)`,
    );
  }
}
