import { Suspense } from 'react';
import type { Metadata } from 'next';
import { serverDictionary } from '@/lib/i18n/server';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { LoadingState } from '@/components/shared/states';

export async function generateMetadata(): Promise<Metadata> {
  const t = await serverDictionary();
  return { title: t.meta.resetTitle, robots: { index: false, follow: false } };
}

/** Spec §37 — where the emailed reset link lands. */
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
