import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../database/prisma.service.js';
import type { AppConfiguration } from '../config/app.config.js';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  tenantId: string;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService,
  ) {
    const appConf = configService.get<AppConfiguration>('app')!;

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: appConf.jwt.secret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
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
    };
  }
}
