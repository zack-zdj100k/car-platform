import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { trim, trimLower } from '../../common/transforms';

/**
 * Order form (spec §24). This is a request/enquiry, not a payment: there are
 * deliberately no payment fields.
 */
export class CreateOrderDto {
  @ApiProperty({ description: 'Car id or slug' })
  @IsString()
  @MinLength(1)
  carId: string;

  @ApiProperty({ example: 'Amina Belkacem' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Transform(trim)
  buyerName: string;

  @ApiProperty()
  @IsEmail({}, { message: 'A valid email address is required' })
  @MaxLength(254)
  @Transform(trimLower)
  buyerEmail: string;

  @ApiProperty({ example: '+213600000000' })
  @IsString()
  @Matches(/^\+?[0-9 ()-]{6,20}$/, { message: 'Enter a valid phone number' })
  buyerPhone: string;

  @ApiPropertyOptional({ description: 'Chosen colour id from the car detail page' })
  @IsOptional()
  @IsString()
  selectedColorId?: string;

  @ApiPropertyOptional({ description: 'Optional message from the customer' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}
