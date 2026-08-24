import type { Metadata } from 'next';
import { AboutCopy } from '@/components/about/about-copy';
import { fetchPublicSettings, readMarketingStats, readSetting } from '@/lib/server-api';

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Why this platform exists and what it offers.',
};

/** About page (spec §28–§35). */
export default async function AboutPage() {
  const settings = await fetchPublicSettings();

  return (
    <AboutCopy
      stats={readMarketingStats(settings)}
      whoWeAre={readSetting(settings, 'about', 'about.whoWeAre')}
      mission={readSetting(settings, 'about', 'about.mission')}
    />
  );
}
