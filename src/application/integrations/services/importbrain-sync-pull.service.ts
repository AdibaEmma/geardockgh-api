import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';
import { EventsService } from '../../events/services/events.service.js';

interface ImportBrainProduct {
  id: string;
  name: string;
  sku?: string;
  description?: string;
  category?: string;
  imageUrl?: string;
  imagesJson?: string;
  currentSellingPrice: number | string;
  currentStock: number;
  latestLandedCostPerUnit?: number | string;
  isActive: boolean;
}

export interface SyncResult {
  created: number;
  updated: number;
  skipped: number;
  total: number;
}

@Injectable()
export class ImportBrainSyncPullService {
  private readonly logger = new Logger(ImportBrainSyncPullService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
  ) {}

  async syncProducts(tenantId: string): Promise<SyncResult> {
    const connection = await this.prisma.importBrainConnection.findUnique({
      where: { tenantId },
    });

    if (!connection || connection.status !== 'active') {
      throw new NotFoundException('No active ImportBrain connection');
    }

    if (!connection.apiKey) {
      throw new BadRequestException('ImportBrain API key not configured');
    }

    const result: SyncResult = { created: 0, updated: 0, skipped: 0, total: 0 };
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const products = await this.fetchProductsPage(
        connection.apiUrl,
        connection.apiKey,
        page,
      );

      if (products.length === 0) {
        hasMore = false;
        break;
      }

      for (const product of products) {
        result.total++;
        try {
          const action = await this.syncProduct(tenantId, product);
          result[action]++;
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          this.logger.error(`Failed to sync product ${product.id}: ${msg}`);
          result.skipped++;
        }
      }

      if (products.length < 100) {
        hasMore = false;
      } else {
        page++;
      }
    }

    this.logger.log(
      `Sync complete for tenant ${tenantId}: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped (${result.total} total)`,
    );

    return result;
  }

  private async fetchProductsPage(
    apiUrl: string,
    apiKey: string,
    page: number,
  ): Promise<ImportBrainProduct[]> {
    const response = await fetch(
      `${apiUrl}/platform/products?page=${page}&limit=100`,
      {
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      throw new Error(`ImportBrain API responded with ${response.status}`);
    }

    const body = await response.json();
    return (body.data ?? []) as ImportBrainProduct[];
  }

  private async syncProduct(
    tenantId: string,
    product: ImportBrainProduct,
  ): Promise<'created' | 'updated' | 'skipped'> {
    const existing = await this.prisma.product.findFirst({
      where: { importbrainProductId: product.id, tenantId },
    });

    const data: Record<string, unknown> = {
      id: product.id,
      productId: product.id,
      name: product.name,
      description: product.description,
      category: product.category,
      imageUrl: product.imageUrl,
      imagesJson: product.imagesJson,
      currentSellingPrice:
        typeof product.currentSellingPrice === 'string'
          ? parseFloat(product.currentSellingPrice)
          : product.currentSellingPrice,
      currentStock: product.currentStock,
      latestLandedCostPerUnit:
        product.latestLandedCostPerUnit !== undefined
          ? typeof product.latestLandedCostPerUnit === 'string'
            ? parseFloat(product.latestLandedCostPerUnit)
            : product.latestLandedCostPerUnit
          : undefined,
    };

    if (existing) {
      // Use event handler for consistent mapping logic
      await this.eventsService.processInbound({
        event: 'product.updated',
        tenantId,
        data,
      });
      return 'updated';
    } else {
      await this.eventsService.processInbound({
        event: 'product.created',
        tenantId,
        data,
      });
      return 'created';
    }
  }
}
