import type { Metadata } from 'next';
import { serverDictionary } from '@/lib/i18n/server';
import { LegalPage } from '@/components/shared/legal-page';
import { fetchPublicSettings, readSetting } from '@/lib/server-api';

export async function generateMetadata(): Promise<Metadata> {
  const t = await serverDictionary();
  return { title: t.meta.privacyTitle };
}

export default async function PrivacyPage() {
  const [settings, t] = await Promise.all([fetchPublicSettings(), serverDictionary()]);
  return (
    <LegalPage title={t.meta.privacyTitle} body={readSetting(settings, 'legal', 'legal.privacy')} />
  );
}
