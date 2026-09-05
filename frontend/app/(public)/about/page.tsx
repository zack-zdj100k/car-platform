import type { Metadata } from 'next';
import { serverDictionary } from '@/lib/i18n/server';
import { AboutCopy } from '@/components/about/about-copy';
import { fetchPublicSettings, readMarketingStats, readSetting } from '@/lib/server-api';

export async function generateMetadata(): Promise<Metadata> {
  const t = await serverDictionary();
  return { title: t.meta.aboutTitle, description: t.meta.aboutDescription };
}

/** About page (spec §28–§35). */
export default async function AboutPage() {
  const settings = await fetchPublicSettings();

  return (
    <AboutCopy
      stats={readMarketingStats(settings)}
      whoWeAre={readSetting(settings, 'about', 'about.whoWeAre')}
      mission={readSetting(settings, 'about', 'about.mission')}
      portrait={readSetting(settings, 'about-images', 'about.image.portrait')}
    />
  );
}
