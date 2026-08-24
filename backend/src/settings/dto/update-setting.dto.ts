import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsDefined, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateSettingDto {
  @ApiProperty({ description: 'JSON value: string, number, boolean or object' })
  @IsDefined()
  value: unknown;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class SettingEntryDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  key: string;

  @ApiProperty()
  @IsDefined()
  value: unknown;
}

/** Bulk update, so the admin settings form saves in one request. */
export class UpdateSettingsDto {
  @ApiProperty({ type: [SettingEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SettingEntryDto)
  settings: SettingEntryDto[];
}
