import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { PrismaService } from '../database/prisma.service.js';
import type { AppConfiguration } from '../config/app.config.js';
import type { JwtPayload, AuthenticatedUser } from './jwt.strategy.js';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService,
  ) {
    const appConf = configService.get<AppConfiguration>('app')!;

    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: appConf.jwt.refreshSecret,
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    payload: JwtPayload,
  ): Promise<AuthenticatedUser & { refreshToken: string }> {
    const refreshToken = req.body?.refreshToken as string | undefined;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not provided');
    }

    const customer = await this.prisma.customer.findUnique({
      where: { id: payload.sub },
    });

    if (!customer || !customer.isActive) {
      throw new UnauthorizedException('Customer not found or inactive');
    }

    return {
      userId: customer.id,
      email: customer.email,
      role: customer.role,
      tenantId: customer.tenantId,
      refreshToken,
    };
  }
}
