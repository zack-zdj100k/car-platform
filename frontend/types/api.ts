/** Response types mirroring the backend contract (spec §58 — typed responses). */

export type Role = 'CUSTOMER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED';
export type CarStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type OrderStatus = 'PENDING' | 'CONTACTED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
export type BodyType =
  | 'SUV' | 'CROSSOVER' | 'SEDAN' | 'HATCHBACK' | 'COUPE'
  | 'CONVERTIBLE' | 'WAGON' | 'MPV' | 'VAN' | 'PICKUP';
export type FuelType = 'PETROL' | 'DIESEL' | 'HYBRID' | 'PLUG_IN_HYBRID' | 'ELECTRIC' | 'LPG' | 'CNG';
export type Transmission = 'MANUAL' | 'AUTOMATIC' | 'CVT' | 'DCT' | 'AMT' | 'SINGLE_SPEED';
export type Drivetrain = 'FWD' | 'RWD' | 'AWD' | 'FOUR_WD';
export type ColorKind = 'EXTERIOR' | 'INTERIOR';
export type ImageKind =
  | 'MAIN'
  | 'GALLERY'
  | 'EXTERIOR'
  | 'INTERIOR'
  | 'WHEEL'
  | 'ENGINE'
  | 'TRUNK'
  | 'OTHER'
  | 'SPIN';

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
  code?: string;
  path: string;
  timestamp: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  logoUrl: string | null;
  description: string | null;
  isFeatured: boolean;
  publishedCars?: number;
}

export interface CarImage {
  id?: string;
  kind: ImageKind;
  url: string;
  alt: string | null;
  /** Heading for an OTHER photograph — what the admin called this slot. */
  label?: string | null;
  width?: number | null;
  height?: number | null;
  sortOrder?: number;
  colorId?: string | null;
}

export interface CarColor {
  id: string;
  kind: ColorKind;
  name: string;
  hexCode: string;
  finish: string | null;
  imageUrl?: string | null;
  isDefault: boolean;
  sortOrder?: number;
  /**
   * Whether this colour can still be booked.
   *
   * The API sends this instead of the count on every public route — a customer
   * is told what is available, not how thin it is. The administration's own
   * routes send `stock` as well, which is where the number belongs.
   */
  isAvailable?: boolean;
  /** Administration only: how many are on the floor. Null means "not counted". */
  stock?: number | null;
}

export interface CarEngine {
  engineType: string | null;
  displacementL: string | null;
  displacementCc: number | null;
  cylinders: number | null;
  fuelType: FuelType;
  powerHp: number | null;
  powerKw: number | null;
  powerRpm: string | null;
  torqueNm: number | null;
  torqueRpm: string | null;
  transmission: Transmission | null;
  gears: number | null;
  drivetrain: Drivetrain | null;
  topSpeedKph: number | null;
  acceleration0100: string | null;
  fuelConsumptionCity: string | null;
  fuelConsumptionHighway: string | null;
  fuelConsumptionCombined: string | null;
  emissionStandard: string | null;
  batteryCapacityKwh: string | null;
  electricRangeKm: number | null;
  chargingAcKw: string | null;
  chargingDcKw: string | null;
}

export interface CarWheels {
  wheelSizeInch: number | null;
  wheelType: string | null;
  wheelDesign: string | null;
  frontTyreSize: string | null;
  rearTyreSize: string | null;
  tyreType: string | null;
  spareWheel: string | null;
  description: string | null;
}

export interface CarExterior {
  description: string | null;
  frontGrille: string | null;
  headlights: string | null;
  daytimeRunningLights: string | null;
  frontBumper: string | null;
  hoodDesign: string | null;
  sideProfile: string | null;
  doorDesign: string | null;
  sideMirrors: string | null;
  wheelArches: string | null;
  alloyWheels: string | null;
  rearLights: string | null;
  rearBumper: string | null;
  exhaust: string | null;
  roofline: string | null;
  roof: string | null;
  spoiler: string | null;
  bodyLines: string | null;
  aerodynamics: string | null;
}

export interface CarInterior {
  description: string | null;
  dashboard: string | null;
  steeringWheel: string | null;
  instrumentCluster: string | null;
  infotainmentScreen: string | null;
  centerConsole: string | null;
  gearSelector: string | null;
  frontSeats: string | null;
  rearSeats: string | null;
  seatMaterial: string | null;
  interiorColor: string | null;
  ambientLighting: string | null;
  airConditioning: string | null;
  storage: string | null;
  usbPorts: number | null;
  soundSystem: string | null;
  speakerCount: number | null;
  interiorTechnology: string | null;
  cargoCapacityL: number | null;
}

