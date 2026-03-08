import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';
import type { EventPayloadDto } from '../dtos/event-payload.dto.js';
import type { AppConfiguration } from '../../../infrastructure/config/app.config.js';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  private readonly importbrainApiUrl: string;
  private readonly serviceKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const appConf = this.configService.get<AppConfiguration>('app')!;
    this.importbrainApiUrl = appConf.importbrain.apiUrl;
    this.serviceKey = appConf.importbrain.serviceKey;
  }

  async processInbound(payload: EventPayloadDto): Promise<void> {
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
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to process inbound event: ${message}`);

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
      const response = await fetch(`${this.importbrainApiUrl}/events/receive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Key': this.serviceKey,
        },
        body: JSON.stringify({ event, tenantId, data }),
      });

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

  private async dispatchEvent(payload: EventPayloadDto): Promise<void> {
    const { event, tenantId, data } = payload;

    switch (event) {
      case 'product.updated':
        await this.handleProductUpdate(tenantId, data);
        break;
      case 'stock.updated':
        await this.handleStockUpdate(data);
        break;
      default:
        this.logger.warn(`Unhandled event type: ${event}`);
    }
  }

  private async handleProductUpdate(
    tenantId: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const productId = data.productId as string;
    if (!productId) return;

    await this.prisma.product.updateMany({
      where: { importbrainProductId: productId, tenantId },
      data: {
        name: data.name as string | undefined,
        description: data.description as string | undefined,
        pricePesewas: data.pricePesewas as number | undefined,
      },
    });
  }

  private async handleStockUpdate(
    data: Record<string, unknown>,
  ): Promise<void> {
    const productId = data.productId as string;
    const stockCount = data.stockCount as number;
    if (!productId || stockCount === undefined) return;

    await this.prisma.product.updateMany({
      where: { importbrainProductId: productId },
      data: { stockCount },
    });
  }
}
