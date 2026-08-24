import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/login-form';
import { LoadingState } from '@/components/shared/states';

export const metadata: Metadata = { title: 'Sign In', robots: { index: false, follow: false } };

/** Route per the final route map: /login (with /sign-in redirecting here). */
export default function LoginPage() {
  // Empty credentials disable the provider on the backend, so the button is
  // rendered disabled rather than leading nowhere (spec §36).
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID);

  return (
    <Suspense fallback={<LoadingState />}>
      <LoginForm googleEnabled={googleEnabled} />
    </Suspense>
  );
}