export interface CarTechnology {
  touchscreen: boolean;
  touchscreenSizeInch: string | null;
  appleCarPlay: boolean;
  androidAuto: boolean;
  bluetooth: boolean;
  navigation: boolean;
  digitalInstrumentCluster: boolean;
  wirelessCharging: boolean;
  keylessEntry: boolean;
  pushButtonStart: boolean;
  parkingSensors: boolean;
  rearCamera: boolean;
  camera360: boolean;
  adaptiveCruiseControl: boolean;
  driveModes: string[];
  notes: string | null;
}

export interface CarSafety {
  abs: boolean;
  electronicStabilityControl: boolean;
  tractionControl: boolean;
  hillStartAssist: boolean;
  autonomousEmergencyBraking: boolean;
  forwardCollisionWarning: boolean;
  laneKeepingAssist: boolean;
  blindSpotMonitoring: boolean;
  rearCrossTrafficAlert: boolean;
  adaptiveCruiseControl: boolean;
  parkingAssistance: boolean;
  airbagCount: number | null;
  airbagTypes: string[];
  ncapRating: number | null;
  notes: string | null;
}

export interface CarDimensions {
  lengthMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
  wheelbaseMm: number | null;
  groundClearanceMm: number | null;
  bootCapacityL: number | null;
  bootCapacityMaxL: number | null;
  fuelTankL: string | null;
  kerbWeightKg: number | null;
}

/** Listing shape returned by GET /cars. */
export interface CarListItem {
  /**
   * Whether any colour of this vehicle can still be booked.
   *
   * False only when every counted colour is sold out — and a vehicle in that
   * state stays in the catalogue, readable and photographed, with no way to
   * book it. Hiding it would throw away the page somebody found last week over
   * a stock level that changes on Monday.
   */
  isAvailable?: boolean;
  id: string;
  slug: string;
  model: string;
  year: number;
  trim: string | null;
  bodyType: BodyType;
  price: string;
  currency: string;
  marketingDescription: string | null;
  /** Set when this vehicle has a TikTok clip; the card links to it. */
  videoUrl?: string | null;
  /** Promotional price while a promotion runs; `price` is then struck through. */
  promoPrice?: string | null;
  isFeatured: boolean;
  isDemoData: boolean;
  status: CarStatus;
  createdAt: string;
  publishedAt: string | null;
  brand: Pick<Brand, 'id' | 'name' | 'slug' | 'logoUrl'>;
  engine: Pick<CarEngine, 'fuelType' | 'transmission' | 'drivetrain' | 'powerHp' | 'displacementL'> | null;
  images: Pick<CarImage, 'url' | 'alt'>[];
  // `imageUrl` lets the card swap its photograph when a colour is chosen.
  colors: Pick<CarColor, 'id' | 'name' | 'hexCode' | 'finish' | 'isDefault' | 'imageUrl' | 'isAvailable'>[];
  _count?: { favorites: number };
}

/** Full detail returned by GET /cars/:idOrSlug. */
export interface CarDetail {
  /**
   * Whether any colour of this vehicle can still be booked.
   *
   * False only when every counted colour is sold out — and a vehicle in that
   * state stays in the catalogue, readable and photographed, with no way to
   * book it. Hiding it would throw away the page somebody found last week over
   * a stock level that changes on Monday.
   */
  isAvailable?: boolean;
  id: string;
  slug: string;
  model: string;
  year: number;
  generation: string | null;
  trim: string | null;
  bodyType: BodyType;
  segment: string | null;
  category: string | null;
  doors: number | null;
  seats: number | null;
  price: string;
  currency: string;
  marketingDescription: string | null;
  description: string | null;
  /** Link to this vehicle's TikTok video, when one has been recorded. */
  videoUrl: string | null;
  /** Promotional price while a promotion runs; `price` is then struck through. */
  promoPrice: string | null;
  status: CarStatus;
  isFeatured: boolean;
  isDemoData: boolean;
  publishedAt: string | null;
  createdAt: string;
  brand: Brand;
  engine: CarEngine | null;
  wheels: CarWheels | null;
  exterior: CarExterior | null;
  interior: CarInterior | null;
  technology: CarTechnology | null;
  safety: CarSafety | null;
  dimensions: CarDimensions | null;
  colors: CarColor[];
  images: CarImage[];
  translations: { locale: 'EN' | 'FR' | 'AR'; marketingDescription: string | null; description: string | null }[];
  _count?: { favorites: number; views: number };
}

export interface CarFacets {
  brands: (Pick<Brand, 'id' | 'name' | 'slug' | 'logoUrl' | 'country'> & { count: number })[];
  models: { model: string; brandSlug: string }[];
  bodyTypes: { value: BodyType; count: number }[];
  fuelTypes: { value: FuelType; count: number }[];
  price: { min: string | number; max: string | number };
  year: { min: number; max: number };
}

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: Role;
  profileImage: string | null;
  createdAt: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  expiresIn: number;
}

