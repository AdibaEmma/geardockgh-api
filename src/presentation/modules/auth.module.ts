import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from '../controllers/auth.controller.js';
import { AuthService } from '../../application/auth/services/auth.service.js';
import { PasswordService } from '../../application/auth/services/password.service.js';
import { TokenService } from '../../application/auth/services/token.service.js';
import { JwtStrategy } from '../../infrastructure/auth/jwt.strategy.js';
import { JwtRefreshStrategy } from '../../infrastructure/auth/jwt-refresh.strategy.js';
import { LeadsModule } from './leads.module.js';
import type { AppConfiguration } from '../../infrastructure/config/app.config.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    LeadsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const appConf = configService.get<AppConfiguration>('app')!;
        return {
          secret: appConf.jwt.secret,
          signOptions: { expiresIn: appConf.jwt.expiry as any },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    TokenService,
    JwtStrategy,
    JwtRefreshStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}
