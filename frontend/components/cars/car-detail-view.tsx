'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { notify } from '@/lib/notify';
import { Heart, Play, Scale, ShoppingCart } from 'lucide-react';
import { BackLink } from '@/components/shared/back-link';
import { Badge } from '@/components/ui/badge';
import { Price } from '@/components/shared/price';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CarGallery } from './car-gallery';
import { spinFrames } from '@/lib/spin';
import { StickyOrderBar } from './sticky-order-bar';
import { SpecTable, type SpecRow } from './spec-table';
import { DemoBadge } from '@/components/shared/demo-badge';
import { useLocale } from '@/providers/locale-provider';
import { useAuth } from '@/providers/auth-provider';
import { useFavorites } from '@/hooks/use-favorites';
import { useCompare } from '@/hooks/use-compare';
import { formatAcronym, formatMeasure, humaniseEnum } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { CarDetail } from '@/types/api';

/**
 * Car detail page (spec §13–§23).
 *
 * Every specification group is rendered from the database only. Fields the
 * record does not contain are omitted rather than filled in (spec §14).
 */
export function CarDetailView({ car }: { car: CarDetail }) {
  const { t, locale } = useLocale();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const favorites = useFavorites();
  const compare = useCompare();

  const exteriorColors = car.colors.filter((color) => color.kind === 'EXTERIOR');
  const interiorColors = car.colors.filter((color) => color.kind === 'INTERIOR');
  /*
   * The colour the page opens on: the default one, unless it is sold out.
   *
   * A vehicle whose default colour has gone opens on "Not available" with the
   * booking button dead, which reads as "this car cannot be had" — when three
   * other colours are sitting on the floor. Opening on one that can be booked
   * shows the offer that exists; the sold-out swatch is still there, still
   * selectable, and still says so when chosen.
   */
  const [selectedColorId, setSelectedColorId] = useState(() => {
    const preferred = exteriorColors.find((color) => color.isDefault) ?? exteriorColors[0];
    if (!preferred || preferred.isAvailable !== false) return preferred?.id ?? '';
    return (exteriorColors.find((color) => color.isAvailable !== false) ?? preferred).id;
  });

  const selectedColor = exteriorColors.find((color) => color.id === selectedColorId);
  const alt = `${car.brand.name} ${car.model} ${car.year}`;

  /**
   * The gallery follows the chosen colour (spec §13).
   *
   * Photographs attached to that colour come first — its own portrait, then any
   * gallery shot recorded against it — and the rest of the car's photography
   * follows, so a colour with one picture still has a full gallery behind it.
   * The colour's picture is included even when it is not among the car's
   * images, which is the normal case: it is uploaded on the colour itself.
   */
  const priceBlock = useRef<HTMLDivElement>(null);

  const images = useMemo(() => {
    /*
     * The 360° frames are images of this car, but they are not photographs of
     * it: two dozen of them in the gallery would bury the four pictures a
     * customer wants to see under a strip of near-identical thumbnails. They
     * are shown by the viewer instead.
     */
    const photographs = car.images.filter((image) => image.kind !== 'SPIN');

    // Nothing chosen yet: the car in general, main photograph first.
    if (!selectedColor) return photographs;

    /*
     * A colour chosen shows that colour, and only that colour.
     *
     * Previously the colour's photographs were merely moved to the front and
     * everything else followed, so choosing Basalt Grey still showed the white
     * car's interior, its wheels, and the main photograph of whichever colour
     * happened to be photographed for the listing. Ordered outside → inside →
     * wheels, because that is the order somebody looks at a car.
     */
    /*
     * Outside, inside, wheels, engine, boot, then anything else — the order
     * somebody actually asks about a car. "Anything else" is last because it is
     * whatever this particular car needed a slot for, including damage.
     */
    const ORDER: Record<string, number> = {
      EXTERIOR: 0,
      GALLERY: 1,
      INTERIOR: 2,
      WHEEL: 3,
      ENGINE: 4,
      TRUNK: 5,
      OTHER: 6,
    };
    const forColour = photographs
      .filter((image) => image.colorId === selectedColor.id)
      .sort(
        (a, b) =>
          (ORDER[a.kind] ?? 9) - (ORDER[b.kind] ?? 9) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
      );

    const portrait = selectedColor.imageUrl
      ? [
          photographs.find((image) => image.url === selectedColor.imageUrl) ?? {
            kind: 'GALLERY' as const,
            url: selectedColor.imageUrl,
            alt: `${car.brand.name} ${car.model} — ${selectedColor.name}`,
          },
        ]
      : [];

    const chosen = [...portrait, ...forColour];

    /*
     * A colour with no photographs of its own falls back to the car's general
     * ones — but never to the main photograph, which is the listing's picture
     * of one particular colour and would contradict the swatch just chosen.
     * An empty gallery would be worse than a slightly generic one.
     */
    const ordered =
      chosen.length > 0
        ? chosen
        : photographs.filter((image) => image.kind !== 'MAIN' && !image.colorId);

    // Same photograph reached two ways — keep the first appearance only.
    return ordered.filter(
      (image, index) => ordered.findIndex((other) => other.url === image.url) === index,
    );
  }, [car.brand.name, car.images, car.model, selectedColor]);

  const labels = { fitted: t.car.fitted, notFitted: t.car.notFitted };

  const identityRows: SpecRow[] = [
    { label: t.cars.brand, value: car.brand.name },
    { label: t.cars.model, value: car.model },
    { label: t.cars.year, value: car.year },
    { label: 'Generation', value: car.generation },
    { label: 'Trim', value: car.trim },
    { label: t.cars.bodyType, value: humaniseEnum(car.bodyType) },
    { label: 'Segment', value: car.segment },
    { label: 'Doors', value: car.doors },
    { label: 'Seats', value: car.seats },
  ];

  const engineRows: SpecRow[] = car.engine
    ? [
        { label: 'Engine type', value: car.engine.engineType },
        { label: 'Displacement', value: car.engine.displacementL ? `${car.engine.displacementL} L` : null },
        { label: 'Cylinders', value: car.engine.cylinders },
        { label: t.cars.fuelType, value: humaniseEnum(car.engine.fuelType) },
        { label: 'Power', value: car.engine.powerHp ? `${car.engine.powerHp} hp` : null },
        { label: 'Torque', value: car.engine.torqueNm ? `${car.engine.torqueNm} Nm` : null },
        { label: 'Transmission', value: formatAcronym(car.engine.transmission) },
        { label: 'Gears', value: car.engine.gears },
        { label: 'Drivetrain', value: formatAcronym(car.engine.drivetrain) },
        { label: '0–100 km/h', value: car.engine.acceleration0100 ? `${car.engine.acceleration0100} s` : null },
        { label: 'Top speed', value: formatMeasure(car.engine.topSpeedKph, 'km/h', locale) },
        {
          label: 'Fuel consumption',
          value: car.engine.fuelConsumptionCombined ? `${car.engine.fuelConsumptionCombined} L/100 km` : null,
        },
        { label: 'Battery', value: car.engine.batteryCapacityKwh ? `${car.engine.batteryCapacityKwh} kWh` : null },
        { label: 'Electric range', value: formatMeasure(car.engine.electricRangeKm, 'km', locale) },
        { label: 'DC charging', value: car.engine.chargingDcKw ? `${car.engine.chargingDcKw} kW` : null },
        { label: 'Emission standard', value: car.engine.emissionStandard },
      ]
    : [];

  const wheelRows: SpecRow[] = car.wheels
    ? [
        { label: 'Wheel size', value: car.wheels.wheelSizeInch ? `${car.wheels.wheelSizeInch}"` : null },
        { label: 'Wheel type', value: car.wheels.wheelType },
        { label: 'Wheel design', value: car.wheels.wheelDesign },
        { label: 'Front tyres', value: car.wheels.frontTyreSize },
        { label: 'Rear tyres', value: car.wheels.rearTyreSize },
        { label: 'Tyre type', value: car.wheels.tyreType },
        { label: 'Spare wheel', value: car.wheels.spareWheel },
      ]
    : [];

  const exteriorRows: SpecRow[] = car.exterior
    ? [
        { label: 'Front grille', value: car.exterior.frontGrille },
        { label: 'Headlights', value: car.exterior.headlights },
        { label: 'Daytime running lights', value: car.exterior.daytimeRunningLights },
        { label: 'Front bumper', value: car.exterior.frontBumper },
        { label: 'Hood', value: car.exterior.hoodDesign },
        { label: 'Side profile', value: car.exterior.sideProfile },
        { label: 'Doors', value: car.exterior.doorDesign },
        { label: 'Mirrors', value: car.exterior.sideMirrors },
        { label: 'Wheel arches', value: car.exterior.wheelArches },
        { label: 'Alloy wheels', value: car.exterior.alloyWheels },
        { label: 'Rear lights', value: car.exterior.rearLights },
        { label: 'Rear bumper', value: car.exterior.rearBumper },
        { label: 'Exhaust', value: car.exterior.exhaust },
        { label: 'Roofline', value: car.exterior.roofline },
        { label: 'Roof', value: car.exterior.roof },
        { label: 'Spoiler', value: car.exterior.spoiler },
        { label: 'Body lines', value: car.exterior.bodyLines },
        { label: 'Aerodynamics', value: car.exterior.aerodynamics },
      ]
    : [];

  const interiorRows: SpecRow[] = car.interior
    ? [
        { label: 'Dashboard', value: car.interior.dashboard },
        { label: 'Steering wheel', value: car.interior.steeringWheel },
        { label: 'Instrument cluster', value: car.interior.instrumentCluster },
        { label: 'Infotainment', value: car.interior.infotainmentScreen },
        { label: 'Centre console', value: car.interior.centerConsole },
        { label: 'Gear selector', value: car.interior.gearSelector },
        { label: 'Front seats', value: car.interior.frontSeats },
        { label: 'Rear seats', value: car.interior.rearSeats },
        { label: 'Seat material', value: car.interior.seatMaterial },
        { label: 'Interior colour', value: car.interior.interiorColor },
        { label: 'Ambient lighting', value: car.interior.ambientLighting },
        { label: 'Air conditioning', value: car.interior.airConditioning },
        { label: 'Storage', value: car.interior.storage },
        { label: 'USB ports', value: car.interior.usbPorts },
        { label: 'Sound system', value: car.interior.soundSystem },
        { label: 'Speakers', value: car.interior.speakerCount },
        { label: 'Cargo capacity', value: formatMeasure(car.interior.cargoCapacityL, 'L', locale) },
      ]
    : [];

  const technologyRows: SpecRow[] = car.technology
    ? [
        {
          label: 'Touchscreen',
          value: car.technology.touchscreenSizeInch
            ? `${car.technology.touchscreenSizeInch}"`
            : car.technology.touchscreen,
        },
        { label: 'Apple CarPlay', value: car.technology.appleCarPlay },
        { label: 'Android Auto', value: car.technology.androidAuto },
        { label: 'Bluetooth', value: car.technology.bluetooth },
        { label: 'Navigation', value: car.technology.navigation },
        { label: 'Digital cluster', value: car.technology.digitalInstrumentCluster },
        { label: 'Wireless charging', value: car.technology.wirelessCharging },
        { label: 'Keyless entry', value: car.technology.keylessEntry },
        { label: 'Push-button start', value: car.technology.pushButtonStart },
        { label: 'Parking sensors', value: car.technology.parkingSensors },
        { label: 'Rear camera', value: car.technology.rearCamera },
        { label: '360° camera', value: car.technology.camera360 },
        { label: 'Adaptive cruise control', value: car.technology.adaptiveCruiseControl },
        {
          label: 'Drive modes',
          value: car.technology.driveModes.length > 0 ? car.technology.driveModes.join(', ') : null,
        },
      ]
    : [];

  const safetyRows: SpecRow[] = car.safety
    ? [
        { label: 'ABS', value: car.safety.abs },
        { label: 'Stability control', value: car.safety.electronicStabilityControl },
        { label: 'Traction control', value: car.safety.tractionControl },
        { label: 'Hill start assist', value: car.safety.hillStartAssist },
        { label: 'Emergency braking', value: car.safety.autonomousEmergencyBraking },
        { label: 'Collision warning', value: car.safety.forwardCollisionWarning },
        { label: 'Lane keeping assist', value: car.safety.laneKeepingAssist },
        { label: 'Blind spot monitoring', value: car.safety.blindSpotMonitoring },
        { label: 'Rear cross-traffic alert', value: car.safety.rearCrossTrafficAlert },
        { label: 'Adaptive cruise control', value: car.safety.adaptiveCruiseControl },
        { label: 'Parking assistance', value: car.safety.parkingAssistance },
        { label: 'Airbags', value: car.safety.airbagCount },
        {
          label: 'Airbag types',
          value: car.safety.airbagTypes.length > 0 ? car.safety.airbagTypes.join(', ') : null,
        },
        { label: 'NCAP rating', value: car.safety.ncapRating ? `${car.safety.ncapRating} / 5` : null },
      ]
    : [];

  const dimensionRows: SpecRow[] = car.dimensions
    ? [
        { label: 'Length', value: formatMeasure(car.dimensions.lengthMm, 'mm', locale) },
        { label: 'Width', value: formatMeasure(car.dimensions.widthMm, 'mm', locale) },
        { label: 'Height', value: formatMeasure(car.dimensions.heightMm, 'mm', locale) },
        { label: 'Wheelbase', value: formatMeasure(car.dimensions.wheelbaseMm, 'mm', locale) },
        { label: 'Ground clearance', value: formatMeasure(car.dimensions.groundClearanceMm, 'mm', locale) },
        { label: 'Boot capacity', value: formatMeasure(car.dimensions.bootCapacityL, 'L', locale) },
        { label: 'Max boot capacity', value: formatMeasure(car.dimensions.bootCapacityMaxL, 'L', locale) },
        { label: 'Fuel tank', value: car.dimensions.fuelTankL ? `${car.dimensions.fuelTankL} L` : null },
        { label: 'Kerb weight', value: formatMeasure(car.dimensions.kerbWeightKg, 'kg', locale) },
      ]
    : [];

  const sections = [
    { key: 'identity', title: t.car.identity, rows: identityRows },
    { key: 'engine', title: t.car.engine, rows: engineRows },
    { key: 'wheels', title: t.car.wheels, rows: wheelRows },
    { key: 'exterior', title: t.car.exterior, rows: exteriorRows, description: car.exterior?.description },
    { key: 'interior', title: t.car.interior, rows: interiorRows, description: car.interior?.description },
    { key: 'technology', title: t.car.technology, rows: technologyRows },
    { key: 'safety', title: t.car.safety, rows: safetyRows },
    { key: 'dimensions', title: t.car.dimensions, rows: dimensionRows },
  ].filter((section) => section.rows.length > 0);

  const handleFavorite = async () => {
    if (!isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(`/car/${car.slug}`)}`);
      return;
    }
    const result = await favorites.toggle(car.id);
    if ('error' in result) notify.error(result.error);
    else notify.success(result.favorited ? t.car.favorited : t.car.removeFavorite);
  };

  /*
   * Whether the colour in front of the customer can be booked.
   *
   * Read from the selected colour rather than the vehicle: a car with four
   * colours and one sold out is available, but not in that one, and the answer
   * has to change when they tap a different swatch. An uncounted colour is
   * available — the API decides that, and sends the verdict rather than the
   * number.
   */
  const colourAvailable = selectedColor?.isAvailable !== false;
  const carAvailable = car.isAvailable !== false;
  const bookable = carAvailable && colourAvailable;

  const handleCompare = () => {
    const result = compare.toggle(car.id);
    if (result.full) notify.error(`${t.car.compare}: ${compare.max}`);
    else notify.success(result.added ? t.car.inCompare : t.dashboard.removeCar);
  };

  const isFavorite = favorites.isFavorite(car.id);

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
      <StickyOrderBar car={car} watch={priceBlock} selectedColorId={selectedColorId} />

      {/*
        Back to wherever the reader came from — their favourites, their
        appointments, the home page — and to the catalogue only when there is no
        history, which is how a shared link or a search result arrives.
      */}
      <BackLink href="/cars" label={t.car.backToCars} className="text-muted-foreground -ms-2 mb-6" />

      <div className="grid gap-10 lg:grid-cols-[1.35fr_1fr] lg:gap-12">
        <div className="min-w-0">
          {/*
            Keyed by colour: the gallery holds its own index, so without this a
            colour change would leave you on photograph four of the old colour
            and the swap would look like nothing happened.
          */}
          {/*
            No longer keyed by colour. The key forced a remount, which threw the
            picture away and rebuilt it — the very flash the cross-fade exists
            to avoid. The gallery resets its own index when the pictures change.
          */}
          <CarGallery
            images={images}
            alt={alt}
            spinFrames={spinFrames(car.slug, car.images)}
            caption={selectedColor?.name}
          />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{car.brand.name}</Badge>
            <Badge variant="outline">{humaniseEnum(car.bodyType)}</Badge>
            {car.isDemoData && <DemoBadge label={t.admin.demoData} />}
          </div>

          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
            {car.model}
            {car.trim ? <span className="text-muted-foreground font-normal"> {car.trim}</span> : null}
          </h1>

          <p className="text-muted-foreground mt-1.5 text-sm">
            {car.year}
            {car.generation ? ` · ${car.generation}` : ''}
            {car.seats ? ` · ${car.seats} seats` : ''}
          </p>

          {/* Watched by the bar below, which appears once this has scrolled away. */}
          <div ref={priceBlock}>
            <Price
              price={car.price}
              promoPrice={car.promoPrice}
              currency={car.currency}
              size="lg"
              className="mt-5"
            />
          </div>

          {car.marketingDescription && (
            <p className="text-muted-foreground mt-4 text-base/7">{car.marketingDescription}</p>
          )}

          {/* Colour swatches — clickable, as spec §13 requires */}
          {exteriorColors.length > 0 && (
            <fieldset className="mt-7">
              <legend className="text-sm font-medium">
                {t.car.exteriorColours}
                {selectedColor && (
                  <span className="text-muted-foreground ms-2 font-normal">
                    {selectedColor.name}
                    {selectedColor.finish ? ` · ${selectedColor.finish}` : ''}
                  </span>
                )}
              </legend>
              <ul className="mt-3 flex flex-wrap gap-2.5">
                {exteriorColors.map((color) => (
                  <li key={color.id}>
                    <button
                      type="button"
                      aria-pressed={color.id === selectedColorId}
                      aria-label={color.name}
                      title={color.name}
                      onClick={() => setSelectedColorId(color.id)}
                      className={cn(
                        'block size-9 rounded-full border transition-all',
                        color.id === selectedColorId
                          ? 'ring-primary ring-offset-background border-transparent ring-2 ring-offset-2'
                          : 'border-border hover:scale-105',
                      )}
                      style={{ backgroundColor: color.hexCode }}
                    />
                  </li>
                ))}
              </ul>
            </fieldset>
          )}

          {interiorColors.length > 0 && (
            <div className="mt-5">
              <p className="text-sm font-medium">{t.car.interiorColours}</p>
              <ul className="text-muted-foreground mt-2 flex flex-wrap gap-3 text-sm">
                {interiorColors.map((color) => (
                  <li key={color.id} className="inline-flex items-center gap-2">
                    <span
                      className="border-border size-4 rounded-full border"
                      style={{ backgroundColor: color.hexCode }}
                      aria-hidden="true"
                    />
                    {color.name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/*
            A way to the video, not the video itself.

            The clip belongs on the Videos page, where it sits beside every
            other car's. Embedding it here put a second large moving thing on a
            page that already leads with the gallery, and pushed the price and
            the order button further down.
          */}
          {car.videoUrl && (
            <Button asChild variant="outline" size="lg" className="mt-7 w-full sm:w-auto">
              <Link href={`/videos#${car.slug}`}>
                <Play className="size-4" aria-hidden="true" />
                {t.videos.watchOnCard}
              </Link>
            </Button>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {/*
              The appointment button, and only while there is something to book.
              A sold-out colour keeps the button in place but inert, rather than
              removing it: a control that disappears reads as a fault, and the
              customer is left wondering what they did.
            */}
            {bookable ? (
              <Button asChild size="lg" className="flex-1 sm:flex-none">
                <Link
                  href={`/car/${car.slug}/order${selectedColorId ? `?color=${selectedColorId}` : ''}`}
                >
                  <ShoppingCart className="size-4" aria-hidden="true" />
                  {t.car.order}
                </Link>
              </Button>
            ) : (
              <Button size="lg" className="flex-1 sm:flex-none" disabled>
                <ShoppingCart className="size-4" aria-hidden="true" />
                {t.car.order}
              </Button>
            )}

            <Button
              size="lg"
              variant="outline"
              aria-pressed={isFavorite}
              disabled={favorites.isPending(car.id)}
              onClick={() => void handleFavorite()}
            >
              <Heart
                className={cn('size-4', isFavorite && 'fill-destructive text-destructive')}
                aria-hidden="true"
              />
              {isFavorite ? t.car.favorited : t.car.favorite}
            </Button>

            <Button
              size="lg"
              variant="outline"
              aria-pressed={compare.has(car.id)}
              onClick={handleCompare}
            >
              <Scale className="size-4" aria-hidden="true" />
              {compare.has(car.id) ? t.car.inCompare : t.car.compare}
            </Button>

            {/*
              Whether this colour can be had, in the same row and at the same
              height as the buttons it sits with — a statement rather than a
              control, so it is not a button, but it should not look like an
              afterthought either.
            */}
            <span
              role="status"
              className={cn(
                'inline-flex h-11 items-center gap-2 rounded-md border px-4 text-sm font-medium',
                bookable
                  ? 'border-success/30 bg-success/10 text-success'
                  : 'border-border bg-secondary text-muted-foreground',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'size-2 rounded-full',
                  bookable ? 'bg-success' : 'bg-muted-foreground/60',
                )}
              />
              {bookable ? t.car.available : t.car.unavailable}
            </span>
          </div>

          {!bookable && (
            <p className="text-muted-foreground mt-3 text-sm">
              {carAvailable ? t.car.unavailableHint : t.car.unavailableCar}
            </p>
          )}

          {car.isDemoData && (
            <p className="border-warning/30 bg-warning/5 text-muted-foreground mt-6 rounded-lg border p-3 text-xs/5">
              {t.car.demoNotice}
            </p>
          )}
        </div>
      </div>

      {car.description && (
        <>
          <Separator className="my-12" />
          <div className="max-w-3xl">
            <h2 className="text-2xl font-semibold">{t.car.overview}</h2>
            <p className="text-muted-foreground mt-4 text-base/7 whitespace-pre-line">{car.description}</p>
          </div>
        </>
      )}

      <Separator className="my-12" />

      <section>
        <h2 className="text-2xl font-semibold">{t.car.specifications}</h2>

        <Accordion
          type="multiple"
          defaultValue={['identity', 'engine']}
          className="mt-6"
        >
          {sections.map((section) => (
            <AccordionItem key={section.key} value={section.key}>
              <AccordionTrigger className="text-base font-medium">{section.title}</AccordionTrigger>
              <AccordionContent>
                {section.description && (
                  <p className="text-muted-foreground mb-4 text-sm/7">{section.description}</p>
                )}
                <SpecTable rows={section.rows} labels={labels} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}