export interface UserProfile extends AuthUser {
  status: UserStatus;
  locale: 'EN' | 'FR' | 'AR';
  emailVerified: boolean;
  updatedAt: string;
  lastLoginAt: string | null;
  counts: { favorites: number; recentlyViewed: number; comparisons: number; orders: number };
  hasPassword: boolean;
}

export interface AdminUser extends AuthUser {
  status: UserStatus;
  locale: 'EN' | 'FR' | 'AR';
  emailVerified: boolean;
  lastLoginAt: string | null;
  updatedAt: string;
  _count?: { favorites: number; orders: number };
}

export interface FavoriteEntry {
  id: string;
  createdAt: string;
  car: CarListItem & { engine: CarEngine | null };
}

export interface RecentEntry {
  id: string;
  viewedAt: string;
  car: CarListItem;
}

export interface ComparisonCarEntry {
  id: string;
  carId: string;
  sortOrder: number;
  car: CarListItem & {
    engine: CarEngine | null;
    wheels: CarWheels | null;
    dimensions: CarDimensions | null;
    interior: CarInterior | null;
    technology: CarTechnology | null;
    safety: CarSafety | null;
    doors: number | null;
    seats: number | null;
    segment: string | null;
  };
}

export interface Comparison {
  id: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
  cars: ComparisonCarEntry[];
}

export interface OrderSummary {
  id: string;
  reference: string;
  status: OrderStatus;
  selectedColorName: string | null;
  createdAt: string;
  updatedAt: string;
  car: Pick<CarListItem, 'id' | 'slug' | 'model' | 'year' | 'price' | 'currency' | 'brand' | 'images'>;
}

/**
 * A row from the admin order list.
 *
 * Deliberately separate from OrderDetail: the list query does not load status
 * history, and typing it as the fuller shape caused a crash when the dialog
 * read `statusHistory.length` on a value that was never sent.
 */
export interface AdminOrderRow extends OrderSummary {
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  message: string | null;
  adminNote: string | null;
  userId: string | null;
  user: { id: string; fullName: string; email: string } | null;
}

export interface OrderDetail extends OrderSummary {
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  message: string | null;
  adminNote: string | null;
  userId: string | null;
  user: { id: string; fullName: string; email: string } | null;
  statusHistory: {
    id: string;
    fromStatus: OrderStatus | null;
    toStatus: OrderStatus;
    note: string | null;
    createdAt: string;
    changedBy: { id: string; fullName: string } | null;
  }[];
}

export interface DashboardOverview {
  user: { id: string; fullName: string; email: string; profileImage: string | null; createdAt: string };
  summary: {
    favorites: number;
    recentlyViewed: number;
    savedComparisons: number;
    orders: number;
    pendingOrders: number;
  };
  recentlyViewed: { viewedAt: string; car: CarListItem }[];
  favorites: { createdAt: string; car: CarListItem }[];
}

export interface AnalyticsRanked {
  car: Pick<CarListItem, 'id' | 'slug' | 'model' | 'year' | 'price' | 'currency' | 'status' | 'brand' | 'images'>;
  count: number;
}

export interface AnalyticsDashboard {
  overview: {
    cars: { total: number; published: number; draft: number; archived: number; demo: number };
    users: { total: number; newLast30Days: number };
    favorites: { total: number };
    orders: { total: number; pending: number };
    views: { total: number; last30Days: number };
    /** Distinct people, not page hits. See the analytics service. */
    visitors: { total: number; last30Days: number };
    brands: { total: number };
    generatedAt: string;
  };
  mostViewed: AnalyticsRanked[];
  mostFavorited: AnalyticsRanked[];
  growth: {
    rangeDays: number;
    users: { date: string; count: number }[];
    cars: { date: string; count: number }[];
    orders: { date: string; count: number }[];
    views: { date: string; count: number }[];
    visitors: { date: string; count: number }[];
  };
  orderBreakdown: { status: OrderStatus; count: number }[];
  catalogue: {
    byBrand: { brand: string; count: number }[];
    byBodyType: { bodyType: BodyType; count: number }[];
    byFuelType: { fuelType: FuelType; count: number }[];
  };
}

export interface Setting {
  key: string;
  value: unknown;
  group: string;
  isPublic: boolean;
  description: string | null;
  updatedAt: string;
  updatedBy?: { id: string; fullName: string } | null;
}

export type PublicSettings = Record<string, Record<string, unknown>>;

export interface MarketingStat {
  label: string;
  caption: string;
}
