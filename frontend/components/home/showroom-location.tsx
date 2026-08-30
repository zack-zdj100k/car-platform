'use client';

import { Section, SectionHeading } from '@/components/shared/section';
import { LocationMap } from '@/components/ui/expand-map';
import { useLocale } from '@/providers/locale-provider';

/**
 * "Where to find us" — the showroom, on the home page.
 *
 * Rendered only when there is a real map link to open. A card that says
 * "Algiers" and goes nowhere is worse than no card: a customer about to spend
 * millions of dinars is looking for an address they can check, and an empty
 * gesture towards one reads as evasion.
 */
export function ShowroomLocation({
  name,
  address,
  mapUrl,
}: {
  name: string;
  address: string;
  mapUrl: string;
}) {
  const { t } = useLocale();

  if (!mapUrl.trim() || !name.trim()) return null;

  return (
    <Section id="location" tone="muted">
      <SectionHeading eyebrow={t.home.locationEyebrow} title={t.home.locationTitle} align="center" />

      <div className="mt-10 flex justify-center">
        <LocationMap
          location={name}
          detail={address}
          href={mapUrl}
          openLabel={t.home.locationOpen}
        />
      </div>
    </Section>
  );
}
