import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'MacBook Pro M4 16"' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({
    example: 'The latest MacBook Pro with M4 chip for ultimate performance.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 2500000, description: 'Price in pesewas (GHS * 100)' })
  @IsInt()
  @Min(0)
  pricePesewas!: number;

  @ApiPropertyOptional({ example: 3000000, description: 'Compare-at price in pesewas' })
  @IsOptional()
  @IsInt()
  @Min(0)
  comparePricePesewas?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  stockCount?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isPreorder?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({ example: 'Laptops' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    example: '["https://cdn.example.com/img1.jpg"]',
    description: 'JSON string of image URLs',
  })
  @IsOptional()
  @IsString()
  imagesJson?: string;

  @ApiPropertyOptional({
    example: '{"processor":"M4","ram":"16GB"}',
    description: 'JSON string of product specifications',
  })
  @IsOptional()
  @IsString()
  specsJson?: string;
}
