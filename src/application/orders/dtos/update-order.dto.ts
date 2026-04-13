import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderDto {
  @ApiPropertyOptional({ enum: OrderStatus, example: OrderStatus.PROCESSING })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ example: 'Order is being prepared' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({ example: '2026-04-10T12:00:00.000Z', description: 'Override order date' })
  @IsOptional()
  @IsString()
  orderDate?: string;
}
