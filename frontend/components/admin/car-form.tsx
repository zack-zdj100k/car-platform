'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useAuth } from '@/providers/auth-provider';
import { BrandPicker } from '@/components/admin/brand-picker';
import { useLocale } from '@/providers/locale-provider';
import { carsService } from '@/services/cars.service';
import { ApiError } from '@/services/api-client';
import { ImageUploader, type CarImageDraft } from './image-uploader';
import type { Brand, CarDetail } from '@/types/api';

/**
 * Admin car form (spec §47).
 *
 * Covers every section the specification lists: basic, engine, wheels & tyres,
 * exterior, interior, technology, safety, dimensions and media. Only the
 * identity fields are required, so a vehicle can be saved as a draft and
 * completed later.
 */

const BODY_TYPES = ['SUV','CROSSOVER','SEDAN','HATCHBACK','COUPE','CONVERTIBLE','WAGON','MPV','VAN','PICKUP'] as const;
const FUEL_TYPES = ['PETROL','DIESEL','HYBRID','PLUG_IN_HYBRID','ELECTRIC','LPG','CNG'] as const;
const TRANSMISSIONS = ['MANUAL','AUTOMATIC','CVT','DCT','AMT','SINGLE_SPEED'] as const;
const DRIVETRAINS = ['FWD','RWD','AWD','FOUR_WD'] as const;

type TextField = { key: string; label: string; textarea?: boolean };

const EXTERIOR_FIELDS: TextField[] = [
  { key: 'description', label: 'Exterior description', textarea: true },
  { key: 'frontGrille', label: 'Front grille' },
  { key: 'headlights', label: 'Headlights' },
  { key: 'daytimeRunningLights', label: 'Daytime running lights' },
  { key: 'frontBumper', label: 'Front bumper' },
  { key: 'hoodDesign', label: 'Hood' },
  { key: 'sideProfile', label: 'Side profile' },
  { key: 'doorDesign', label: 'Doors' },
  { key: 'sideMirrors', label: 'Mirrors' },
  { key: 'wheelArches', label: 'Wheel arches' },
  { key: 'alloyWheels', label: 'Alloy wheels' },
  { key: 'rearLights', label: 'Rear lights' },
  { key: 'rearBumper', label: 'Rear bumper' },
  { key: 'exhaust', label: 'Exhaust' },
  { key: 'roofline', label: 'Roofline' },
  { key: 'roof', label: 'Roof' },
  { key: 'spoiler', label: 'Spoiler' },
  { key: 'bodyLines', label: 'Body lines' },
  { key: 'aerodynamics', label: 'Aerodynamics' },
];

const INTERIOR_FIELDS: TextField[] = [
  { key: 'description', label: 'Interior description', textarea: true },
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'steeringWheel', label: 'Steering wheel' },
  { key: 'instrumentCluster', label: 'Instrument cluster' },
  { key: 'infotainmentScreen', label: 'Infotainment' },
  { key: 'centerConsole', label: 'Centre console' },
  { key: 'gearSelector', label: 'Gear selector' },
  { key: 'frontSeats', label: 'Front seats' },
  { key: 'rearSeats', label: 'Rear seats' },
  { key: 'seatMaterial', label: 'Seat material' },
  { key: 'interiorColor', label: 'Interior colour' },
  { key: 'ambientLighting', label: 'Ambient lighting' },
  { key: 'airConditioning', label: 'Air conditioning' },
  { key: 'storage', label: 'Storage' },
  { key: 'soundSystem', label: 'Sound system' },
  { key: 'interiorTechnology', label: 'Interior technology' },
];

