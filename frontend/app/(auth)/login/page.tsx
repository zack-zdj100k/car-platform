import { Suspense } from 'react';
import type { Metadata } from 'next';
import { serverDictionary } from '@/lib/i18n/server';
import { LoginForm } from '@/components/auth/login-form';
import { LoadingState } from '@/components/shared/states';

export async function generateMetadata(): Promise<Metadata> {
  const t = await serverDictionary();
  return { title: t.meta.signInTitle, robots: { index: false, follow: false } };
}

/** Route per the final route map: /login (with /sign-in redirecting here). */
export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <LoginForm />
    </Suspense>
  );
}
