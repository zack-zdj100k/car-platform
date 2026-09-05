import { Hero } from '@/components/home/hero';
import { BestOfGallery } from '@/components/home/best-of-gallery';
import { CarOrbit } from '@/components/home/car-orbit';
import { VideoShowcase } from '@/components/home/video-showcase';
import { FeaturedCars } from '@/components/home/featured-cars';
import { ShowroomLocation } from '@/components/home/showroom-location';
import { StatsBento } from '@/components/ui/stats-bento';
import { fetchFeaturedCars, fetchPublicSettings, readMarketingStats, readSetting } from '@/lib/server-api';
import { serverDictionary } from '@/lib/i18n/server';

/** Home page (spec §7, §8, §9, §33). */
export default async function HomePage() {
  const [featured, settings] = await Promise.all([fetchFeaturedCars(), fetchPublicSettings()]);
  const stats = readMarketingStats(settings);
  // Stated plainly on the section itself: these are editable marketing figures,
  // not measured analytics (spec §33, and docs/DECISIONS.md D-2.1).
  const marketingNote =
    readSetting(settings, 'about', 'about.mission') || (await serverDictionary()).home.marketingNote;

  // The showcase illustrates its sections with a real vehicle from the
  // catalogue, so no placeholder path is hard-coded into the component.
  const showcaseSlug = featured[0]?.slug;

  /*
   * The specification diagram is drawn from the photographs an administrator
   * uploads for it, and it used to be rendered only when a vehicle was marked
   * as featured. On a new site that meant uploading six photographs into
   * "Home Images" and watching nothing appear, with no way to tell whether the
   * upload had failed or the section did not exist.
   */
  const homeImages = {
    safety: readSetting(settings, 'home-images', 'home.image.safety'),
    engine: readSetting(settings, 'home-images', 'home.image.engine'),
    wheels: readSetting(settings, 'home-images', 'home.image.wheels'),
    tyres: readSetting(settings, 'home-images', 'home.image.tyres'),
    exterior: readSetting(settings, 'home-images', 'home.image.exterior'),
    interior: readSetting(settings, 'home-images', 'home.image.interior'),
  };
  const showOrbit = Boolean(showcaseSlug) || Object.values(homeImages).some(Boolean);

  return (
    <>
      <Hero
        social={{
          tiktok: readSetting(settings, 'social', 'social.tiktok'),
          instagram: readSetting(settings, 'social', 'social.instagram'),
          facebook: readSetting(settings, 'social', 'social.facebook'),
        }}
      />
      {/* Curated first, then the diagram that explains what is documented. */}
      <BestOfGallery
        entries={[1, 2, 3, 4, 5, 6].map((slot) => ({
          image: readSetting(settings, 'best-of', `home.best.${slot}.image`),
          caption: readSetting(settings, 'best-of', `home.best.${slot}.caption`),
        }))}
      />

      {showOrbit ? (
        <CarOrbit
          slug={showcaseSlug}
          images={homeImages}
          fallbackImages={featured
            .map((car) => car.images[0]?.url)
            .filter((url): url is string => Boolean(url))}
        />
      ) : null}
      <VideoShowcase />
      {/*
        Between the film and the cars: having watched one move, the next
        question is where to go and see it.
      */}
      <ShowroomLocation
        name={readSetting(settings, 'location', 'location.name')}
        address={readSetting(settings, 'location', 'location.address')}
        mapUrl={readSetting(settings, 'location', 'location.mapUrl')}
      />
      <FeaturedCars cars={featured} />
      <StatsBento stats={stats} note={marketingNote} />
    </>
  );
}
