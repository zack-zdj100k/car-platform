/**
 * Which frames a car turns through.
 *
 * A car with an uploaded 360° set turns through its own photographs. Every
 * other car — including one added a minute ago — falls back to a single shared
 * placeholder set, so the viewer is there from the moment a car exists rather
 * than only on the cars somebody remembered to prepare.
 *
 * The placeholders were per-car before, generated into a folder named after the
 * slug. That meant a newly created car had no set and no viewer, and it cost a
 * megabyte and a half to hold sixteen copies of the same abstract shape.
 */

/**
 * Whether cars without their own photographs fall back to the placeholder.
 *
 * **Turn this off before the site goes live.** The placeholder is an obvious
 * grey shape with the word PLACEHOLDER across every frame — fine while the
 * catalogue is being built, and not something a customer looking at a real car
 * for sale should be shown. With it off, a car without its own frames simply
 * has no 360° tab, exactly as before.
 */
const SHOW_PLACEHOLDER = true;

const PLACEHOLDER_FRAMES = 24;

/** A frame of a 360° set, as the API returns it. */
interface SpinImage {
  kind: string;
  url: string;
  sortOrder?: number;
}

export function spinFrames(_slug: string, images: SpinImage[] = []): string[] {
  const uploaded = images
    .filter((image) => image.kind === 'SPIN')
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((image) => image.url);

  // A single frame is not a rotation; fall through to the placeholder rather
  // than offer a viewer that cannot turn.
  if (uploaded.length > 1) return uploaded;
  if (!SHOW_PLACEHOLDER) return [];

  return Array.from(
    { length: PLACEHOLDER_FRAMES },
    (_, index) => `/images/spin/_placeholder/frame-${String(index + 1).padStart(2, '0')}.svg`,
  );
}
