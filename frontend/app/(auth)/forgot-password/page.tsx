import type { Metadata } from 'next';
import { serverDictionary } from '@/lib/i18n/server';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export async function generateMetadata(): Promise<Metadata> {
  const t = await serverDictionary();
  return { title: t.meta.forgotTitle, robots: { index: false, follow: false } };
}

/** Spec §37 — the destination of the "Forgot password?" link. */
export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
