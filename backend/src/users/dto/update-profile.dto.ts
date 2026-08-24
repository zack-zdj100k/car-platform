import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Locale } from '@prisma/client';
import { trim } from '../../common/transforms';

/**
 * Spec §44 — editable profile fields.
 *
 * Email and role are intentionally absent: changing an email requires
 * re-verification, and role changes are an admin operation.
 */
export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Transform(trim)
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9 ()-]{6,20}$/, { message: 'Enter a valid phone number' })
  phone?: string;

  @ApiPropertyOptional({ description: 'Path or URL of the uploaded profile picture' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  profileImage?: string;

  @ApiPropertyOptional({ enum: Locale })
  @IsOptional()
  @IsEnum(Locale)
  locale?: Locale;
}
