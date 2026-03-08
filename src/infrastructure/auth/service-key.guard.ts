import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfiguration } from '../config/app.config.js';

@Injectable()
export class ServiceKeyGuard implements CanActivate {
  private readonly serviceKey: string;

  constructor(private readonly configService: ConfigService) {
    const appConf = this.configService.get<AppConfiguration>('app')!;
    this.serviceKey = appConf.importbrain.serviceKey;
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const providedKey = request.headers['x-service-key'] as string | undefined;

    if (!providedKey || providedKey !== this.serviceKey) {
      throw new UnauthorizedException('Invalid or missing service key');
    }

    return true;
  }
}
