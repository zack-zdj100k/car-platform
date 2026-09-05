'use client';

import { useMemo, useState } from 'react';
import { notify } from '@/lib/notify';
import { AlertCircle, Loader2, LogOut } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingState, ErrorState } from '@/components/shared/states';
import { useAsync } from '@/hooks/use-async';
import { useAuth } from '@/providers/auth-provider';
import { useLocale } from '@/providers/locale-provider';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { profileService } from '@/services/customer.service';
import { ApiError } from '@/services/api-client';
import { formatDate } from '@/lib/format';
import { ProfilePictureField } from '@/components/dashboard/profile-picture-field';
import type { UserProfile } from '@/types/api';

const buildProfileSchema = (v: Dictionary['validation']) =>
  z.object({
    fullName: z.string().trim().min(2, v.fullName).max(120),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9 ()-]{6,20}$/, v.phone)
      .optional()
      .or(z.literal('')),
    profileImage: z.string().trim().max(500).optional().or(z.literal('')),
  });

const buildPasswordSchema = (v: Dictionary['validation']) =>
  z
    .object({
      currentPassword: z.string().min(1, v.currentPassword),
      newPassword: z
        .string()
        .min(8, v.min8)
        .regex(/[a-z]/, v.lowercase)
        .regex(/[A-Z]/, v.uppercase)
        .regex(/\d/, v.number),
      confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: v.passwordsMatch,
      path: ['confirmPassword'],
    });

/** Spec §44 — profile: picture, name, email, phone, creation date, password. */
export default function ProfilePage() {
  const { token, logout, refresh } = useAuth();
  const { t, locale } = useLocale();
  const profileSchema = useMemo(() => buildProfileSchema(t.validation), [t]);
  const passwordSchema = useMemo(() => buildPasswordSchema(t.validation), [t]);

  const profile = useAsync<UserProfile>(() => profileService.me({ token }), [token], {
    enabled: Boolean(token),
  });

  const [details, setDetails] = useState<{ fullName: string; phone: string; profileImage: string } | null>(null);
  const [detailErrors, setDetailErrors] = useState<Record<string, string>>({});
  const [savingDetails, setSavingDetails] = useState(false);

  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  if (profile.status === 'error') {
    return <ErrorState message={profile.error} onRetry={profile.reload} />;
  }

  if (!profile.data) {
    return <LoadingState />;
  }

  const user = profile.data;
  // Form state is seeded from the loaded profile on first render after load.
  const values = details ?? {
    fullName: user.fullName,
    phone: user.phone ?? '',
    profileImage: user.profileImage ?? '',
  };

  const setField = (field: keyof typeof values, value: string) => {
    setDetails({ ...values, [field]: value });
    setDetailErrors((current) => ({ ...current, [field]: '' }));
  };

  const saveDetails = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = profileSchema.safeParse(values);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= issue.message;
      setDetailErrors(next);
      return;
    }

    setSavingDetails(true);
    try {
      await profileService.update(
        {
          fullName: parsed.data.fullName,
          phone: parsed.data.phone || undefined,
          profileImage: parsed.data.profileImage || undefined,
        },
        { token },
      );
      notify.success(t.dashboard.saveChanges);
      await refresh();
      profile.reload();
    } catch (error) {
      notify.error(error instanceof ApiError ? error.message : t.common.error);
    } finally {
      setSavingDetails(false);
    }
  };

  const savePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordError(null);

    const parsed = passwordSchema.safeParse(passwords);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= issue.message;
      setPasswordErrors(next);
      return;
    }

    setSavingPassword(true);
    try {
      await profileService.changePassword(parsed.data, { token });
      // The backend revokes every session on a password change, so the user
      // must sign in again — that is intentional, not an error.
      notify.success(t.common.signedOut);
      await logout();
    } catch (error) {
      setPasswordError(error instanceof ApiError ? error.message : t.common.error);
    } finally {
      setSavingPassword(false);
    }
  };

  const initials = user.fullName
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold sm:text-3xl">{t.dashboard.profile}</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t.dashboard.profile}</CardTitle>
          <CardDescription>
            {t.dashboard.accountCreated}: {formatDate(user.createdAt, locale)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(event) => void saveDetails(event)} className="space-y-5" noValidate>
            <ProfilePictureField
              value={values.profileImage}
              initials={initials}
              onChange={(next) => setField('profileImage', next)}
            />

            <div className="space-y-2">
              <Label htmlFor="fullName">{t.auth.fullName}</Label>
              <Input
                id="fullName"
                value={values.fullName}
                onChange={(event) => setField('fullName', event.target.value)}
                aria-invalid={Boolean(detailErrors.fullName)}
              />
              {detailErrors.fullName && <p className="text-destructive text-sm">{detailErrors.fullName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t.auth.email}</Label>
              {/* Email changes require re-verification, so it is read-only here. */}
              <Input id="email" value={user.email} readOnly disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t.auth.phone}</Label>
              <Input
                id="phone"
                type="tel"
                value={values.phone}
                onChange={(event) => setField('phone', event.target.value)}
                aria-invalid={Boolean(detailErrors.phone)}
              />
              {detailErrors.phone && <p className="text-destructive text-sm">{detailErrors.phone}</p>}
            </div>

            <Button type="submit" disabled={savingDetails}>
              {savingDetails && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {t.dashboard.saveChanges}
            </Button>
          </form>
        </CardContent>
      </Card>

      {user.hasPassword && (
        <Card>
          <CardHeader>
            <CardTitle>{t.dashboard.changePassword}</CardTitle>
            <CardDescription>{t.auth.passwordHint}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(event) => void savePassword(event)} className="space-y-5" noValidate>
              {passwordError && (
                <Alert variant="destructive" role="alert">
                  <AlertCircle className="size-4" aria-hidden="true" />
                  <AlertDescription>{passwordError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="currentPassword">{t.dashboard.currentPassword}</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  value={passwords.currentPassword}
                  onChange={(event) =>
                    setPasswords((current) => ({ ...current, currentPassword: event.target.value }))
                  }
                  aria-invalid={Boolean(passwordErrors.currentPassword)}
                />
                {passwordErrors.currentPassword && (
                  <p className="text-destructive text-sm">{passwordErrors.currentPassword}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">{t.dashboard.newPassword}</Label>
                <Input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  value={passwords.newPassword}
                  onChange={(event) =>
                    setPasswords((current) => ({ ...current, newPassword: event.target.value }))
                  }
                  aria-invalid={Boolean(passwordErrors.newPassword)}
                />
                {passwordErrors.newPassword && (
                  <p className="text-destructive text-sm">{passwordErrors.newPassword}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmNewPassword">{t.auth.confirmPassword}</Label>
                <Input
                  id="confirmNewPassword"
                  type="password"
                  autoComplete="new-password"
                  value={passwords.confirmPassword}
                  onChange={(event) =>
                    setPasswords((current) => ({ ...current, confirmPassword: event.target.value }))
                  }
                  aria-invalid={Boolean(passwordErrors.confirmPassword)}
                />
                {passwordErrors.confirmPassword && (
                  <p className="text-destructive text-sm">{passwordErrors.confirmPassword}</p>
                )}
              </div>

              <Button type="submit" disabled={savingPassword}>
                {savingPassword && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {t.dashboard.changePassword}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Separator />

      <Button variant="outline" onClick={() => void logout()}>
        <LogOut className="size-4" aria-hidden="true" />
        {t.dashboard.logout}
      </Button>
    </div>
  );
}
