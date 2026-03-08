import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { createHmac } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from '../../application/payments/services/payments.service.js';
import { InitializePaymentDto } from '../../application/payments/dtos/initialize-payment.dto.js';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard.js';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../../infrastructure/auth/jwt.strategy.js';
import type { AppConfiguration } from '../../infrastructure/config/app.config.js';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  private readonly webhookSecret: string;

  constructor(
    private readonly paymentsService: PaymentsService,
    configService: ConfigService,
  ) {
    const appConf = configService.get<AppConfiguration>('app')!;
    this.webhookSecret = appConf.paystack.webhookSecret;
  }

  @Post('initialize')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initialize a payment for an order' })
  async initialize(
    @Body() dto: InitializePaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentsService.initializePayment(
      dto,
      user.userId,
      user.tenantId,
    );
  }

  @Get('verify/:reference')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify a payment by reference' })
  async verify(
    @Param('reference') reference: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentsService.verifyPayment(reference, user.userId);
  }

  @Post('webhooks/paystack')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Paystack webhook endpoint' })
  async paystackWebhook(
    @Req() req: any,
    @Headers('x-paystack-signature') signature: string,
    @Body() body: { event: string; data: Record<string, unknown> },
  ) {
    if (this.webhookSecret) {
      const rawBody = req.rawBody as Buffer | undefined;
      if (rawBody) {
        const hash = createHmac('sha512', this.webhookSecret)
          .update(rawBody)
          .digest('hex');

        if (hash !== signature) {
          return { status: 'invalid signature' };
        }
      }
    }

    await this.paymentsService.handleWebhook(body.event, body.data);
    return { status: 'ok' };
  }
}
