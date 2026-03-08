import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EventPayloadDto {
  @ApiProperty({ example: 'product.updated', description: 'Event type identifier' })
  @IsString()
  @IsNotEmpty()
  event!: string;

  @ApiProperty({ example: 'tenant_abc123' })
  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @ApiProperty({
    example: { productId: 'abc-123', name: 'Updated Product' },
    description: 'Event-specific data payload',
  })
  @IsObject()
  data!: Record<string, unknown>;

  @ApiPropertyOptional({ example: '2026-03-07T12:00:00.000Z' })
  @IsOptional()
  @IsString()
  timestamp?: string;
}
