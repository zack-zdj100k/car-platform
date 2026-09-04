import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

/**
 * Where a confirmed customer is being asked to come.
 *
 * Separate from the status change on purpose. Confirming an appointment and
 * knowing which address to send somebody to are not the same moment: the first
 * happens on the telephone, the second when the owner has decided which of
 * their places the car will be at. Folding the address into the status route
 * would mean either typing it in a hurry or losing it on the next status edit.
 */
export class SetMeetingPlaceDto {
  @ApiPropertyOptional({ description: 'The address the customer should come to' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  meetingAddress?: string;

  @ApiPropertyOptional({ description: "A link to the seller's own map pin" })
  @IsOptional()
  @IsString()
  @MaxLength(600)
  // Not a strict URL check on an empty string: clearing the field is a normal
  // thing to want, and an empty value is how it is done.
  @IsUrl({ require_protocol: true }, { message: 'The map link must be a full https:// address' })
  meetingMapUrl?: string;

  @ApiPropertyOptional({ description: 'A time, a floor, who to ask for' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  meetingNote?: string;
}
