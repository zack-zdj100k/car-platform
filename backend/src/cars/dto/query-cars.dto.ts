import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min, MaxLength } from 'class-validator';
import { BodyType, Drivetrain, FuelType, Transmission } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { trim, toBoolean, toStringArray } from '../../common/transforms';

/** Sort options offered by the cars listing (spec §11 `?sort=`). */
export enum CarSort {
  NEWEST = 'newest',
  OLDEST = 'oldest',
  PRICE_ASC = 'price-asc',
  PRICE_DESC = 'price-desc',
  YEAR_DESC = 'year-desc',
  YEAR_ASC = 'year-asc',
  POPULAR = 'popular',
}

/** Accepts `?brand=byd&brand=chery` and `?brand=byd,chery` alike. */
/**
 * Search and filter inputs for the Cars page (spec §11, §12, §57).
 * Every filter is backed by a database index — see docs/DATABASE.md.
 */
export class QueryCarsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Free-text search across brand and model (spec §11)' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(trim)
  search?: string;

  @ApiPropertyOptional({ description: 'Brand slug, repeatable or comma-separated', type: [String] })
  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsString({ each: true })
  brand?: string[];

  @ApiPropertyOptional({ description: 'Model name, case-insensitive partial match' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  model?: string;

  @ApiPropertyOptional({ enum: BodyType, isArray: true, description: 'Body type (spec §11 `?type=`)' })
  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsEnum(BodyType, { each: true })
  bodyType?: BodyType[];

  @ApiPropertyOptional({ enum: FuelType, isArray: true })
  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsEnum(FuelType, { each: true })
  fuelType?: FuelType[];

  @ApiPropertyOptional({ enum: Transmission, isArray: true })
  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsEnum(Transmission, { each: true })
  transmission?: Transmission[];

  @ApiPropertyOptional({ enum: Drivetrain, isArray: true })
  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsEnum(Drivetrain, { each: true })
  drivetrain?: Drivetrain[];

  @ApiPropertyOptional({ description: 'Exact model year' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  year?: number;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1900) @Max(2100) yearMin?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1900) @Max(2100) yearMax?: number;

  @ApiPropertyOptional({ description: 'Minimum price, inclusive' })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  priceMin?: number;

  @ApiPropertyOptional({ description: 'Maximum price, inclusive' })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  priceMax?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 9 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(9)
  seats?: number;

  @ApiPropertyOptional({ description: 'Only vehicles flagged as featured' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({ description: 'Only vehicles with a TikTok video' })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  hasVideo?: boolean;

  @ApiPropertyOptional({ enum: CarSort, default: CarSort.NEWEST })
  @IsOptional()
  @IsEnum(CarSort)
  sort: CarSort = CarSort.NEWEST;
}
