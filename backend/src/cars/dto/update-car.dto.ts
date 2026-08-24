import { PartialType } from '@nestjs/swagger';
import { CreateCarDto } from './create-car.dto';

/**
 * Every field optional. Supplying `colors` or `images` replaces that collection
 * wholesale; omitting them leaves the existing rows untouched.
 */
export class UpdateCarDto extends PartialType(CreateCarDto) {}
