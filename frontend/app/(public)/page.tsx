import { Hero } from '@/components/home/hero';
import { CarOrbit } from '@/components/home/car-orbit';
import { VideoShowcase } from '@/components/home/video-showcase';
import { FeaturedCars } from '@/components/home/featured-cars';
import { StatsBento } from '@/components/ui/stats-bento';
import { fetchFeaturedCars, fetchPublicSettings, readMarketingStats, readSetting } from '@/lib/server-api';

/** Home page (spec §7, §8, §9, §33). */
export default async function HomePage() {
  const [featured, settings] = await Promise.all([fetchFeaturedCars(), fetchPublicSettings()]);
  const stats = readMarketingStats(settings);
  // Stated plainly on the section itself: these are editable marketing figures,
  // not measured analytics (spec §33, and docs/DECISIONS.md D-2.1).
  const marketingNote =
    readSetting(settings, 'about', 'about.mission') ||
    'Configurable marketing content — not live analytics.';

  // The showcase illustrates its sections with a real vehicle from the
  // catalogue, so no placeholder path is hard-coded into the component.
  const showcaseSlug = featured[0]?.slug;

  return (
    <>
      <Hero
        social={{
          tiktok: readSetting(settings, 'social', 'social.tiktok'),
          instagram: readSetting(settings, 'social', 'social.instagram'),
          facebook: readSetting(settings, 'social', 'social.facebook'),
        }}
      />
      {showcaseSlug ? (
        <CarOrbit
          slug={showcaseSlug}
          images={{
            safety: readSetting(settings, 'home-images', 'home.image.safety'),
            engine: readSetting(settings, 'home-images', 'home.image.engine'),
            wheels: readSetting(settings, 'home-images', 'home.image.wheels'),
            tyres: readSetting(settings, 'home-images', 'home.image.tyres'),
            exterior: readSetting(settings, 'home-images', 'home.image.exterior'),
            interior: readSetting(settings, 'home-images', 'home.image.interior'),
          }}
          fallbackImages={featured
            .map((car) => car.images[0]?.url)
            .filter((url): url is string => Boolean(url))}
        />
      ) : null}
      <VideoShowcase />
      <FeaturedCars cars={featured} />
      <StatsBento stats={stats} note={marketingNote} />
    </>
  );
}
