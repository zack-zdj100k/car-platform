import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Match } from '../../common/validators/match.decorator';
import { PASSWORD_MESSAGE, PASSWORD_MIN_LENGTH, PASSWORD_PATTERN } from '../../common/validators/password';

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @MaxLength(512)
  token: string;

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
}
