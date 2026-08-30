import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/login-form';
import { LoadingState } from '@/components/shared/states';

export const metadata: Metadata = { title: 'Sign In', robots: { index: false, follow: false } };

/** Route per the final route map: /login (with /sign-in redirecting here). */
export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <LoginForm />
    </Suspense>
  );
}
