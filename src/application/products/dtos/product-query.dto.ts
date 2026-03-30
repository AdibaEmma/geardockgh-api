import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ProductQueryDto {
  @ApiPropertyOptional({ example: 'macbook', description: 'Search by name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'audio,computing', description: 'Comma-separated category slugs' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'headphones', description: 'Subcategory slug' })
  @IsOptional()
  @IsString()
  subcategory?: string;

  @ApiPropertyOptional({ example: 'true', description: 'Filter by pre-order status: "true" or "false"' })
  @IsOptional()
  @IsIn(['true', 'false'])
  isPreorder?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({
    example: 'createdAt',
    description: 'Sort field',
    enum: ['createdAt', 'pricePesewas', 'name'],
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    example: 'desc',
    description: 'Sort direction',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}