const TECH_FLAGS: { key: string; label: string }[] = [
  { key: 'touchscreen', label: 'Touchscreen' },
  { key: 'appleCarPlay', label: 'Apple CarPlay' },
  { key: 'androidAuto', label: 'Android Auto' },
  { key: 'bluetooth', label: 'Bluetooth' },
  { key: 'navigation', label: 'Navigation' },
  { key: 'digitalInstrumentCluster', label: 'Digital cluster' },
  { key: 'wirelessCharging', label: 'Wireless charging' },
  { key: 'keylessEntry', label: 'Keyless entry' },
  { key: 'pushButtonStart', label: 'Push-button start' },
  { key: 'parkingSensors', label: 'Parking sensors' },
  { key: 'rearCamera', label: 'Rear camera' },
  { key: 'camera360', label: '360° camera' },
  { key: 'adaptiveCruiseControl', label: 'Adaptive cruise control' },
];

const SAFETY_FLAGS: { key: string; label: string }[] = [
  { key: 'abs', label: 'ABS' },
  { key: 'electronicStabilityControl', label: 'Stability control' },
  { key: 'tractionControl', label: 'Traction control' },
  { key: 'hillStartAssist', label: 'Hill start assist' },
  { key: 'autonomousEmergencyBraking', label: 'Emergency braking' },
  { key: 'forwardCollisionWarning', label: 'Collision warning' },
  { key: 'laneKeepingAssist', label: 'Lane keeping assist' },
  { key: 'blindSpotMonitoring', label: 'Blind spot monitoring' },
  { key: 'rearCrossTrafficAlert', label: 'Rear cross-traffic alert' },
  { key: 'adaptiveCruiseControl', label: 'Adaptive cruise control' },
  { key: 'parkingAssistance', label: 'Parking assistance' },
];

type Dict = Record<string, unknown>;

