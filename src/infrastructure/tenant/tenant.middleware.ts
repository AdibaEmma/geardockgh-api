import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response, NextFunction } from 'express';
import type { AppConfiguration } from '../config/app.config.js';

export const REQUEST_TENANT_KEY = 'tenantId';

/**
 * Resolves tenantId server-side from config only.
 * - Public/unauthenticated routes use DEFAULT_TENANT_ID from env.
 * - Authenticated routes should use user.tenantId from JWT instead.
 * - No client header is trusted for tenant resolution.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly defaultTenantId: string;

  constructor(private readonly configService: ConfigService) {
    const appConf = this.configService.get<AppConfiguration>('app')!;
    this.defaultTenantId = appConf.defaultTenantId;
  }

  use(req: Request, _res: Response, next: NextFunction) {
    (req as any)[REQUEST_TENANT_KEY] = this.defaultTenantId;
    next();
  }
}
