import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';
import type { AppConfiguration } from '../../../infrastructure/config/app.config.js';

interface ConnectStoreResponse {
  tenantId: string;
  integrationId: string;
  apiKey: string;
  callbackKey: string;
}

@Injectable()
export class ImportBrainConnectionService {
  private readonly logger = new Logger(ImportBrainConnectionService.name);
  private readonly importbrainApiUrl: string;
  private readonly geardockghApiUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const appConf = this.configService.get<AppConfiguration>('app')!;
    this.importbrainApiUrl = appConf.importbrain.apiUrl;
    this.geardockghApiUrl = appConf.geardockghApiUrl;
  }

  async savePlatformKey(tenantId: string, platformKey: string): Promise<void> {
    // Upsert: store platform key on the connection record (or a pre-connection record)
    const existing = await this.prisma.importBrainConnection.findUnique({
      where: { tenantId },
    });

    if (existing) {
      await this.prisma.importBrainConnection.update({
        where: { tenantId },
        data: { platformKey },
      });
    } else {
      // Create a placeholder record to store the key before connect
      await this.prisma.importBrainConnection.create({
        data: {
          tenantId,
          importbrainTenantId: '',
          integrationId: '',
          apiKey: '',
          apiUrl: this.importbrainApiUrl,
          platformKey,
          status: 'pending',
        },
      });
    }

    this.logger.log(`Platform key saved for tenant ${tenantId}`);
  }

  async connect(tenantId: string): Promise<{
    importbrainTenantId: string;
    integrationId: string;
    status: string;
  }> {
    // Get the stored platform key
    const existingConnection = await this.prisma.importBrainConnection.findUnique({
      where: { tenantId },
    });

    if (existingConnection && existingConnection.status === 'active') {
      throw new ConflictException('ImportBrain is already connected');
    }

    const platformKey = existingConnection?.platformKey;
    if (!platformKey) {
      throw new BadRequestException(
        'Platform key not configured. Save the platform key from ImportBrain first.',
      );
    }

    // Get tenant info for the store name
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Call ImportBrain to connect
    let connectResponse: ConnectStoreResponse;
    try {
      const response = await fetch(
        `${this.importbrainApiUrl}/integrations/connect`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Platform-Key': platformKey,
          },
          body: JSON.stringify({
            storeName: tenant.name,
            platform: 'geardockgh',
            callbackUrl: this.geardockghApiUrl,
          }),
        },
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `ImportBrain responded with ${response.status}: ${errorBody}`,
        );
      }

      const body = (await response.json()) as { data: ConnectStoreResponse } | ConnectStoreResponse;
      connectResponse = 'data' in body ? body.data : body;
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      if (error instanceof BadRequestException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to connect to ImportBrain: ${message}`);
      throw new InternalServerErrorException(
        'Failed to connect to ImportBrain',
      );
    }

    // Store/update connection in DB
    const connectionData = {
      importbrainTenantId: connectResponse.tenantId,
      integrationId: connectResponse.integrationId,
      apiKey: connectResponse.apiKey,
      apiUrl: this.importbrainApiUrl,
      callbackKey: connectResponse.callbackKey,
      status: 'active',
      connectedAt: new Date(),
      disconnectedAt: null,
    };

    if (existingConnection) {
      await this.prisma.importBrainConnection.update({
        where: { tenantId },
        data: connectionData,
      });
    } else {
      await this.prisma.importBrainConnection.create({
        data: {
          tenantId,
          platformKey,
          ...connectionData,
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

    const platformKey = connection.platformKey;

    // Call ImportBrain to disconnect
    try {
      const response = await fetch(
        `${this.importbrainApiUrl}/integrations/${connection.integrationId}/disconnect`,
        {
          method: 'DELETE',
          headers: {
            ...(platformKey ? { 'X-Platform-Key': platformKey } : {}),
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

    // Update local record — keep the platformKey for reconnection
    await this.prisma.importBrainConnection.update({
      where: { tenantId },
      data: {
        status: 'disconnected',
        disconnectedAt: new Date(),
      },
    });

    this.logger.log(`Disconnected tenant ${tenantId} from ImportBrain`);
  }

  async deleteConnection(tenantId: string): Promise<void> {
    const connection = await this.prisma.importBrainConnection.findUnique({
      where: { tenantId },
    });

    if (!connection) {
      throw new NotFoundException('No ImportBrain connection found');
    }

    // If active, disconnect from ImportBrain first
    if (connection.status === 'active') {
      try {
        await fetch(
          `${this.importbrainApiUrl}/integrations/${connection.integrationId}/disconnect`,
          {
            method: 'DELETE',
            headers: {
              ...(connection.platformKey ? { 'X-Platform-Key': connection.platformKey } : {}),
            },
          },
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Failed to notify ImportBrain during delete: ${message}`);
      }
    }

    await this.prisma.importBrainConnection.delete({
      where: { tenantId },
    });

    this.logger.log(`Deleted ImportBrain connection for tenant ${tenantId}`);
  }

  async updatePlatformKey(tenantId: string, platformKey: string): Promise<void> {
    const connection = await this.prisma.importBrainConnection.findUnique({
      where: { tenantId },
    });

    if (!connection) {
      throw new NotFoundException('No ImportBrain connection found. Save a platform key first.');
    }

    await this.prisma.importBrainConnection.update({
      where: { tenantId },
      data: { platformKey },
    });

    this.logger.log(`Platform key updated for tenant ${tenantId}`);
  }

  async getStatus(tenantId: string) {
    const connection = await this.prisma.importBrainConnection.findUnique({
      where: { tenantId },
    });

    if (!connection) {
      return { connected: false, status: 'not_connected', hasPlatformKey: false };
    }

    return {
      connected: connection.status === 'active',
      status: connection.status,
      hasPlatformKey: !!connection.platformKey,
      integrationId: connection.integrationId || undefined,
      importbrainTenantId: connection.importbrainTenantId || undefined,
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
