import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';
import type { AppConfiguration } from '../../../infrastructure/config/app.config.js';
import type { JwtPayload } from '../../../infrastructure/auth/jwt.strategy.js';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class TokenService {
  private readonly refreshSecret: string;
  private readonly refreshExpiry: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const appConf = this.configService.get<AppConfiguration>('app')!;
    this.refreshSecret = appConf.jwt.refreshSecret;
    this.refreshExpiry = appConf.jwt.refreshExpiry;
  }

  async generateTokenPair(payload: JwtPayload): Promise<TokenPair> {
    const tokenPayload = { ...payload } as Record<string, unknown>;
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(tokenPayload),
      this.jwtService.signAsync(tokenPayload, {
        secret: this.refreshSecret,
        expiresIn: this.refreshExpiry as any,
      }),
    ]);

    await this.storeRefreshToken(payload.sub, refreshToken);

    return { accessToken, refreshToken };
  }

  async refreshTokenPair(
    userId: string,
    oldRefreshToken: string,
  ): Promise<TokenPair> {
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: oldRefreshToken },
      include: { customer: true },
    });

    if (
      !storedToken ||
      storedToken.isRevoked ||
      storedToken.customerId !== userId ||
      storedToken.expiresAt < new Date()
    ) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    const { customer } = storedToken;
    return this.generateTokenPair({
      sub: customer.id,
      email: customer.email,
      role: customer.role,
      tenantId: customer.tenantId,
    });
  }

  async revokeAllTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { customerId: userId, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  private async storeRefreshToken(
    customerId: string,
    token: string,
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        token,
        customerId,
        expiresAt,
      },
    });
  }
}
