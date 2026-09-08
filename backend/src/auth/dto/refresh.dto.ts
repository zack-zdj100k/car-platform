import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefreshDto {
  @ApiPropertyOptional({ description: 'Opaque refresh token fallback when cookie is unavailable' })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
