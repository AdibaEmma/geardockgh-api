import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';
import type { AppConfiguration } from '../../../infrastructure/config/app.config.js';

@Injectable()
export class ImportBrainConnectionService {
  private readonly logger = new Logger(ImportBrainConnectionService.name);
  private readonly importbrainApiUrl: string;
  private readonly platformKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const appConf = this.configService.get<AppConfiguration>('app')!;
    this.importbrainApiUrl = appConf.importbrain.apiUrl;
    this.platformKey = appConf.importbrain.platformKey;
  }

  async connect(tenantId: string): Promise<{
    importbrainTenantId: string;
    integrationId: string;
    status: string;
  }> {
    // Check if already connected
    const existing = await this.prisma.importBrainConnection.findUnique({
      where: { tenantId },
    });

    if (existing && existing.status === 'active') {
      throw new ConflictException('ImportBrain is already connected');
    }

    // Get tenant info for the store name
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Call ImportBrain to connect
    let connectResponse;
    try {
      const response = await fetch(
        `${this.importbrainApiUrl}/integrations/connect`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Platform-Key': this.platformKey,
          },
          body: JSON.stringify({
            storeName: tenant.name,
            platform: 'geardockgh',
          }),
        },
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `ImportBrain responded with ${response.status}: ${errorBody}`,
        );
      }

      connectResponse = (await response.json()) as {
        tenantId: string;
        integrationId: string;
        apiKey: string;
      };
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to connect to ImportBrain: ${message}`);
      throw new InternalServerErrorException(
        'Failed to connect to ImportBrain',
      );
    }

    // Store connection in DB (upsert in case of reconnect)
    if (existing) {
      await this.prisma.importBrainConnection.update({
        where: { tenantId },
        data: {
          importbrainTenantId: connectResponse.tenantId,
          integrationId: connectResponse.integrationId,
          apiKey: connectResponse.apiKey,
          apiUrl: this.importbrainApiUrl,
          status: 'active',
          connectedAt: new Date(),
          disconnectedAt: null,
        },
      });
    } else {
      await this.prisma.importBrainConnection.create({
        data: {
          tenantId,
          importbrainTenantId: connectResponse.tenantId,
          integrationId: connectResponse.integrationId,
          apiKey: connectResponse.apiKey,
          apiUrl: this.importbrainApiUrl,
          status: 'active',
        },
      });
    }

    this.logger.log(
      `Connected tenant ${tenantId} to ImportBrain (integration: ${connectResponse.integrationId})`,
    );

    return {
      importbrainTenantId: connectResponse.tenantId,
      integrationId: connectResponse.integrationId,
      status: 'active',
    };
  }

  async disconnect(tenantId: string): Promise<void> {
    const connection = await this.prisma.importBrainConnection.findUnique({
      where: { tenantId },
    });

    if (!connection || connection.status === 'disconnected') {
      throw new NotFoundException('No active ImportBrain connection found');
    }

    // Call ImportBrain to disconnect
    try {
      const response = await fetch(
        `${this.importbrainApiUrl}/integrations/${connection.integrationId}/disconnect`,
        {
          method: 'DELETE',
          headers: {
            'X-Platform-Key': this.platformKey,
          },
        },
      );

      if (!response.ok && response.status !== 404) {
        this.logger.warn(
          `ImportBrain disconnect returned ${response.status}, proceeding with local cleanup`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to notify ImportBrain of disconnect: ${message}`,
      );
    }

    // Update local record
    await this.prisma.importBrainConnection.update({
      where: { tenantId },
      data: {
        status: 'disconnected',
        disconnectedAt: new Date(),
      },
    });

    this.logger.log(`Disconnected tenant ${tenantId} from ImportBrain`);
  }

  async getStatus(tenantId: string) {
    const connection = await this.prisma.importBrainConnection.findUnique({
      where: { tenantId },
    });

    if (!connection) {
      return { connected: false, status: 'not_connected' };
    }

    return {
      connected: connection.status === 'active',
      status: connection.status,
      integrationId: connection.integrationId,
      importbrainTenantId: connection.importbrainTenantId,
      connectedAt: connection.connectedAt,
      disconnectedAt: connection.disconnectedAt,
    };
  }

  async getConnection(tenantId: string) {
    const connection = await this.prisma.importBrainConnection.findUnique({
      where: { tenantId },
    });

    if (!connection || connection.status !== 'active') {
      return null;
    }

    return connection;
  }
}
