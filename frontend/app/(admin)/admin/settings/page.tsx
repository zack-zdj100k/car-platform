'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Info, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingState, ErrorState } from '@/components/shared/states';
import { useAsync } from '@/hooks/use-async';
import { useAuth } from '@/providers/auth-provider';
import { useLocale } from '@/providers/locale-provider';
import { settingsService } from '@/services/admin.service';
import { SettingImageField } from '@/components/admin/setting-image-field';
import { ApiError } from '@/services/api-client';
import { cn } from '@/lib/utils';
import type { Setting } from '@/types/api';

/**
 * Website settings (spec §48, §75).
 *
 * Values are stored as JSON, so the editor renders a plain field for scalars and
 * label/caption fields for the §33 marketing statistics. Social URLs stay empty
 * until real accounts are supplied (spec §27).
 */
export default function AdminSettingsPage() {
  const { token } = useAuth();
  const { t } = useLocale();
  const [drafts, setDrafts] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  const settings = useAsync<Setting[]>(() => settingsService.all({ token }), [token], {
    enabled: Boolean(token),
  });

  if (settings.status === 'error') {
    return <ErrorState message={settings.error} onRetry={settings.reload} />;
  }

  if (!settings.data) return <LoadingState />;

  const valueOf = (setting: Setting): unknown => drafts[setting.key] ?? setting.value;
  const isDirty = Object.keys(drafts).length > 0;

  const groups = settings.data.reduce<Record<string, Setting[]>>((accumulator, setting) => {
    accumulator[setting.group] ??= [];
    accumulator[setting.group].push(setting);
    return accumulator;
  }, {});

  const save = async () => {
    setSaving(true);
    try {
      await settingsService.updateMany(
        Object.entries(drafts).map(([key, value]) => ({ key, value })),
        { token },
      );
      toast.success(t.common.save);
      setDrafts({});
      settings.reload();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t.common.error);
    } finally {
      setSaving(false);
    }
  };

  /** Friendly label from a key like `home.image.safety`. */
  const imageLabel = (key: string) => {
    const last = key.split('.').pop() ?? key;
    return last.charAt(0).toUpperCase() + last.slice(1);
  };

  const renderField = (setting: Setting) => {
    const value = valueOf(setting);

    // Photography uploads rather than a typed path (spec §9, §47).
    if (setting.group === 'home-images' || setting.group === 'about-images') {
      return (
        <SettingImageField
          label={imageLabel(setting.key)}
          value={typeof value === 'string' ? value : ''}
          onChange={(next) => setDrafts((current) => ({ ...current, [setting.key]: next }))}
        />
      );
    }

    // Marketing statistics carry a label and a caption (spec §33).
    if (value !== null && typeof value === 'object' && 'label' in (value as object)) {
      const stat = value as { label: string; caption: string };
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`${setting.key}-label`}>Value</Label>
            <Input
              id={`${setting.key}-label`}
              value={stat.label}
              onChange={(event) =>
                setDrafts((current) => ({ ...current, [setting.key]: { ...stat, label: event.target.value } }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${setting.key}-caption`}>Caption</Label>
            <Input
              id={`${setting.key}-caption`}
              value={stat.caption}
              onChange={(event) =>
                setDrafts((current) => ({ ...current, [setting.key]: { ...stat, caption: event.target.value } }))
              }
            />
          </div>
        </div>
      );
    }

    if (typeof value === 'boolean') {
      return (
        <div className="flex items-center gap-3">
          <Button
            type="button"
            size="sm"
            variant={value ? 'default' : 'outline'}
            onClick={() => setDrafts((current) => ({ ...current, [setting.key]: true }))}
          >
            {t.common.yes}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={!value ? 'default' : 'outline'}
            onClick={() => setDrafts((current) => ({ ...current, [setting.key]: false }))}
          >
            {t.common.no}
          </Button>
        </div>
      );
    }

    if (typeof value === 'number') {
      return (
        <Input
          id={setting.key}
          type="number"
          value={value}
          onChange={(event) =>
            setDrafts((current) => ({ ...current, [setting.key]: Number(event.target.value) }))
          }
        />
      );
    }

    return (
      <Input
        id={setting.key}
        value={typeof value === 'string' ? value : JSON.stringify(value)}
        onChange={(event) => setDrafts((current) => ({ ...current, [setting.key]: event.target.value }))}
      />
    );
  };

  return (
    <div className="max-w-3xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold sm:text-3xl">{t.admin.settings}</h1>
        <Button disabled={!isDirty || saving} onClick={() => void save()}>
          {saving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {t.dashboard.saveChanges}
        </Button>
      </header>

      {Object.entries(groups).map(([group, entries]) => (
        <Card key={group}>
          <CardHeader>
            <CardTitle className="text-base capitalize">{group.replace('-', ' ')}</CardTitle>
            {group === 'marketing-stats' && <CardDescription>{t.admin.marketingCopy}</CardDescription>}
            {group === 'social' && (
              <CardDescription>Leave empty until the real account URLs are provided.</CardDescription>
            )}
            {group === 'home-images' && (
              <CardDescription>
                Photographs for the home page feature sections. Drop a file in or choose one — an empty
                slot uses the bundled placeholder.
              </CardDescription>
            )}
            {group === 'about-images' && (
              <CardDescription>
                Your photograph, shown on the About page under &ldquo;Developed by me&rdquo;. Drop a file
                in or choose one — while it is empty the page shows a placeholder in its place.
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-5">
            {entries.map((setting) => (
              <div key={setting.key} className="space-y-2">
                <div
                  className={cn(
                    'flex flex-wrap items-center gap-2',
                    (setting.group === 'home-images' || setting.group === 'about-images') && 'sr-only',
                  )}
                >
                  <Label htmlFor={setting.key} className="font-mono text-xs">
                    {setting.key}
                  </Label>
                  {setting.isPublic ? (
                    <Badge variant="secondary" className="text-[10px]">
                      public
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">
                      private
                    </Badge>
                  )}
                </div>
                {renderField(setting)}
                {setting.description && (
                  <p className="text-muted-foreground text-xs">{setting.description}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <Alert>
        <Info className="size-4" aria-hidden="true" />
        <AlertDescription>
          Settings are seeded, not created here — an unknown key is rejected by the API.
        </AlertDescription>
      </Alert>
    </div>
  );
}
