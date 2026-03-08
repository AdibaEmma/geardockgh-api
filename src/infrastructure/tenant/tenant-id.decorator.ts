import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { REQUEST_TENANT_KEY } from './tenant.middleware.js';

export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request[REQUEST_TENANT_KEY];
  },
);
