import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class AdminOrderItemDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  productId!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  variantId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  selectedOptions?: string;
}

export class CreateAdminOrderDto {
  @ApiProperty({ type: [AdminOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminOrderItemDto)
  items!: AdminOrderItemDto[];

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  customerName!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  customerPhone?: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  customerEmail?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  customerId?: string;

  @ApiProperty({ enum: ['CASH', 'MOMO', 'BANK_TRANSFER'] })
  @IsEnum(['CASH', 'MOMO', 'BANK_TRANSFER'])
  paymentMethod!: 'CASH' | 'MOMO' | 'BANK_TRANSFER';

  @ApiPropertyOptional({ enum: ['PENDING_PAYMENT', 'PAYMENT_CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  deliveryFee?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  discountPesewas?: number;
}
