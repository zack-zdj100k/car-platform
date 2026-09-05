import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsHexColor,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { ColorKind, Drivetrain, FuelType, ImageKind, Locale, Transmission } from '@prisma/client';

/** Spec §16, §47 — engine & performance */
export class CarEngineDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) engineType?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(20) displacementL?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(20000) displacementCc?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(20) cylinders?: number;
  @ApiPropertyOptional({ enum: FuelType }) @IsEnum(FuelType) fuelType: FuelType;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(3000) powerHp?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(2500) powerKw?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) powerRpm?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(5000) torqueNm?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) torqueRpm?: string;
  @ApiPropertyOptional({ enum: Transmission }) @IsOptional() @IsEnum(Transmission) transmission?: Transmission;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(12) gears?: number;
  @ApiPropertyOptional({ enum: Drivetrain }) @IsOptional() @IsEnum(Drivetrain) drivetrain?: Drivetrain;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(600) topSpeedKph?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(60) acceleration0100?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(60) fuelConsumptionCity?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(60) fuelConsumptionHighway?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(60) fuelConsumptionCombined?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) emissionStandard?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(500) batteryCapacityKwh?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(3000) electricRangeKm?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) chargingAcKw?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(1000) chargingDcKw?: number;
}

/** Spec §17, §47 — wheels & tyres */
export class CarWheelsDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(10) @Max(30) wheelSizeInch?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) wheelType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) wheelDesign?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) frontTyreSize?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) rearTyreSize?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) tyreType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) spareWheel?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) description?: string;
}

/** Spec §18, §47 — exterior */
export class CarExteriorDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) frontGrille?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) headlights?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) daytimeRunningLights?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) frontBumper?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) hoodDesign?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) sideProfile?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) doorDesign?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) sideMirrors?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) wheelArches?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) alloyWheels?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) rearLights?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) rearBumper?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) exhaust?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) roofline?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) roof?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) spoiler?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) bodyLines?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) aerodynamics?: string;
}

/** Spec §19, §47 — interior */
export class CarInteriorDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) dashboard?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) steeringWheel?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) instrumentCluster?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) infotainmentScreen?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) centerConsole?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) gearSelector?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) frontSeats?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) rearSeats?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) seatMaterial?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) interiorColor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) ambientLighting?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) airConditioning?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) storage?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(30) usbPorts?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) soundSystem?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(50) speakerCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) interiorTechnology?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(10000) cargoCapacityL?: number;
}

/** Spec §20, §47 — technology */
export class CarTechnologyDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() touchscreen?: boolean;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(50) touchscreenSizeInch?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() appleCarPlay?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() androidAuto?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() bluetooth?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() navigation?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() digitalInstrumentCluster?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() wirelessCharging?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() keylessEntry?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() pushButtonStart?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() parkingSensors?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() rearCamera?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() camera360?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() adaptiveCruiseControl?: boolean;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  driveModes?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

/** Spec §21, §47 — safety */
export class CarSafetyDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() abs?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() electronicStabilityControl?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() tractionControl?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hillStartAssist?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autonomousEmergencyBraking?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() forwardCollisionWarning?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() laneKeepingAssist?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() blindSpotMonitoring?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() rearCrossTrafficAlert?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() adaptiveCruiseControl?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() parkingAssistance?: boolean;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(20) airbagCount?: number;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  airbagTypes?: string[];
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(5) ncapRating?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

/** Spec §22, §47 — dimensions */
export class CarDimensionsDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(20000) lengthMm?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(5000) widthMm?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(5000) heightMm?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(10000) wheelbaseMm?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(1000) groundClearanceMm?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(10000) bootCapacityL?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(20000) bootCapacityMaxL?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(500) fuelTankL?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(10000) kerbWeightKg?: number;
}

/** Spec §13, §18 — colour swatches */
export class CarColorDto {
  @ApiPropertyOptional({ enum: ColorKind, default: ColorKind.EXTERIOR })
  @IsOptional()
  @IsEnum(ColorKind)
  kind?: ColorKind;

  @IsString() @MaxLength(80) name: string;
  @IsHexColor({ message: 'hexCode must be a valid hex colour, e.g. #2E6E9E' }) hexCode: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) finish?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) imageUrl?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() priceDelta?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder?: number;

  /**
   * How many are on the floor in this colour. Administration only — customers
   * are told whether a colour is available, never how thin it is.
   *
   * Null is meaningful and is the default: "not counted", for a colour that can
   * always be ordered in. Zero means sold out. Sending nothing leaves whatever
   * was there alone.
   */
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  /*
   * Transformed by hand, because `@Type(() => Number)` turns null into 0.
   *
   * That is not a rounding detail: null means "not counted" and 0 means "sold
   * out", and the conversion silently changed every colour saved through the
   * administration into one nobody could book. The catalogue went unavailable
   * without anybody touching a stock field.
   */
  @Transform(({ value }: { value: unknown }) =>
    value === null || value === undefined || value === '' ? null : Number(value),
  )
  @ValidateIf((_object: unknown, value: unknown) => value !== null)
  @IsInt()
  @Min(0)
  @Max(9999)
  stock?: number | null;
}

/** Spec §47 (Media), §63 */
export class CarImageDto {
  @ApiPropertyOptional({ enum: ImageKind, default: ImageKind.GALLERY })
  @IsOptional()
  @IsEnum(ImageKind)
  kind?: ImageKind;

  /**
   * The colour this photograph shows, by name — "Basalt Grey", not an id.
   *
   * By name because ids are not stable across a save: supplying colours
   * replaces them, so every colour is created afresh with a new id and any id
   * the browser was holding is already gone by the time the images are written.
   * The name is the colour's natural key on a car, and it is also the only part
   * of this payload a person can read.
   *
   * Unknown names are ignored rather than rejected: a photograph that cannot be
   * attached to a colour is still a photograph of the car.
   */
  @ApiPropertyOptional({ description: 'Name of the colour this image belongs to' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  colorName?: string;

  @IsString() @MaxLength(500) url: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) alt?: string;

  /**
   * Heading for a photograph that does not belong to a fixed group — "Roof",
   * "Scratch on the rear bumper". Separate from `alt`, which is what a screen
   * reader says in place of the picture.
   */
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) label?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) width?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) height?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder?: number;
}

/**
 * The authored copy of one vehicle, in one other language (spec §7).
 *
 * The car's own columns hold the text as it was written; these are overlays.
 * A field left empty falls back to what is on the car, so an administrator who
 * translates the short description but not the long one gets a page that is
 * translated where it has been translated and readable everywhere else —
 * rather than a blank section.
 */
export class CarTranslationDto {
  @ApiPropertyOptional({ enum: Locale }) @IsEnum(Locale) locale: Locale;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) marketingDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20000) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(5000) exteriorDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(5000) interiorDescription?: string;
}
