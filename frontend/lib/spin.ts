import spinSets from './spin-sets.json';

/**
 * Which cars can be spun, and where their frames live.
 *
 * Convention over configuration, deliberately: a 360° set is a folder of
 * numbered frames under `public/images/spin/<slug>/`, and `spin-sets.json` —
 * written by `scripts/make-spin-placeholders.mjs` — records how many each car
 * has. A client component cannot read the disk, and a database column would be
 * the wrong price for something still being tried out. When this earns its place
 * the frames move to real uploads and the count moves to the car record; the
 * component below does not change either way.
 */
const sets = spinSets as Record<string, number>;

/** A frame of a 360° set, as the API returns it. */
interface SpinImage {
  kind: string;
  url: string;
  sortOrder?: number;
}

/**
 * The frames to spin, in order.
 *
 * An administrator's uploaded set wins. Only if a car has none does the
 * bundled placeholder set stand in — that exists so the feature could be judged
 * before anybody photographed a car, and it disappears for a given vehicle the
 * moment a real set is uploaded for it.
 */
export function spinFrames(slug: string, images: SpinImage[] = []): string[] {
  const uploaded = images
    .filter((image) => image.kind === 'SPIN')
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((image) => image.url);

  // A single frame is not a rotation; fall through to the placeholder rather
  // than offer a viewer that cannot turn.
  if (uploaded.length > 1) return uploaded;

  const count = sets[slug];
  if (!count) return [];

  return Array.from(
    { length: count },
    (_, index) => `/images/spin/${slug}/frame-${String(index + 1).padStart(2, '0')}.svg`,
  );
}