/** Strips empty strings so absent fields stay absent rather than becoming "". */
function clean(source: Dict): Dict | undefined {
  const result: Dict = {};
  for (const [key, value] of Object.entries(source)) {
    if (value === '' || value === undefined || value === null) continue;
    result[key] = value;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

const num = (value: unknown) => {
  if (value === '' || value === undefined || value === null) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

/**
 * Field-group renderers.
 *
 * Defined at module scope rather than inside CarForm: a component created
 * during render is a fresh type on every pass, so React would remount every
 * input — losing focus mid-typing.
 */
function TextGrid({
  fields,
  values,
  onChange,
  prefix,
}: {
  fields: TextField[];
  values: Dict;
  onChange: (next: Dict) => void;
  prefix: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => (
        <div key={field.key} className={field.textarea ? 'space-y-2 sm:col-span-2' : 'space-y-2'}>
          <Label htmlFor={`${prefix}-${field.key}`}>{field.label}</Label>
          {field.textarea ? (
            <Textarea
              id={`${prefix}-${field.key}`}
              rows={3}
              value={String(values[field.key] ?? '')}
              onChange={(event) => onChange({ ...values, [field.key]: event.target.value })}
            />
          ) : (
            <Input
              id={`${prefix}-${field.key}`}
              value={String(values[field.key] ?? '')}
              onChange={(event) => onChange({ ...values, [field.key]: event.target.value })}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function FlagGrid({
  flags,
  values,
  onChange,
  prefix,
}: {
  flags: { key: string; label: string }[];
  values: Dict;
  onChange: (next: Dict) => void;
  prefix: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {flags.map((flag) => (
        <div key={flag.key} className="flex items-center gap-2.5">
          <Checkbox
            id={`${prefix}-${flag.key}`}
            checked={Boolean(values[flag.key])}
            onCheckedChange={(checked) => onChange({ ...values, [flag.key]: checked === true })}
          />
          <Label htmlFor={`${prefix}-${flag.key}`} className="cursor-pointer text-sm font-normal">
            {flag.label}
          </Label>
        </div>
      ))}
    </div>
  );
}

function NumberGrid({
  fields,
  values,
  onChange,
  prefix,
}: {
  fields: { key: string; label: string }[];
  values: Dict;
  onChange: (next: Dict) => void;
  prefix: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {fields.map((field) => (
        <div key={field.key} className="space-y-2">
          <Label htmlFor={`${prefix}-${field.key}`}>{field.label}</Label>
          <Input
            id={`${prefix}-${field.key}`}
            type="number"
            step="any"
            value={String(values[field.key] ?? '')}
            onChange={(event) => onChange({ ...values, [field.key]: event.target.value })}
          />
        </div>
      ))}
    </div>
  );
}

export function CarForm({ brands, car }: { brands: Brand[]; car?: CarDetail }) {
  /*
   * The catalogue's marques, held locally so one created from the brand field
   * appears immediately without reloading the form and losing what is typed.
   */
  const [knownBrands, setKnownBrands] = useState<Brand[]>(brands);
  const { token } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const isEdit = Boolean(car);

  const [basic, setBasic] = useState({
    brandId: car?.brand.id ?? '',
    model: car?.model ?? '',
    year: car?.year ? String(car.year) : String(new Date().getFullYear()),
    generation: car?.generation ?? '',
    trim: car?.trim ?? '',
    bodyType: car?.bodyType ?? 'SUV',
    segment: car?.segment ?? '',
    category: car?.category ?? '',
    doors: car?.doors ? String(car.doors) : '',
    seats: car?.seats ? String(car.seats) : '',
    price: car?.price ?? '',
    currency: car?.currency ?? 'USD',
    marketingDescription: car?.marketingDescription ?? '',
    description: car?.description ?? '',
    isFeatured: car?.isFeatured ?? false,
  });

  const [engine, setEngine] = useState<Dict>({
    engineType: car?.engine?.engineType ?? '',
    displacementL: car?.engine?.displacementL ?? '',
    cylinders: car?.engine?.cylinders ?? '',
    fuelType: car?.engine?.fuelType ?? 'PETROL',
    powerHp: car?.engine?.powerHp ?? '',
    torqueNm: car?.engine?.torqueNm ?? '',
    transmission: car?.engine?.transmission ?? '',
    gears: car?.engine?.gears ?? '',
    drivetrain: car?.engine?.drivetrain ?? '',
    topSpeedKph: car?.engine?.topSpeedKph ?? '',
    acceleration0100: car?.engine?.acceleration0100 ?? '',
    fuelConsumptionCombined: car?.engine?.fuelConsumptionCombined ?? '',
    batteryCapacityKwh: car?.engine?.batteryCapacityKwh ?? '',
    electricRangeKm: car?.engine?.electricRangeKm ?? '',
  });

  const [wheels, setWheels] = useState<Dict>({
    wheelSizeInch: car?.wheels?.wheelSizeInch ?? '',
    wheelType: car?.wheels?.wheelType ?? '',
    wheelDesign: car?.wheels?.wheelDesign ?? '',
    frontTyreSize: car?.wheels?.frontTyreSize ?? '',
    rearTyreSize: car?.wheels?.rearTyreSize ?? '',
    tyreType: car?.wheels?.tyreType ?? '',
  });

  const [exterior, setExterior] = useState<Dict>(
    Object.fromEntries(
      EXTERIOR_FIELDS.map((field) => [
        field.key,
        (car?.exterior as Dict | null | undefined)?.[field.key] ?? '',
      ]),
    ),
  );

  const [interior, setInterior] = useState<Dict>(
    Object.fromEntries(
      INTERIOR_FIELDS.map((field) => [
        field.key,
        (car?.interior as Dict | null | undefined)?.[field.key] ?? '',
      ]),
    ),
  );

  const [technology, setTechnology] = useState<Dict>({
    ...Object.fromEntries(
      TECH_FLAGS.map((flag) => [flag.key, Boolean((car?.technology as Dict | null | undefined)?.[flag.key])]),
    ),
    touchscreenSizeInch: car?.technology?.touchscreenSizeInch ?? '',
    driveModes: car?.technology?.driveModes.join(', ') ?? '',
  });

  const [safety, setSafety] = useState<Dict>({
    ...Object.fromEntries(
      SAFETY_FLAGS.map((flag) => [flag.key, Boolean((car?.safety as Dict | null | undefined)?.[flag.key])]),
    ),
    airbagCount: car?.safety?.airbagCount ?? '',
    airbagTypes: car?.safety?.airbagTypes.join(', ') ?? '',
    ncapRating: car?.safety?.ncapRating ?? '',
  });

  const [dimensions, setDimensions] = useState<Dict>({
    lengthMm: car?.dimensions?.lengthMm ?? '',
    widthMm: car?.dimensions?.widthMm ?? '',
    heightMm: car?.dimensions?.heightMm ?? '',
    wheelbaseMm: car?.dimensions?.wheelbaseMm ?? '',
    groundClearanceMm: car?.dimensions?.groundClearanceMm ?? '',
    bootCapacityL: car?.dimensions?.bootCapacityL ?? '',
    fuelTankL: car?.dimensions?.fuelTankL ?? '',
    kerbWeightKg: car?.dimensions?.kerbWeightKg ?? '',
  });

  const [colors, setColors] = useState(
    car?.colors
      .filter((color) => color.kind === 'EXTERIOR')
      .map((color) => ({ name: color.name, hexCode: color.hexCode, finish: color.finish ?? '' })) ?? [
      { name: '', hexCode: '#000000', finish: '' },
    ],
  );

  const [images, setImages] = useState<CarImageDraft[]>(
    car?.images.map((image) => ({
      kind: image.kind,
      url: image.url,
      alt: image.alt ?? '',
      // Existing uploads can be deleted from disk; bundled placeholders cannot.
      filename: image.url.startsWith('/uploads/') ? image.url.replace('/uploads/', '') : undefined,
    })) ?? [],
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!basic.brandId || !basic.model || !basic.price) {
      setError('Brand, model and price are required.');
      return;
    }

    const payload = {
      brandId: basic.brandId,
      model: basic.model,
      year: Number(basic.year),
      generation: basic.generation || undefined,
      trim: basic.trim || undefined,
      bodyType: basic.bodyType,
      segment: basic.segment || undefined,
      category: basic.category || undefined,
      doors: num(basic.doors),
      seats: num(basic.seats),
      price: Number(basic.price),
      currency: basic.currency || undefined,
      marketingDescription: basic.marketingDescription || undefined,
      description: basic.description || undefined,
      isFeatured: basic.isFeatured,
      engine: clean({
        ...engine,
        displacementL: num(engine.displacementL),
        cylinders: num(engine.cylinders),
        powerHp: num(engine.powerHp),
        torqueNm: num(engine.torqueNm),
        gears: num(engine.gears),
        topSpeedKph: num(engine.topSpeedKph),
        acceleration0100: num(engine.acceleration0100),
        fuelConsumptionCombined: num(engine.fuelConsumptionCombined),
        batteryCapacityKwh: num(engine.batteryCapacityKwh),
        electricRangeKm: num(engine.electricRangeKm),
      }),
      wheels: clean({ ...wheels, wheelSizeInch: num(wheels.wheelSizeInch) }),
      exterior: clean(exterior),
      interior: clean(interior),
      technology: clean({
        ...technology,
        touchscreenSizeInch: num(technology.touchscreenSizeInch),
        driveModes: String(technology.driveModes ?? '')
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean),
      }),
      safety: clean({
        ...safety,
        airbagCount: num(safety.airbagCount),
        ncapRating: num(safety.ncapRating),
        airbagTypes: String(safety.airbagTypes ?? '')
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean),
      }),
      dimensions: clean({
        lengthMm: num(dimensions.lengthMm),
        widthMm: num(dimensions.widthMm),
        heightMm: num(dimensions.heightMm),
        wheelbaseMm: num(dimensions.wheelbaseMm),
        groundClearanceMm: num(dimensions.groundClearanceMm),
        bootCapacityL: num(dimensions.bootCapacityL),
        fuelTankL: num(dimensions.fuelTankL),
        kerbWeightKg: num(dimensions.kerbWeightKg),
      }),
      colors: colors
        .filter((color) => color.name && color.hexCode)
        .map((color, index) => ({
          name: color.name,
          hexCode: color.hexCode,
          finish: color.finish || undefined,
          isDefault: index === 0,
          sortOrder: index,
        })),
      images: images
        .filter((image) => image.url)
        .map((image, index) => ({
          kind: image.kind,
          url: image.url,
          alt: image.alt || undefined,
          sortOrder: index,
        })),
    };

    setSaving(true);
    try {
      const saved = isEdit
        ? await carsService.update(car!.id, payload, { token })
        : await carsService.create(payload, { token });
      toast.success(isEdit ? t.admin.editCar : t.admin.addCar);
      router.push(`/admin/cars/${saved.id}/edit`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t.common.error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-6" noValidate>
      {error && (
        <p role="alert" className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm">
          {error}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basic</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="brandId">{t.cars.brand} *</Label>
            <BrandPicker
              id="brandId"
              brands={knownBrands}
              value={basic.brandId}
              onChange={(brandId) => setBasic({ ...basic, brandId })}
              onCreated={(brand) =>
                setKnownBrands((current) =>
                  [...current, brand].sort((a, b) => a.name.localeCompare(b.name)),
                )
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">{t.cars.model} *</Label>
            <Input id="model" required value={basic.model} onChange={(event) => setBasic({ ...basic, model: event.target.value })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="year">{t.cars.year} *</Label>
            <Input id="year" type="number" required value={basic.year} onChange={(event) => setBasic({ ...basic, year: event.target.value })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bodyType">{t.cars.bodyType} *</Label>
            <Select value={basic.bodyType} onValueChange={(value) => setBasic({ ...basic, bodyType: value as typeof basic.bodyType })}>
              <SelectTrigger id="bodyType" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BODY_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="generation">Generation</Label>
            <Input id="generation" value={basic.generation} onChange={(event) => setBasic({ ...basic, generation: event.target.value })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="trim">Trim</Label>
            <Input id="trim" value={basic.trim} onChange={(event) => setBasic({ ...basic, trim: event.target.value })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="segment">Segment</Label>
            <Input id="segment" value={basic.segment} onChange={(event) => setBasic({ ...basic, segment: event.target.value })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input id="category" value={basic.category} onChange={(event) => setBasic({ ...basic, category: event.target.value })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="doors">Doors</Label>
            <Input id="doors" type="number" value={basic.doors} onChange={(event) => setBasic({ ...basic, doors: event.target.value })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="seats">Seats</Label>
            <Input id="seats" type="number" value={basic.seats} onChange={(event) => setBasic({ ...basic, seats: event.target.value })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Price *</Label>
            <Input id="price" type="number" step="0.01" required value={String(basic.price)} onChange={(event) => setBasic({ ...basic, price: event.target.value })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Input id="currency" maxLength={3} value={basic.currency} onChange={(event) => setBasic({ ...basic, currency: event.target.value.toUpperCase() })} />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="marketingDescription">Short description</Label>
            <Textarea id="marketingDescription" rows={2} value={basic.marketingDescription} onChange={(event) => setBasic({ ...basic, marketingDescription: event.target.value })} />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">Full description</Label>
            <Textarea id="description" rows={6} value={basic.description} onChange={(event) => setBasic({ ...basic, description: event.target.value })} />
          </div>

          <div className="flex items-center gap-2.5 sm:col-span-2">
            <Checkbox id="isFeatured" checked={basic.isFeatured} onCheckedChange={(checked) => setBasic({ ...basic, isFeatured: checked === true })} />
            <Label htmlFor="isFeatured" className="cursor-pointer font-normal">
              {t.home.featuredTitle}
            </Label>
          </div>
        </CardContent>
      </Card>

      <Accordion type="multiple" className="space-y-3">
        <AccordionItem value="engine" className="border-border rounded-xl border px-4">
          <AccordionTrigger className="text-base font-medium">{t.car.engine}</AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="engineType">Engine type</Label>
                <Input id="engineType" value={String(engine.engineType ?? '')} onChange={(event) => setEngine({ ...engine, engineType: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fuelType">{t.cars.fuelType}</Label>
                <Select value={String(engine.fuelType ?? 'PETROL')} onValueChange={(value) => setEngine({ ...engine, fuelType: value })}>
                  <SelectTrigger id="fuelType" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FUEL_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="transmission">Transmission</Label>
                <Select value={String(engine.transmission ?? '')} onValueChange={(value) => setEngine({ ...engine, transmission: value })}>
                  <SelectTrigger id="transmission" className="w-full">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSMISSIONS.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="drivetrain">Drivetrain</Label>
                <Select value={String(engine.drivetrain ?? '')} onValueChange={(value) => setEngine({ ...engine, drivetrain: value })}>
                  <SelectTrigger id="drivetrain" className="w-full">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {DRIVETRAINS.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <NumberGrid
              prefix="engine"
              values={engine}
              onChange={setEngine}
              fields={[
                { key: 'displacementL', label: 'Displacement (L)' },
                { key: 'cylinders', label: 'Cylinders' },
                { key: 'powerHp', label: 'Power (hp)' },
                { key: 'torqueNm', label: 'Torque (Nm)' },
                { key: 'gears', label: 'Gears' },
                { key: 'topSpeedKph', label: 'Top speed (km/h)' },
                { key: 'acceleration0100', label: '0–100 (s)' },
                { key: 'fuelConsumptionCombined', label: 'Consumption (L/100km)' },
                { key: 'batteryCapacityKwh', label: 'Battery (kWh)' },
                { key: 'electricRangeKm', label: 'Range (km)' },
              ]}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="wheels" className="border-border rounded-xl border px-4">
          <AccordionTrigger className="text-base font-medium">{t.car.wheels}</AccordionTrigger>
          <AccordionContent className="pb-4">
            <TextGrid
              prefix="wheels"
              values={wheels}
              onChange={setWheels}
              fields={[
                { key: 'wheelSizeInch', label: 'Wheel size (inch)' },
                { key: 'wheelType', label: 'Wheel type' },
                { key: 'wheelDesign', label: 'Wheel design' },
                { key: 'frontTyreSize', label: 'Front tyre size' },
                { key: 'rearTyreSize', label: 'Rear tyre size' },
                { key: 'tyreType', label: 'Tyre type' },
              ]}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="exterior" className="border-border rounded-xl border px-4">
          <AccordionTrigger className="text-base font-medium">{t.car.exterior}</AccordionTrigger>
          <AccordionContent className="pb-4">
            <TextGrid prefix="ext" fields={EXTERIOR_FIELDS} values={exterior} onChange={setExterior} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="interior" className="border-border rounded-xl border px-4">
          <AccordionTrigger className="text-base font-medium">{t.car.interior}</AccordionTrigger>
          <AccordionContent className="pb-4">
            <TextGrid prefix="int" fields={INTERIOR_FIELDS} values={interior} onChange={setInterior} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="technology" className="border-border rounded-xl border px-4">
          <AccordionTrigger className="text-base font-medium">{t.car.technology}</AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <FlagGrid prefix="tech" flags={TECH_FLAGS} values={technology} onChange={setTechnology} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="touchscreenSizeInch">Touchscreen size (inch)</Label>
                <Input
                  id="touchscreenSizeInch"
                  type="number"
                  step="any"
                  value={String(technology.touchscreenSizeInch ?? '')}
                  onChange={(event) => setTechnology({ ...technology, touchscreenSizeInch: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="driveModes">Drive modes (comma separated)</Label>
                <Input
                  id="driveModes"
                  value={String(technology.driveModes ?? '')}
                  onChange={(event) => setTechnology({ ...technology, driveModes: event.target.value })}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="safety" className="border-border rounded-xl border px-4">
          <AccordionTrigger className="text-base font-medium">{t.car.safety}</AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <FlagGrid prefix="safety" flags={SAFETY_FLAGS} values={safety} onChange={setSafety} />
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="airbagCount">Airbags</Label>
                <Input id="airbagCount" type="number" value={String(safety.airbagCount ?? '')} onChange={(event) => setSafety({ ...safety, airbagCount: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="airbagTypes">Airbag types (comma separated)</Label>
                <Input id="airbagTypes" value={String(safety.airbagTypes ?? '')} onChange={(event) => setSafety({ ...safety, airbagTypes: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ncapRating">NCAP rating</Label>
                <Input id="ncapRating" type="number" min={0} max={5} value={String(safety.ncapRating ?? '')} onChange={(event) => setSafety({ ...safety, ncapRating: event.target.value })} />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="dimensions" className="border-border rounded-xl border px-4">
          <AccordionTrigger className="text-base font-medium">{t.car.dimensions}</AccordionTrigger>
          <AccordionContent className="pb-4">
            <NumberGrid
              prefix="dim"
              values={dimensions}
              onChange={setDimensions}
              fields={[
                { key: 'lengthMm', label: 'Length (mm)' },
                { key: 'widthMm', label: 'Width (mm)' },
                { key: 'heightMm', label: 'Height (mm)' },
                { key: 'wheelbaseMm', label: 'Wheelbase (mm)' },
                { key: 'groundClearanceMm', label: 'Ground clearance (mm)' },
                { key: 'bootCapacityL', label: 'Boot (L)' },
                { key: 'fuelTankL', label: 'Fuel tank (L)' },
                { key: 'kerbWeightKg', label: 'Kerb weight (kg)' },
              ]}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="media" className="border-border rounded-xl border px-4">
          <AccordionTrigger className="text-base font-medium">Photos & colours</AccordionTrigger>
          <AccordionContent className="space-y-6 pb-4">
            <div className="space-y-3">
              <h3 className="text-sm font-medium">{t.car.exteriorColours}</h3>
              {colors.map((color, index) => (
                <div key={index} className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor={`color-name-${index}`}>Name</Label>
                    <Input
                      id={`color-name-${index}`}
                      value={color.name}
                      onChange={(event) =>
                        setColors(colors.map((entry, i) => (i === index ? { ...entry, name: event.target.value } : entry)))
                      }
                    />
                  </div>
                  <div className="w-28 space-y-2">
                    <Label htmlFor={`color-hex-${index}`}>Hex</Label>
                    <Input
                      id={`color-hex-${index}`}
                      type="color"
                      value={color.hexCode}
                      onChange={(event) =>
                        setColors(colors.map((entry, i) => (i === index ? { ...entry, hexCode: event.target.value } : entry)))
                      }
                      className="h-9 p-1"
                    />
                  </div>
                  <div className="w-32 space-y-2">
                    <Label htmlFor={`color-finish-${index}`}>Finish</Label>
                    <Input
                      id={`color-finish-${index}`}
                      value={color.finish}
                      onChange={(event) =>
                        setColors(colors.map((entry, i) => (i === index ? { ...entry, finish: event.target.value } : entry)))
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={t.admin.delete}
                    onClick={() => setColors(colors.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setColors([...colors, { name: '', hexCode: '#000000', finish: '' }])}
              >
                <Plus className="size-4" aria-hidden="true" />
                Add colour
              </Button>
            </div>

            <Separator />

            <div className="space-y-3">
              <h3 className="text-sm font-medium">Photos</h3>
              <p className="text-muted-foreground text-xs">
                Upload real photographs of the vehicle. The main photo is what appears on the
                listing card and in search results.
              </p>
              <ImageUploader images={images} onChange={setImages} />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="flex gap-3">
        <Button type="submit" size="lg" disabled={saving}>
          {saving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {t.common.save}
        </Button>
        <Button type="button" variant="outline" size="lg" onClick={() => router.push('/admin/cars')}>
          {t.common.cancel}
        </Button>
      </div>
    </form>
  );
}
