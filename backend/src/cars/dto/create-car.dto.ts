import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { BodyType, CarStatus } from '@prisma/client';
import {
  CarColorDto,
  CarDimensionsDto,
  CarEngineDto,
  CarExteriorDto,
  CarImageDto,
  CarInteriorDto,
  CarSafetyDto,
  CarTechnologyDto,
  CarTranslationDto,
  CarWheelsDto,
} from './car-spec-groups.dto';
import { trim } from '../../common/transforms';

/**
 * Admin car form (spec §47). Every section of the specification is represented;
 * only the identity fields are mandatory so a vehicle can be saved as a draft
 * and completed later.
 */
export class CreateCarDto {
  @ApiProperty({ description: 'Existing brand id' })
  @IsString()
  @MinLength(1)
  brandId: string;

  @ApiPropertyOptional({ description: 'Promotional price; must be below the normal price' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  promoPrice?: number;

  @ApiPropertyOptional({ description: 'Path of this vehicle\'s uploaded clip, e.g. /uploads/abc.mp4' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(trim)
  videoUrl?: string;

  @ApiProperty({ example: 'Tiggo 8 Pro Max' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  @Transform(trim)
  model: string;

  @ApiProperty({ example: 2024 })
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  year: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) generation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) trim?: string;

  @ApiProperty({ enum: BodyType })
  @IsEnum(BodyType)
  bodyType: BodyType;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) segment?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) category?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 8 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(8)
  doors?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 9 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(9)
  seats?: number;

  @ApiProperty({ description: 'Price in the configured currency' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100_000_000)
  price: number;

  @ApiPropertyOptional({ default: 'USD' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ description: 'Short copy for cards (spec §23)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  marketingDescription?: string;

  @ApiPropertyOptional({ description: 'Full vehicle description (spec §14)' })
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  description?: string;

  @ApiPropertyOptional({ enum: CarStatus, default: CarStatus.DRAFT })
  @IsOptional()
  @IsEnum(CarStatus)
  status?: CarStatus;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFeatured?: boolean;

  @ApiPropertyOptional({ type: CarEngineDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CarEngineDto)
  engine?: CarEngineDto;

  @ApiPropertyOptional({ type: CarWheelsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CarWheelsDto)
  wheels?: CarWheelsDto;

  @ApiPropertyOptional({ type: CarExteriorDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CarExteriorDto)
  exterior?: CarExteriorDto;

  @ApiPropertyOptional({ type: CarInteriorDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CarInteriorDto)
  interior?: CarInteriorDto;

  @ApiPropertyOptional({ type: CarTechnologyDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CarTechnologyDto)
  technology?: CarTechnologyDto;

  @ApiPropertyOptional({ type: CarSafetyDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CarSafetyDto)
  safety?: CarSafetyDto;

  @ApiPropertyOptional({ type: CarDimensionsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CarDimensionsDto)
  dimensions?: CarDimensionsDto;

  @ApiPropertyOptional({ type: [CarColorDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => CarColorDto)
  colors?: CarColorDto[];

  @ApiPropertyOptional({ type: [CarImageDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(60)
  @ValidateNested({ each: true })
  @Type(() => CarImageDto)
  images?: CarImageDto[];

  @ApiPropertyOptional({ type: [CarTranslationDto], description: 'Optional FR/AR/EN overlays for the authored copy' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => CarTranslationDto)
  translations?: CarTranslationDto[];
}
