import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from '../../application/auth/services/auth.service.js';
import { CreateCustomerDto } from '../../application/auth/dtos/register.dto.js';
import { LoginDto } from '../../application/auth/dtos/login.dto.js';
import { UpdateProfileDto } from '../../application/auth/dtos/update-profile.dto.js';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard.js';
import { JwtRefreshGuard } from '../../infrastructure/auth/jwt-refresh.guard.js';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator.js';
import { TenantId } from '../../infrastructure/tenant/tenant-id.decorator.js';
import type { AuthenticatedUser } from '../../infrastructure/auth/jwt.strategy.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UseGuards(ThrottlerGuard)
  @Throttle({ long: { limit: 5, ttl: 3600000 } })
  @ApiOperation({ summary: 'Register a new customer' })
  async register(
    @Body() dto: CreateCustomerDto,
    @TenantId() tenantId: string,
  ) {
    return this.authService.register(dto, tenantId);
  }

  @Post('login')
  @UseGuards(ThrottlerGuard)
  @Throttle({ long: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  async login(
    @Body() dto: LoginDto,
    @TenantId() tenantId: string,
  ) {
    return this.authService.login(dto, tenantId);
  }

  @Post('refresh')
  @UseGuards(ThrottlerGuard, JwtRefreshGuard)
  @Throttle({ long: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(
    @CurrentUser() user: AuthenticatedUser & { refreshToken: string },
  ) {
    return this.authService.refresh(user.userId, user.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and revoke refresh tokens' })
  async logout(@CurrentUser() user: AuthenticatedUser) {
    await this.authService.logout(user.userId);
    return { message: 'Logged out successfully' };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current customer profile' })
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getProfile(user.userId);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current customer profile' })
  async updateProfile(
    @Body() dto: UpdateProfileDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.authService.updateProfile(user.userId, dto);
  }
}
