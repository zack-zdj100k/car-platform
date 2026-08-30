import type { Metadata } from 'next';
import { SignupForm } from '@/components/auth/signup-form';

export const metadata: Metadata = { title: 'Sign Up', robots: { index: false, follow: false } };

/** Route per the final route map: /signup (with /sign-up redirecting here). */
export default function SignupPage() {
  return <SignupForm />;
}
