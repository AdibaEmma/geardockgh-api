import { IsEnum, IsOptional, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class PreorderQueryDto {
  @ApiPropertyOptional({ enum: ['RESERVED', 'DEPOSIT_PAID', 'FULLY_PAID', 'READY_TO_SHIP', 'FULFILLED', 'CANCELLED'] })
  @IsOptional()
  @IsEnum(['RESERVED', 'DEPOSIT_PAID', 'FULLY_PAID', 'READY_TO_SHIP', 'FULFILLED', 'CANCELLED'])
  status?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number;
}
