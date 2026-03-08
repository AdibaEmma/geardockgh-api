import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';
import type { InitializePaymentDto } from '../dtos/initialize-payment.dto.js';
import type { AppConfiguration } from '../../../infrastructure/config/app.config.js';

@Injectable()
export class PaymentsService {
  private readonly paystackSecretKey: string;
  private readonly paystackBaseUrl = 'https://api.paystack.co';

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const appConf = this.configService.get<AppConfiguration>('app')!;
    this.paystackSecretKey = appConf.paystack.secretKey;
  }

  async initializePayment(
    dto: InitializePaymentDto,
    customerId: string,
    tenantId: string,
  ) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: dto.orderId,
        customerId,
        tenantId,
        status: OrderStatus.PENDING_PAYMENT,
        deletedAt: null,
      },
      include: { customer: true },
    });

    if (!order) {
      throw new NotFoundException(
        'Order not found or not in pending payment status',
      );
    }

    const reference = `GD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        provider: dto.provider,
        amountPesewas: order.totalPesewas,
        reference,
        status: PaymentStatus.PENDING,
      },
    });

    if (dto.provider === 'PAYSTACK') {
      const paystackResponse = await this.initializePaystack({
        email: order.customer.email,
        amount: order.totalPesewas,
        reference,
        callbackUrl: dto.callbackUrl,
      });

      return {
        paymentId: payment.id,
        reference,
        authorizationUrl: paystackResponse.authorization_url,
        accessCode: paystackResponse.access_code,
      };
    }

    // For MOMO / BANK_TRANSFER, return reference for manual verification
    return {
      paymentId: payment.id,
      reference,
      provider: dto.provider,
      amountPesewas: order.totalPesewas,
    };
  }

  async verifyPayment(reference: string, customerId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { reference },
      include: { order: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.order?.customerId !== customerId) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === PaymentStatus.SUCCESS) {
      return payment;
    }

    if (payment.provider === 'PAYSTACK') {
      const verification = await this.verifyPaystack(reference);

      if (verification.status === 'success') {
        return this.confirmPayment(payment.id, verification.id.toString());
      }

      if (verification.status === 'failed') {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.FAILED },
        });
        throw new BadRequestException('Payment failed');
      }
    }

    return payment;
  }

  async handleWebhook(event: string, data: Record<string, unknown>) {
    if (event !== 'charge.success') return;

    const reference = data.reference as string;
    if (!reference) return;

    const payment = await this.prisma.payment.findUnique({
      where: { reference },
    });

    if (!payment || payment.status === PaymentStatus.SUCCESS) return;

    await this.confirmPayment(payment.id, (data.id as number)?.toString());
  }

  private async confirmPayment(paymentId: string, transactionId: string) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.SUCCESS,
          transactionId,
          paidAt: new Date(),
        },
        include: { order: true },
      });

      if (payment.orderId) {
        await tx.order.update({
          where: { id: payment.orderId },
          data: { status: OrderStatus.PAYMENT_CONFIRMED },
        });
      }

      return payment;
    });
  }

  private async initializePaystack(params: {
    email: string;
    amount: number;
    reference: string;
    callbackUrl?: string;
  }) {
    const response = await fetch(
      `${this.paystackBaseUrl}/transaction/initialize`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: params.email,
          amount: params.amount,
          reference: params.reference,
          callback_url: params.callbackUrl,
          currency: 'GHS',
        }),
      },
    );

    const body = await response.json();

    if (!body.status) {
      throw new BadRequestException(
        body.message ?? 'Failed to initialize Paystack payment',
      );
    }

    return body.data as {
      authorization_url: string;
      access_code: string;
      reference: string;
    };
  }

  private async verifyPaystack(reference: string) {
    const response = await fetch(
      `${this.paystackBaseUrl}/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${this.paystackSecretKey}`,
        },
      },
    );

    const body = await response.json();

    if (!body.status) {
      throw new BadRequestException(
        body.message ?? 'Failed to verify payment',
      );
    }

    return body.data as {
      id: number;
      status: string;
      reference: string;
      amount: number;
    };
  }
}
