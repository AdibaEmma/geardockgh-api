import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';

@Injectable()
export class ImportBrainSyncService {
  private readonly logger = new Logger(ImportBrainSyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  async pushOrder(tenantId: string, order: {
    id: string;
    orderNumber: string;
    status: string;
    subtotalPesewas: number;
    totalPesewas: number;
    shippingAddressId: string | null;
    notes: string | null;
    items: Array<{
      productId: string;
      quantity: number;
      unitPricePesewas: number;
      product: { importbrainProductId: string | null; name: string } | null;
    }>;
    customer?: { id: string; firstName: string; lastName: string; email: string; phone: string | null } | null;
  }): Promise<void> {
    const connection = await this.prisma.importBrainConnection.findUnique({
      where: { tenantId },
    });

    if (!connection || connection.status !== 'active') {
      return;
    }

    // Build items using importbrainProductId mappings
    const items = order.items
      .filter((item) => item.product?.importbrainProductId)
      .map((item) => ({
        importbrainProductId: item.product!.importbrainProductId!,
        quantity: item.quantity,
        unitSellingPrice: item.unitPricePesewas / 100,
      }));

    if (items.length === 0) {
      this.logger.debug(
        `Order ${order.orderNumber} has no ImportBrain-linked products, skipping push`,
      );
      return;
    }

    const body: Record<string, unknown> = {
      externalOrderId: order.id,
      orderNumber: order.orderNumber,
      status: this.mapStatus(order.status),
      items,
      subtotal: order.subtotalPesewas / 100,
      totalAmount: order.totalPesewas / 100,
      salesChannel: 'WEBSITE',
    };

    if (order.customer) {
      body.customer = {
        externalCustomerId: order.customer.id,
        name: `${order.customer.firstName} ${order.customer.lastName}`.trim(),
        phone: order.customer.phone,
        email: order.customer.email,
      };
    }

    try {
      const response = await fetch(
        `${connection.apiUrl}/platform/orders`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': connection.apiKey,
          },
          body: JSON.stringify(body),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.warn(
          `Failed to push order ${order.orderNumber} to ImportBrain: ${response.status} ${errorText}`,
        );
        return;
      }

      this.logger.log(`Pushed order ${order.orderNumber} to ImportBrain`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error pushing order to ImportBrain: ${message}`);
    }
  }

  async pushCustomer(tenantId: string, customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  }): Promise<void> {
    const connection = await this.prisma.importBrainConnection.findUnique({
      where: { tenantId },
    });

    if (!connection || connection.status !== 'active') {
      return;
    }

    try {
      const response = await fetch(
        `${connection.apiUrl}/platform/customers`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': connection.apiKey,
          },
          body: JSON.stringify({
            externalCustomerId: customer.id,
            name: `${customer.firstName} ${customer.lastName}`.trim(),
            phone: customer.phone,
            email: customer.email,
            channel: 'WEBSITE',
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.warn(
          `Failed to push customer to ImportBrain: ${response.status} ${errorText}`,
        );
        return;
      }

      this.logger.log(`Pushed customer ${customer.email} to ImportBrain`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error pushing customer to ImportBrain: ${message}`);
    }
  }

  private mapStatus(gdghStatus: string): string {
    const map: Record<string, string> = {
      PENDING_PAYMENT: 'PENDING',
      PAYMENT_CONFIRMED: 'CONFIRMED',
      PROCESSING: 'PROCESSING',
      SHIPPED: 'SHIPPED',
      DELIVERED: 'DELIVERED',
      CANCELLED: 'CANCELLED',
      REFUNDED: 'RETURNED',
    };
    return map[gdghStatus] ?? 'PENDING';
  }
}
