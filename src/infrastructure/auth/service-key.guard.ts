import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class ServiceKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const providedKey = request.headers['x-service-key'] as string | undefined;

    if (!providedKey) {
      throw new UnauthorizedException('Missing service key');
    }

    // Look up the tenant from the request (set by TenantMiddleware or event payload)
    const tenantId = request.body?.tenantId ?? request.headers['x-tenant-id'];

    if (!tenantId) {
      throw new UnauthorizedException(
        'Missing tenant identifier for service key validation',
      );
    }

    // Validate against the callback key stored in ImportBrainConnection
    const connection = await this.prisma.importBrainConnection.findUnique({
      where: { tenantId },
    });

    if (
      !connection ||
      connection.status !== 'active' ||
      !connection.callbackKey
    ) {
      throw new UnauthorizedException('Invalid or missing service key');
    }

    if (providedKey !== connection.callbackKey) {
      throw new UnauthorizedException('Invalid or missing service key');
    }

    return true;
  }
}
