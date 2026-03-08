import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentProvider } from '@prisma/client';

export class InitializePaymentDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsUUID()
  orderId!: string;

  @ApiProperty({ enum: PaymentProvider, example: PaymentProvider.PAYSTACK })
  @IsEnum(PaymentProvider)
  provider!: PaymentProvider;

  @ApiPropertyOptional({ example: 'http://localhost:3001/checkout/callback' })
  @IsOptional()
  @IsString()
  callbackUrl?: string;
}
