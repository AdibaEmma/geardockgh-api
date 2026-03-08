import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAddressDto {
  @ApiPropertyOptional({ example: 'Home' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty({ example: '12 Oxford Street' })
  @IsString()
  @IsNotEmpty()
  street!: string;

  @ApiProperty({ example: 'Accra' })
  @IsString()
  @IsNotEmpty()
  city!: string;

  @ApiProperty({ example: 'Greater Accra' })
  @IsString()
  @IsNotEmpty()
  region!: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
