import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { LoadingState } from '@/components/shared/states';

export const metadata: Metadata = {
  title: 'Choose a new password',
  robots: { index: false, follow: false },
};

/** Spec §37 — where the emailed reset link lands. */
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
