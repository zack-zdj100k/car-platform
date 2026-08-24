import { Hero } from '@/components/home/hero';
import { FeaturesShowcase } from '@/components/home/features-showcase';
import { FeaturedCars } from '@/components/home/featured-cars';
import { StatsStrip } from '@/components/home/stats-strip';
import { fetchFeaturedCars, fetchPublicSettings, readMarketingStats } from '@/lib/server-api';

/** Home page (spec §7, §8, §9, §33). */
export default async function HomePage() {
  const [featured, settings] = await Promise.all([fetchFeaturedCars(), fetchPublicSettings()]);
  const stats = readMarketingStats(settings);

  // The showcase illustrates its sections with a real vehicle from the
  // catalogue, so no placeholder path is hard-coded into the component.
  const showcaseSlug = featured[0]?.slug;

  return (
    <>
      <Hero />
      {showcaseSlug ? (
        <FeaturesShowcase slug={showcaseSlug} />
      ) : null}
      <FeaturedCars cars={featured} />
      <StatsStrip stats={stats} />
    </>
  );
}
