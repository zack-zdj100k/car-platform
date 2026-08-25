import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export const metadata: Metadata = {
  title: 'Reset your password',
  robots: { index: false, follow: false },
};

/** Spec §37 — the destination of the "Forgot password?" link. */
export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
