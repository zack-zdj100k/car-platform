'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { useAuth } from '@/providers/auth-provider';
import { ApiError } from '@/services/api-client';

/**
 * Mirrors the backend policy exactly (spec §36).
 *
 * Built from the dictionary rather than declared at module scope: the schema's
 * messages are what the visitor reads, and at module scope no language is
 * known yet.
 */
type Messages = Dictionary['validation'];

const buildSchema = (v: Messages) =>
  z
    .object({
      fullName: z.string().trim().min(2, v.fullName).max(120),
      email: z.string().trim().toLowerCase().pipe(z.email(v.email)),
      password: z
        .string()
        .min(8, v.min8)
        .regex(/[a-z]/, v.lowercase)
        .regex(/[A-Z]/, v.uppercase)
        .regex(/\d/, v.number),
      confirmPassword: z.string(),
      phone: z
        .string()
        .trim()
        .regex(/^\+?[0-9 ()-]{6,20}$/, v.phone)
        .optional()
        .or(z.literal('')),
      acceptTerms: z.literal(true, { message: v.acceptTerms }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: v.passwordsMatch,
      path: ['confirmPassword'],
    });

type Field = 'fullName' | 'email' | 'password' | 'confirmPassword' | 'phone' | 'acceptTerms';

export function SignupForm() {
  const { t } = useLocale();
  const schema = useMemo(() => buildSchema(t.validation), [t]);
  const { register } = useAuth();
  const router = useRouter();

  const [values, setValues] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    acceptTerms: false,
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const setField = (field: Field, value: string | boolean) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const next: Partial<Record<Field, string>> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as Field;
        next[field] ??= issue.message;
      }
      setErrors(next);
      return;
    }

    setSubmitting(true);
    try {
      await register({
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        password: parsed.data.password,
        confirmPassword: parsed.data.confirmPassword,
        phone: parsed.data.phone || undefined,
        acceptTerms: true,
      });
      router.replace('/dashboard');
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : t.validation.signupFailed,
      );
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title={t.auth.signUpTitle}
      subtitle={t.auth.signUpSubtitle}
      footer={
        <>
          {t.auth.haveAccount}{' '}
          <Link href="/login" className="text-foreground font-medium underline underline-offset-4">
            {t.auth.signIn}
          </Link>
        </>
      }
    >
      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4" noValidate>
        {formError && (
          <Alert variant="destructive" role="alert">
            <AlertCircle className="size-4" aria-hidden="true" />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="fullName">{t.auth.fullName}</Label>
          <Input
            id="fullName"
            autoComplete="name"
            required
            autoFocus
            value={values.fullName}
            onChange={(event) => setField('fullName', event.target.value)}
            aria-invalid={Boolean(errors.fullName)}
            aria-describedby={errors.fullName ? 'fullName-error' : undefined}
          />
          {errors.fullName && (
            <p id="fullName-error" className="text-destructive text-sm">
              {errors.fullName}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{t.auth.email}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={values.email}
            onChange={(event) => setField('email', event.target.value)}
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
          <Label htmlFor="password">{t.auth.password}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            value={values.password}
            onChange={(event) => setField('password', event.target.value)}
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
            onChange={(event) => setField('confirmPassword', event.target.value)}
            aria-invalid={Boolean(errors.confirmPassword)}
            aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
          />
          {errors.confirmPassword && (
            <p id="confirmPassword-error" className="text-destructive text-sm">
              {errors.confirmPassword}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">{t.auth.phoneOptional}</Label>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            value={values.phone}
            onChange={(event) => setField('phone', event.target.value)}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? 'phone-error' : undefined}
          />
          {errors.phone && (
            <p id="phone-error" className="text-destructive text-sm">
              {errors.phone}
            </p>
          )}
        </div>

        <div className="space-y-1.5 pt-1">
          <div className="flex items-start gap-2.5">
            <Checkbox
              id="acceptTerms"
              checked={values.acceptTerms}
              onCheckedChange={(checked) => setField('acceptTerms', checked === true)}
              aria-invalid={Boolean(errors.acceptTerms)}
              aria-describedby={errors.acceptTerms ? 'acceptTerms-error' : undefined}
            />
            <Label htmlFor="acceptTerms" className="cursor-pointer text-sm leading-snug font-normal">
              {t.auth.acceptTerms}
            </Label>
          </div>
          {errors.acceptTerms && (
            <p id="acceptTerms-error" className="text-destructive text-sm">
              {errors.acceptTerms}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {submitting ? t.auth.creatingAccount : t.auth.signUp}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-muted-foreground text-xs uppercase">{t.auth.or}</span>
        <Separator className="flex-1" />
      </div>

      <GoogleButton />
    </AuthShell>
  );
}
