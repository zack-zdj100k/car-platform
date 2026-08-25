import { Hero } from '@/components/home/hero';
import { FeaturesShowcase } from '@/components/home/features-showcase';
import { FeaturedCars } from '@/components/home/featured-cars';
import { StatsStrip } from '@/components/home/stats-strip';
import { fetchFeaturedCars, fetchPublicSettings, readMarketingStats, readSetting } from '@/lib/server-api';

/** Home page (spec §7, §8, §9, §33). */
export default async function HomePage() {
  const [featured, settings] = await Promise.all([fetchFeaturedCars(), fetchPublicSettings()]);
  const stats = readMarketingStats(settings);

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
        <FeaturesShowcase
          slug={showcaseSlug}
          images={{
            safety: readSetting(settings, 'home-images', 'home.image.safety'),
            engine: readSetting(settings, 'home-images', 'home.image.engine'),
            wheels: readSetting(settings, 'home-images', 'home.image.wheels'),
            tyres: readSetting(settings, 'home-images', 'home.image.tyres'),
            exterior: readSetting(settings, 'home-images', 'home.image.exterior'),
            interior: readSetting(settings, 'home-images', 'home.image.interior'),
          }}
        />
      ) : null}
      <FeaturedCars cars={featured} />
      <StatsStrip stats={stats} />
    </>
  );
}
