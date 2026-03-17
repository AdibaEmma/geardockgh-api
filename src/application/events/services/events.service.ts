import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';

interface EventPayload {
  event: string;
  tenantId: string;
  data: Record<string, unknown>;
  timestamp?: string;
}

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async processInbound(payload: EventPayload): Promise<void> {
    this.logger.log(`Received inbound event: ${payload.event} for tenant ${payload.tenantId}`);

    const eventLog = await this.prisma.eventLog.create({
      data: {
        tenantId: payload.tenantId,
        event: payload.event,
        direction: 'inbound',
        payload: JSON.stringify(payload.data),
        status: 'pending',
      },
    });

    try {
      await this.dispatchEvent(payload);

      await this.prisma.eventLog.update({
        where: { id: eventLog.id },
        data: { status: 'processed', processedAt: new Date() },
      });

      this.logger.log(`Successfully processed event: ${payload.event}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to process inbound event ${payload.event}: ${message}`);

      await this.prisma.eventLog.update({
        where: { id: eventLog.id },
        data: { status: 'failed', error: message },
      });
    }
  }

  async processOutbound(
    tenantId: string,
    event: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const connection = await this.prisma.importBrainConnection.findUnique({
      where: { tenantId },
    });

    if (!connection || connection.status !== 'active') {
      this.logger.warn(
        `No active ImportBrain connection for tenant ${tenantId} — skipping outbound event "${event}"`,
      );
      return;
    }

    const eventLog = await this.prisma.eventLog.create({
      data: {
        tenantId,
        event,
        direction: 'outbound',
        payload: JSON.stringify(data),
        status: 'pending',
      },
    });

    try {
      const response = await fetch(
        `${connection.apiUrl}/events/receive`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': connection.apiKey,
          },
          body: JSON.stringify({
            event,
            tenantId: connection.importbrainTenantId,
            data,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`ImportBrain API responded with ${response.status}`);
      }

      await this.prisma.eventLog.update({
        where: { id: eventLog.id },
        data: { status: 'processed', processedAt: new Date() },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send outbound event: ${message}`);

      await this.prisma.eventLog.update({
        where: { id: eventLog.id },
        data: { status: 'failed', error: message },
      });
    }
  }

  async getEventLog(tenantId: string, eventId: string) {
    const log = await this.prisma.eventLog.findFirst({
      where: { id: eventId, tenantId },
    });

    if (!log) {
      throw new NotFoundException('Event log not found');
    }

    return log;
  }

  private async dispatchEvent(payload: EventPayload): Promise<void> {
    const { event, tenantId, data } = payload;

    switch (event) {
      case 'product.created':
        await this.handleProductCreated(tenantId, data);
        break;
      case 'product.updated':
        await this.handleProductUpdate(tenantId, data);
        break;
      case 'product.deleted':
        await this.handleProductDeleted(data);
        break;
      case 'stock.updated':
        await this.handleStockUpdate(data);
        break;
      default:
        this.logger.warn(`Unhandled event type: ${event}`);
    }
  }

  private async handleProductCreated(
    tenantId: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const productId = (data.id ?? data.productId) as string;
    if (!productId) {
      this.logger.warn('product.created event missing product id');
      return;
    }

    // Check if product already exists (idempotency)
    const existing = await this.prisma.product.findFirst({
      where: { importbrainProductId: productId, tenantId },
    });

    if (existing) {
      this.logger.log(`Product ${productId} already exists in tenant ${tenantId}, skipping create`);
      return;
    }

    const name = (data.name as string) ?? 'Untitled Product';
    const sellingPrice = data.currentSellingPrice as number | undefined;
    const pricePesewas = sellingPrice ? Math.round(sellingPrice * 100) : 0;
    const stock = (data.currentStock as number) ?? 0;
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    await this.prisma.product.create({
      data: {
        tenantId,
        importbrainProductId: productId,
        name,
        slug: `${slug}-${Date.now()}`,
        description: (data.description as string) ?? null,
        pricePesewas,
        stockCount: stock,
        isPublished: false,
      },
    });

    this.logger.log(`Created product "${name}" (${productId}) in tenant ${tenantId}`);
  }

  private async handleProductUpdate(
    tenantId: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const productId = (data.id ?? data.productId) as string;
    if (!productId) {
      this.logger.warn('product.updated event missing product id');
      return;
    }

    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.currentSellingPrice !== undefined) {
      updateData.pricePesewas = Math.round((data.currentSellingPrice as number) * 100);
    }
    if (data.currentStock !== undefined) {
      updateData.stockCount = data.currentStock;
    }

    if (Object.keys(updateData).length === 0) {
      this.logger.warn(`product.updated event for ${productId} has no mappable fields`);
      return;
    }

    const result = await this.prisma.product.updateMany({
      where: { importbrainProductId: productId, tenantId },
      data: updateData,
    });

    this.logger.log(`Updated ${result.count} product(s) for ImportBrain product ${productId}`);
  }

  private async handleProductDeleted(
    data: Record<string, unknown>,
  ): Promise<void> {
    const productId = (data.id ?? data.productId) as string;
    if (!productId) return;

    // Soft-unpublish rather than delete
    const result = await this.prisma.product.updateMany({
      where: { importbrainProductId: productId },
      data: { isPublished: false },
    });

    this.logger.log(`Unpublished ${result.count} product(s) for deleted ImportBrain product ${productId}`);
  }

  private async handleStockUpdate(
    data: Record<string, unknown>,
  ): Promise<void> {
    const productId = (data.id ?? data.productId) as string;
    const stockCount = (data.currentStock ?? data.stockCount) as number | undefined;

    if (!productId || stockCount === undefined) {
      this.logger.warn('stock.updated event missing productId or stock count');
      return;
    }

    const result = await this.prisma.product.updateMany({
      where: { importbrainProductId: productId },
      data: { stockCount },
    });

    this.logger.log(`Updated stock to ${stockCount} for ${result.count} product(s) (ImportBrain: ${productId})`);
  }
}
