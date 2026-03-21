import { IsArray, IsEnum, IsUUID, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';

export class BulkUpdateOrdersDto {
  @ApiProperty({ type: [String], description: 'Array of order IDs to update' })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  orderIds!: string[];

  @ApiProperty({ enum: OrderStatus, example: OrderStatus.PROCESSING })
  @IsEnum(OrderStatus)
  status!: OrderStatus;
}
