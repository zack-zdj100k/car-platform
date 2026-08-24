import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, MaxLength } from 'class-validator';
import { trimLower } from '../../common/transforms';

export class ForgotPasswordDto {
  @ApiProperty()
  @IsEmail({}, { message: 'A valid email address is required' })
  @MaxLength(254)
  @Transform(trimLower)
  email: string;
}
