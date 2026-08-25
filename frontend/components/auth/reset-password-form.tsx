'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AuthShell } from './auth-shell';
import { useLocale } from '@/providers/locale-provider';
import { authService } from '@/services/auth.service';
import { ApiError } from '@/services/api-client';

/** Mirrors the backend policy exactly (spec §36, §37). */
const schema = z
  .object({
    password: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[a-z]/, 'Include a lowercase letter')
      .regex(/[A-Z]/, 'Include an uppercase letter')
      .regex(/\d/, 'Include a number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

/**
 * Reset password (spec §37).
 *
 * The token arrives in the URL. Setting a new password ends every existing
 * session server-side, so the visitor is sent back to sign in rather than being
 * silently logged in here.
 */
export function ResetPasswordForm() {
  const { t } = useLocale();
  const params = useSearchParams();
  const token = params.get('token') ?? '';

  const [values, setValues] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= issue.message;
      setErrors(next);
      return;
    }

    setSaving(true);
    try {
      await authService.resetPassword({
        token,
        password: parsed.data.password,
        confirmPassword: parsed.data.confirmPassword,
      });
      setDone(true);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : t.common.error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthShell
      title={done ? t.auth.resetDoneTitle : t.auth.resetTitle}
      subtitle={done ? t.auth.resetDoneBody : t.auth.resetSubtitle}
      footer={
        <Link href="/login" className="text-foreground font-medium underline underline-offset-4">
          {t.auth.signIn}
        </Link>
      }
    >
      {done ? (
        <div className="border-border bg-card flex flex-col items-center gap-3 rounded-xl border p-6 text-center">
          <span className="bg-success/10 text-success grid size-12 place-items-center rounded-full">
            <CheckCircle2 className="size-6" aria-hidden="true" />
          </span>
          <Button asChild className="mt-2">
            <Link href="/login">{t.auth.signIn}</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={(event) => void submit(event)} className="space-y-5" noValidate>
          {!token && (
            <Alert variant="destructive" role="alert">
              <AlertCircle className="size-4" aria-hidden="true" />
              <AlertDescription>{t.auth.resetMissingToken}</AlertDescription>
            </Alert>
          )}

          {formError && (
            <Alert variant="destructive" role="alert">
              <AlertCircle className="size-4" aria-hidden="true" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">{t.auth.password}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              autoFocus
              value={values.password}
              onChange={(event) => {
                setValues((current) => ({ ...current, password: event.target.value }));
                setErrors((current) => ({ ...current, password: '' }));
              }}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'password-error' : 'password-hint'}
            />
            {errors.password ? (
              <p id="password-error" className="text-destructive text-sm">
                {errors.password}
              </p>
            ) : (
              <p id="password-hint" className="text-muted-foreground text-xs">
                {t.auth.passwordHint}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t.auth.confirmPassword}</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={values.confirmPassword}
              onChange={(event) => {
                setValues((current) => ({ ...current, confirmPassword: event.target.value }));
                setErrors((current) => ({ ...current, confirmPassword: '' }));
              }}
              aria-invalid={Boolean(errors.confirmPassword)}
              aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
            />
            {errors.confirmPassword && (
              <p id="confirmPassword-error" className="text-destructive text-sm">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={saving || !token}>
            {saving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {saving ? t.auth.resetSaving : t.auth.resetSubmit}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
