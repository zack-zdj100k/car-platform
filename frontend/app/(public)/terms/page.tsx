import type { Metadata } from 'next';
import { LegalPage } from '@/components/shared/legal-page';
import { fetchPublicSettings, readSetting } from '@/lib/server-api';

export const metadata: Metadata = { title: 'Terms & Conditions' };

export default async function TermsPage() {
  const settings = await fetchPublicSettings();
  return <LegalPage title="Terms & Conditions" body={readSetting(settings, 'legal', 'legal.terms')} />;
}
