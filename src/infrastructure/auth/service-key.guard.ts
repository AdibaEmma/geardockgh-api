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

    // Validate against callback keys stored in ImportBrainConnection
    const connection = await this.prisma.importBrainConnection.findFirst({
      where: {
        callbackKey: providedKey,
        status: 'active',
      },
    });

    if (!connection) {
      throw new UnauthorizedException('Invalid service key');
    }

    // Set the tenant ID on the request so @TenantId() decorator resolves correctly
    request['tenantId'] = connection.tenantId;

    return true;
  }
}
