import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';
import { trimLower } from '../../common/transforms';

/** Spec §37 — Sign In form. */
export class LoginDto {
  @ApiProperty()
  @IsEmail({}, { message: 'A valid email address is required' })
  @MaxLength(254)
  @Transform(trimLower)
  email: string;

  @ApiProperty()
  @IsString()
  @MaxLength(128)
  password: string;

  @ApiPropertyOptional({ description: 'Extends the refresh-token lifetime' })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
