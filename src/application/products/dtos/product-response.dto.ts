import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id!: string;

  @ApiProperty({ example: 'MacBook Pro M4 16"' })
  name!: string;

  @ApiProperty({ example: 'macbook-pro-m4-16' })
  slug!: string;

  @ApiPropertyOptional({ example: 'The latest MacBook Pro with M4 chip.' })
  description?: string;

  @ApiProperty({ example: 2500000 })
  pricePesewas!: number;

  @ApiPropertyOptional({ example: 3000000 })
  comparePricePesewas?: number;

  @ApiProperty({ example: 10 })
  stockCount!: number;

  @ApiProperty({ example: false })
  isPreorder!: boolean;

  @ApiProperty({ example: true })
  isPublished!: boolean;

  @ApiPropertyOptional({ example: 'Laptops' })
  category?: string;

  @ApiPropertyOptional()
  imagesJson?: string;

  @ApiPropertyOptional()
  specsJson?: string;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  updatedAt!: string;
}
