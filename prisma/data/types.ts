import type { Prisma } from '@prisma/client';

/**
 * Shape used by the seed catalogue. Every field maps onto a typed Prisma
 * column — nothing is stored as an untyped blob (spec §50).
 */
export type SeedCar = {
  slug: string;
  brand: string;
  model: string;
  year: number;
  generation?: string;
  trim?: string;
  bodyType: Prisma.CarCreateInput['bodyType'];
  segment?: string;
  category?: string;
  doors: number;
  seats: number;
  price: string;
  isFeatured?: boolean;
  marketingDescription: string;
  description: string;
  engine: Omit<Prisma.CarEngineCreateInput, 'car'>;
  wheels: Omit<Prisma.CarWheelsCreateInput, 'car'>;
  exterior: Omit<Prisma.CarExteriorCreateInput, 'car'>;
  interior: Omit<Prisma.CarInteriorCreateInput, 'car'>;
  technology: Omit<Prisma.CarTechnologyCreateInput, 'car'>;
  safety: Omit<Prisma.CarSafetyCreateInput, 'car'>;
  dimensions: Omit<Prisma.CarDimensionsCreateInput, 'car'>;
  colors: { name: string; hexCode: string; finish?: string; isDefault?: boolean }[];
  interiorColors?: { name: string; hexCode: string }[];
};

export type SeedBrand = {
  name: string;
  slug: string;
  country: string;
  description: string;
  isFeatured?: boolean;
};
