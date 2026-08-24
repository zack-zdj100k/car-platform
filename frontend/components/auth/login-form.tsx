'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AuthShell } from './auth-shell';
import { GoogleButton } from './google-button';
import { useLocale } from '@/providers/locale-provider';
import { useAuth } from '@/providers/auth-provider';
import { ApiError } from '@/services/api-client';

const schema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address')),
  password: z.string().min(1, 'Enter your password'),
});

/** Sign in (spec §37). Redirects by role: customer → dashboard, admin → admin. */
export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const { t } = useLocale();
  const { login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next');

  const [values, setValues] = useState({ email: '', password: '', rememberMe: false });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const next: { email?: string; password?: string } = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as 'email' | 'password';
        next[field] ??= issue.message;
      }
      setErrors(next);
      return;
    }

    setSubmitting(true);
    try {
      const user = await login({ ...parsed.data, rememberMe: values.rememberMe });
      // Only same-origin paths are honoured, so ?next cannot redirect off-site.
      const destination =
        next && next.startsWith('/') && !next.startsWith('//')
          ? next
          : user.role === 'ADMIN'
            ? '/admin/dashboard'
            : '/dashboard';
      router.replace(destination);
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : 'We could not sign you in. Please try again.',
      );
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title={t.auth.signInTitle}
      subtitle={t.auth.signInSubtitle}
      footer={
        <>
          {t.auth.noAccount}{' '}
          <Link href="/signup" className="text-foreground font-medium underline underline-offset-4">
            {t.auth.signUp}
          </Link>
        </>
      }
    >
      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5" noValidate>
        {formError && (
          <Alert variant="destructive" role="alert">
            <AlertCircle className="size-4" aria-hidden="true" />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">{t.auth.email}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            autoFocus
            value={values.email}
            onChange={(event) => {
              setValues((current) => ({ ...current, email: event.target.value }));
              setErrors((current) => ({ ...current, email: undefined }));
            }}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
          {errors.email && (
            <p id="email-error" className="text-destructive text-sm">
              {errors.email}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t.auth.password}</Label>
            <Link href="/forgot-password" className="text-muted-foreground text-xs underline underline-offset-4">
              {t.auth.forgotPassword}
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={values.password}
            onChange={(event) => {
              setValues((current) => ({ ...current, password: event.target.value }));
              setErrors((current) => ({ ...current, password: undefined }));
            }}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'password-error' : undefined}
          />
          {errors.password && (
            <p id="password-error" className="text-destructive text-sm">
              {errors.password}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <Checkbox
            id="rememberMe"
            checked={values.rememberMe}
            onCheckedChange={(checked) =>
              setValues((current) => ({ ...current, rememberMe: checked === true }))
            }
          />
          <Label htmlFor="rememberMe" className="cursor-pointer text-sm font-normal">
            {t.auth.rememberMe}
          </Label>
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {submitting ? t.auth.signingIn : t.auth.signIn}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-muted-foreground text-xs uppercase">{t.auth.or}</span>
        <Separator className="flex-1" />
      </div>

      <GoogleButton enabled={googleEnabled} />
    </AuthShell>
  );
}
