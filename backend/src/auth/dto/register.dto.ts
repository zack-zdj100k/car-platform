import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { Equals, IsBoolean, IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Match } from '../../common/validators/match.decorator';
import { PASSWORD_MESSAGE, PASSWORD_MIN_LENGTH, PASSWORD_PATTERN } from '../../common/validators/password';
import { trim, trimLower } from '../../common/transforms';

/** Spec §36 — Sign Up form. */
export class RegisterDto {
  @ApiProperty({ example: 'Amina Belkacem' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Transform(trim)
  fullName: string;

  @ApiProperty({ example: 'amina@example.com' })
  @IsEmail({}, { message: 'A valid email address is required' })
  @MaxLength(254)
  @Transform(trimLower)
  email: string;

  @ApiProperty({ minLength: PASSWORD_MIN_LENGTH })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, { message: PASSWORD_MESSAGE })
  @MaxLength(128)
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_MESSAGE })
  password: string;

  @ApiProperty()
  @IsString()
  @Match('password', { message: 'Passwords do not match' })
  confirmPassword: string;

  @ApiPropertyOptional({ example: '+213600000000' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9 ()-]{6,20}$/, { message: 'Enter a valid phone number' })
  phone?: string;

  @ApiProperty({ description: 'Must be true — spec §36 requires accepting the terms' })
  @IsBoolean()
  @Equals(true, { message: 'You must accept the Terms & Conditions' })
  acceptTerms: boolean;
}
