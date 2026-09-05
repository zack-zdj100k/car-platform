'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { notify } from '@/lib/notify';
import { Clock, Heart, Play, Scale, ShoppingCart } from 'lucide-react';
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
import { useRequestedColours } from '@/hooks/use-requested-colours';
import { formatAcronym, formatMeasure, humaniseEnum } from '@/lib/format';
import { specLabels } from '@/lib/i18n/spec';
import { carCopy } from '@/lib/i18n/car-copy';
import { cn } from '@/lib/utils';
import type { CarDetail } from '@/types/api';

/**
 * Car detail page (spec §13–§23).
 *
 * Every specification group is rendered from the database only. Fields the
 * record does not contain are omitted rather than filled in (spec §14).
 */
export function CarDetailView({ car }: { car: CarDetail }) {
  const { t, locale, format } = useLocale();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const favorites = useFavorites();
  const compare = useCompare();
  /* What this customer has already asked for on this car. */
  const requested = useRequestedColours(car.id);

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
  /* Every field name, in the reader's language — the same list the editor
     fills in and the comparison table compares. */
  const s = specLabels(locale);
  /* The showroom's own words, in the reader's language where they have been
     translated and as written where they have not. */
  const copy = carCopy(car, locale);

  const identityRows: SpecRow[] = [
    { label: t.cars.brand, value: car.brand.name },
    { label: t.cars.model, value: car.model },
    { label: t.cars.year, value: car.year },
    { label: s.generation, value: car.generation },
    { label: s.trim, value: car.trim },
    { label: t.cars.bodyType, value: humaniseEnum(car.bodyType, locale) },
    { label: s.segment, value: car.segment },
    { label: s.doors, value: car.doors },
    { label: s.seats, value: car.seats },
  ];

  const engineRows: SpecRow[] = car.engine
    ? [
        { label: s.engineType, value: car.engine.engineType },
        { label: s.displacement, value: car.engine.displacementL ? `${car.engine.displacementL} L` : null },
        { label: s.cylinders, value: car.engine.cylinders },
        { label: t.cars.fuelType, value: humaniseEnum(car.engine.fuelType, locale) },
        { label: s.power, value: car.engine.powerHp ? `${car.engine.powerHp} hp` : null },
        { label: s.torque, value: car.engine.torqueNm ? `${car.engine.torqueNm} Nm` : null },
        { label: s.transmission, value: formatAcronym(car.engine.transmission, locale) },
        { label: s.gears, value: car.engine.gears },
        { label: s.drivetrain, value: formatAcronym(car.engine.drivetrain, locale) },
        { label: s.acceleration, value: car.engine.acceleration0100 ? `${car.engine.acceleration0100} s` : null },
        { label: s.topSpeed, value: formatMeasure(car.engine.topSpeedKph, 'km/h', locale) },
        {
          label: s.fuelConsumption,
          value: car.engine.fuelConsumptionCombined ? `${car.engine.fuelConsumptionCombined} L/100 km` : null,
        },
        { label: s.battery, value: car.engine.batteryCapacityKwh ? `${car.engine.batteryCapacityKwh} kWh` : null },
        { label: s.electricRange, value: formatMeasure(car.engine.electricRangeKm, 'km', locale) },
        { label: s.chargingDc, value: car.engine.chargingDcKw ? `${car.engine.chargingDcKw} kW` : null },
        { label: s.emissionStandard, value: car.engine.emissionStandard },
      ]
    : [];

  const wheelRows: SpecRow[] = car.wheels
    ? [
        { label: s.wheelSize, value: car.wheels.wheelSizeInch ? `${car.wheels.wheelSizeInch}"` : null },
        { label: s.wheelType, value: car.wheels.wheelType },
        { label: s.wheelDesign, value: car.wheels.wheelDesign },
        { label: s.frontTyres, value: car.wheels.frontTyreSize },
        { label: s.rearTyres, value: car.wheels.rearTyreSize },
        { label: s.tyreType, value: car.wheels.tyreType },
        { label: s.spareWheel, value: car.wheels.spareWheel },
      ]
    : [];

  const exteriorRows: SpecRow[] = car.exterior
    ? [
        { label: s.frontGrille, value: car.exterior.frontGrille },
        { label: s.headlights, value: car.exterior.headlights },
        { label: s.daytimeRunningLights, value: car.exterior.daytimeRunningLights },
        { label: s.frontBumper, value: car.exterior.frontBumper },
        { label: s.hood, value: car.exterior.hoodDesign },
        { label: s.sideProfile, value: car.exterior.sideProfile },
        { label: s.doorDesign, value: car.exterior.doorDesign },
        { label: s.mirrors, value: car.exterior.sideMirrors },
        { label: s.wheelArches, value: car.exterior.wheelArches },
        { label: s.alloyWheels, value: car.exterior.alloyWheels },
        { label: s.rearLights, value: car.exterior.rearLights },
        { label: s.rearBumper, value: car.exterior.rearBumper },
        { label: s.exhaust, value: car.exterior.exhaust },
        { label: s.roofline, value: car.exterior.roofline },
        { label: s.roof, value: car.exterior.roof },
        { label: s.spoiler, value: car.exterior.spoiler },
        { label: s.bodyLines, value: car.exterior.bodyLines },
        { label: s.aerodynamics, value: car.exterior.aerodynamics },
      ]
    : [];

  const interiorRows: SpecRow[] = car.interior
    ? [
        { label: s.dashboard, value: car.interior.dashboard },
        { label: s.steeringWheel, value: car.interior.steeringWheel },
        { label: s.instrumentCluster, value: car.interior.instrumentCluster },
        { label: s.infotainment, value: car.interior.infotainmentScreen },
        { label: s.centreConsole, value: car.interior.centerConsole },
        { label: s.gearSelector, value: car.interior.gearSelector },
        { label: s.frontSeats, value: car.interior.frontSeats },
        { label: s.rearSeats, value: car.interior.rearSeats },
        { label: s.seatMaterial, value: car.interior.seatMaterial },
        { label: s.interiorColour, value: car.interior.interiorColor },
        { label: s.ambientLighting, value: car.interior.ambientLighting },
        { label: s.airConditioning, value: car.interior.airConditioning },
        { label: s.storage, value: car.interior.storage },
        { label: s.usbPorts, value: car.interior.usbPorts },
        { label: s.soundSystem, value: car.interior.soundSystem },
        { label: s.speakers, value: car.interior.speakerCount },
        { label: s.cargoCapacity, value: formatMeasure(car.interior.cargoCapacityL, 'L', locale) },
      ]
    : [];

  const technologyRows: SpecRow[] = car.technology
    ? [
        {
          label: s.touchscreen,
          value: car.technology.touchscreenSizeInch
            ? `${car.technology.touchscreenSizeInch}"`
            : car.technology.touchscreen,
        },
        { label: s.appleCarPlay, value: car.technology.appleCarPlay },
        { label: s.androidAuto, value: car.technology.androidAuto },
        { label: s.bluetooth, value: car.technology.bluetooth },
        { label: s.navigation, value: car.technology.navigation },
        { label: s.digitalCluster, value: car.technology.digitalInstrumentCluster },
        { label: s.wirelessCharging, value: car.technology.wirelessCharging },
        { label: s.keylessEntry, value: car.technology.keylessEntry },
        { label: s.pushButtonStart, value: car.technology.pushButtonStart },
        { label: s.parkingSensors, value: car.technology.parkingSensors },
        { label: s.rearCamera, value: car.technology.rearCamera },
        { label: s.camera360, value: car.technology.camera360 },
        { label: s.adaptiveCruiseControl, value: car.technology.adaptiveCruiseControl },
        {
          label: s.driveModes,
          value: car.technology.driveModes.length > 0 ? car.technology.driveModes.join(', ') : null,
        },
      ]
    : [];

  const safetyRows: SpecRow[] = car.safety
    ? [
        { label: s.abs, value: car.safety.abs },
        { label: s.stabilityControl, value: car.safety.electronicStabilityControl },
        { label: s.tractionControl, value: car.safety.tractionControl },
        { label: s.hillStartAssist, value: car.safety.hillStartAssist },
        { label: s.emergencyBraking, value: car.safety.autonomousEmergencyBraking },
        { label: s.collisionWarning, value: car.safety.forwardCollisionWarning },
        { label: s.laneKeepingAssist, value: car.safety.laneKeepingAssist },
        { label: s.blindSpotMonitoring, value: car.safety.blindSpotMonitoring },
        { label: s.rearCrossTrafficAlert, value: car.safety.rearCrossTrafficAlert },
        { label: s.adaptiveCruiseControl, value: car.safety.adaptiveCruiseControl },
        { label: s.parkingAssistance, value: car.safety.parkingAssistance },
        { label: s.airbags, value: car.safety.airbagCount },
        {
          label: s.airbagTypes,
          value: car.safety.airbagTypes.length > 0 ? car.safety.airbagTypes.join(', ') : null,
        },
        { label: s.ncapRating, value: car.safety.ncapRating ? `${car.safety.ncapRating} / 5` : null },
      ]
    : [];

  const dimensionRows: SpecRow[] = car.dimensions
    ? [
        { label: s.length, value: formatMeasure(car.dimensions.lengthMm, 'mm', locale) },
        { label: s.width, value: formatMeasure(car.dimensions.widthMm, 'mm', locale) },
        { label: s.height, value: formatMeasure(car.dimensions.heightMm, 'mm', locale) },
        { label: s.wheelbase, value: formatMeasure(car.dimensions.wheelbaseMm, 'mm', locale) },
        { label: s.groundClearance, value: formatMeasure(car.dimensions.groundClearanceMm, 'mm', locale) },
        { label: s.bootCapacity, value: formatMeasure(car.dimensions.bootCapacityL, 'L', locale) },
        { label: s.bootCapacityMax, value: formatMeasure(car.dimensions.bootCapacityMaxL, 'L', locale) },
        { label: s.fuelTank, value: car.dimensions.fuelTankL ? `${car.dimensions.fuelTankL} L` : null },
        { label: s.kerbWeight, value: formatMeasure(car.dimensions.kerbWeightKg, 'kg', locale) },
      ]
    : [];

  const sections = [
    { key: 'identity', title: t.car.identity, rows: identityRows },
    { key: 'engine', title: t.car.engine, rows: engineRows },
    { key: 'wheels', title: t.car.wheels, rows: wheelRows },
    { key: 'exterior', title: t.car.exterior, rows: exteriorRows, description: copy.exteriorDescription },
    { key: 'interior', title: t.car.interior, rows: interiorRows, description: copy.interiorDescription },
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
  /*
   * Already asked for, in this colour.
   *
   * The button is not offered again: a second request for the same car in the
   * same colour is the same appointment asked for twice, and the API refuses
   * it. Saying so here means the customer learns it before they fill the form
   * in, and the sentence beneath points them at what they can still do —
   * choose a different colour.
   */
  const alreadyRequested = requested.has(selectedColorId || null);
  const bookable = carAvailable && colourAvailable && !alreadyRequested;

  const handleCompare = () => {
    const result = compare.toggle(car.id);
    if (result.full) notify.error(`${t.car.compare}: ${compare.max}`);
    else notify.success(result.added ? t.car.inCompare : t.dashboard.removeCar);
  };

  const isFavorite = favorites.isFavorite(car.id);

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
      <StickyOrderBar
        car={car}
        watch={priceBlock}
        selectedColorId={selectedColorId}
        bookable={bookable}
      />

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
            <Badge variant="outline">{humaniseEnum(car.bodyType, locale)}</Badge>
            {car.isDemoData && <DemoBadge label={t.admin.demoData} />}
          </div>

          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
            {car.model}
            {car.trim ? <span className="text-muted-foreground font-normal"> {car.trim}</span> : null}
          </h1>

          <p className="text-muted-foreground mt-1.5 text-sm">
            {car.year}
            {car.generation ? ` · ${car.generation}` : ''}
            {car.seats ? ` · ${format(t.car.seatsCount, { count: car.seats })}` : ''}
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

          {copy.marketingDescription && (
            <p className="text-muted-foreground mt-4 text-base/7">{copy.marketingDescription}</p>
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
            ) : alreadyRequested ? (
              /*
               * Not a disabled booking button — a different message. A greyed
               * "Request an appointment" says the car cannot be booked, which
               * is the opposite of what has happened: it already is.
               */
              <div
                role="status"
                className="border-success/30 bg-success/10 flex-1 rounded-lg border px-4 py-3 sm:flex-none"
              >
                <p className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="text-success size-4 shrink-0" aria-hidden="true" />
                  {t.car.alreadyRequested}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">{t.car.alreadyRequestedBody}</p>
              </div>
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

      {copy.description && (
        <>
          <Separator className="my-12" />
          <div className="max-w-3xl">
            <h2 className="text-2xl font-semibold">{t.car.overview}</h2>
            <p className="text-muted-foreground mt-4 text-base/7 whitespace-pre-line">{copy.description}</p>
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
