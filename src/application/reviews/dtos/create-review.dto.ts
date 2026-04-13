import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsUUID()
  @IsNotEmpty()
  productId!: string;

  @ApiProperty({ example: 5, description: 'Rating from 1 to 5' })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({ example: 'Great product!' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional({ example: 'This product exceeded my expectations.' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  text?: string;

  @ApiPropertyOptional({
    example: '["https://cdn.example.com/review-img1.jpg"]',
    description: 'JSON string of image URLs',
  })
  @IsString()
  @IsOptional()
  imagesJson?: string;
}
