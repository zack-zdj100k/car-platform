'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthShell } from './auth-shell';
import { useLocale } from '@/providers/locale-provider';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { authService } from '@/services/auth.service';

const buildSchema = (v: Dictionary['validation']) =>
  z.object({
    email: z.string().trim().toLowerCase().pipe(z.email(v.email)),
  });

/**
 * Forgot password (spec §37).
 *
 * The success state is shown whatever the outcome, because the API deliberately
 * answers identically for a known and an unknown address — telling the visitor
 * which it was would turn this form into a way to discover who has an account.
 */
export function ForgotPasswordForm() {
  const { t } = useLocale();
  const schema = useMemo(() => buildSchema(t.validation), [t]);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    const parsed = schema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t.validation.email);
      return;
    }

    setError(null);
    setSending(true);
    try {
      await authService.forgotPassword(parsed.data.email);
    } catch {
      // Deliberately silent: a failure here must not reveal anything either.
    } finally {
      setSending(false);
      setSent(true);
    }
  };

  return (
    <AuthShell
      title={sent ? t.auth.forgotSentTitle : t.auth.forgotTitle}
      subtitle={sent ? t.auth.forgotSentBody : t.auth.forgotSubtitle}
      footer={
        <Link href="/login" className="text-foreground inline-flex items-center gap-1.5 font-medium">
          <ArrowLeft className="size-3.5 rtl:rotate-180" aria-hidden="true" />
          {t.auth.backToSignIn}
        </Link>
      }
    >
      {sent ? (
        <div className="border-border bg-card flex flex-col items-center gap-3 rounded-xl border p-6 text-center">
          <span className="bg-success/10 text-success grid size-12 place-items-center rounded-full">
            <CheckCircle2 className="size-6" aria-hidden="true" />
          </span>
          <p className="text-muted-foreground text-sm">{t.auth.forgotSentBody}</p>
        </div>
      ) : (
        <form onSubmit={(event) => void submit(event)} className="space-y-5" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">{t.auth.email}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              autoFocus
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError(null);
              }}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'email-error' : undefined}
            />
            {error && (
              <p id="email-error" className="text-destructive text-sm">
                {error}
              </p>
            )}
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={sending}>
            {sending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {sending ? t.auth.forgotSending : t.auth.forgotSubmit}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
