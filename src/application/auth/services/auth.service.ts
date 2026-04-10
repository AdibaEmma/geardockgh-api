import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';
import { PasswordService } from './password.service.js';
import { TokenService, type TokenPair } from './token.service.js';
import { LeadService } from '../../leads/services/lead.service.js';
import type { CreateCustomerDto } from '../dtos/register.dto.js';
import type { LoginDto } from '../dtos/login.dto.js';

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    @Optional() private readonly leadService?: LeadService,
  ) {}

  async register(
    dto: CreateCustomerDto,
    tenantId: string,
  ): Promise<AuthResult> {
    const existing = await this.prisma.customer.findUnique({
      where: { email_tenantId: { email: dto.email, tenantId } },
    });

    if (existing) {
      throw new ConflictException('A customer with this email already exists');
    }

    const passwordHash = await this.passwordService.hash(dto.password);

    const customer = await this.prisma.customer.create({
      data: {
        tenantId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        passwordHash,
        phone: dto.phone,
      },
    });

    const tokens = await this.tokenService.generateTokenPair({
      sub: customer.id,
      email: customer.email,
      role: customer.role,
      tenantId: customer.tenantId,
    });

    // Track lead on registration
    this.leadService
      ?.recordActivity(customer.email, tenantId, 'account_created', {
        source: 'REGISTRATION',
        customerId: customer.id,
      })
      .catch(() => {}); // fire-and-forget

    return {
      ...tokens,
      user: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        role: customer.role,
      },
    };
  }

  async login(dto: LoginDto, tenantId: string): Promise<AuthResult> {
    const customer = await this.prisma.customer.findUnique({
      where: { email_tenantId: { email: dto.email, tenantId } },
    });

    if (!customer) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!customer.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const isPasswordValid = await this.passwordService.compare(
      dto.password,
      customer.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.tokenService.generateTokenPair({
      sub: customer.id,
      email: customer.email,
      role: customer.role,
      tenantId: customer.tenantId,
    });

    return {
      ...tokens,
      user: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        role: customer.role,
      },
    };
  }

  async refresh(
    userId: string,
    refreshToken: string,
  ): Promise<TokenPair> {
    return this.tokenService.refreshTokenPair(userId, refreshToken);
  }

  async logout(userId: string): Promise<void> {
    await this.tokenService.revokeAllTokens(userId);
  }

  async getProfile(userId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  async updateProfile(
    userId: string,
    data: { firstName?: string; lastName?: string; phone?: string; momoNumber?: string },
  ) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: userId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return this.prisma.customer.update({
      where: { id: userId },
      data: {
        ...(data.firstName && { firstName: data.firstName }),
        ...(data.lastName && { lastName: data.lastName }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.momoNumber !== undefined && { momoNumber: data.momoNumber }),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });
  }
}
