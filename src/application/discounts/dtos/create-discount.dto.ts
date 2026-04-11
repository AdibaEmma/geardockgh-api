import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateDiscountDto {
  @ApiProperty({ example: 'SUMMER20' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ enum: ['percentage', 'fixed'], example: 'percentage' })
  @IsEnum(['percentage', 'fixed'])
  type!: 'percentage' | 'fixed';

  @ApiProperty({ example: 2000, description: 'Pesewas for fixed, basis points (1000 = 10%) for percentage' })
  @IsInt()
  @Min(1)
  value!: number;

  @ApiPropertyOptional({ example: 50000 })
  @IsInt()
  @Min(0)
  @IsOptional()
  minOrderPesewas?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxUses?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  expiresAt?: string;
}
