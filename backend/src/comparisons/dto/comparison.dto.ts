import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateComparisonDto {
  @ApiPropertyOptional({ description: 'Optional label, e.g. "Family SUV shortlist"' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ type: [String], description: 'Car ids to seed the comparison with' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  carIds?: string[];
}

export class AddComparisonCarDto {
  @ApiProperty()
  @IsString()
  carId: string;
}

export class SetComparisonCarsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  carIds: string[];
}
