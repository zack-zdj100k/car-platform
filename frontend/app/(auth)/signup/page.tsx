import type { Metadata } from 'next';
import { serverDictionary } from '@/lib/i18n/server';
import { SignupForm } from '@/components/auth/signup-form';

export async function generateMetadata(): Promise<Metadata> {
  const t = await serverDictionary();
  return { title: t.meta.signUpTitle, robots: { index: false, follow: false } };
}

/** Route per the final route map: /signup (with /sign-up redirecting here). */
export default function SignupPage() {
  return <SignupForm />;
}
