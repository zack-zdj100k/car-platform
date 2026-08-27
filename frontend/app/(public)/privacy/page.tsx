import type { Metadata } from 'next';
import { LegalPage } from '@/components/shared/legal-page';
import { fetchPublicSettings, readSetting } from '@/lib/server-api';

export const metadata: Metadata = { title: 'Privacy Policy' };

export default async function PrivacyPage() {
  const settings = await fetchPublicSettings();
  return (
    <LegalPage title="Privacy Policy" body={readSetting(settings, 'legal', 'legal.privacy')} />
  );
}
