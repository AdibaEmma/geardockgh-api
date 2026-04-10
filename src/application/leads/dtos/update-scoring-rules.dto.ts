import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ScoringRuleItemDto {
  @ApiProperty({ example: 'add_to_cart' })
  @IsString()
  @IsNotEmpty()
  action!: string;

  @ApiProperty({ example: 5 })
  @IsInt()
  points!: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateScoringRulesDto {
  @ApiProperty({ type: [ScoringRuleItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScoringRuleItemDto)
  rules!: ScoringRuleItemDto[];
}
