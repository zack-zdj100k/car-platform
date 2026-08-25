'use client';

import { Button } from '@/components/ui/button';
import { useLocale } from '@/providers/locale-provider';
import { API_URL } from '@/services/api-client';
import { authService } from '@/services/auth.service';
import { useAsync } from '@/hooks/use-async';

/**
 * Google sign-in (spec §36, §37).
 *
 * The provider is disabled on the backend until credentials are configured, so
 * the button is rendered disabled with an explanation rather than leading the
 * user into a dead end.
 */
/** Renders an anchor when enabled, and inert markup when it is not. */
function ProviderLink({
  enabled,
  href,
  children,
}: {
  enabled: boolean;
  href: string;
  children: React.ReactNode;
}) {
  if (!enabled) return <span className="inline-flex items-center gap-2">{children}</span>;
  return (
    <a href={href} className="inline-flex items-center gap-2">
      {children}
    </a>
  );
}

export function GoogleButton() {
  const { t } = useLocale();

  /*
   * Ask the API which providers are live rather than reading an environment
   * variable. The browser cannot see server configuration, and guessing meant
   * the button could offer a provider the server would refuse.
   */
  const providers = useAsync(() => authService.providers(), []);
  const enabled = providers.data?.google ?? false;

  return (
    <div className="space-y-2">
      {/*
        A real anchor rather than a click handler: OAuth needs a full-page
        navigation to the backend, which client-side routing cannot perform.
      */}
      <Button asChild={enabled} type="button" variant="outline" className="w-full" disabled={!enabled}>
        <ProviderLink enabled={enabled} href={`${API_URL}/auth/google`}>
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8Z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2a7 7 0 0 1-6.6-4.8H1.4v3.1A11.9 11.9 0 0 0 12 24Z"
          />
          <path fill="#FBBC05" d="M5.4 14.5a7.1 7.1 0 0 1 0-4.6V6.8H1.4a11.9 11.9 0 0 0 0 10.7l4-3Z" />
          <path
            fill="#EA4335"
            d="M12 4.7c1.8 0 3.4.6 4.6 1.8l3.5-3.5A11.9 11.9 0 0 0 1.4 6.8l4 3.1A7 7 0 0 1 12 4.7Z"
          />
        </svg>
          {t.auth.google}
        </ProviderLink>
      </Button>
      {providers.status === 'success' && !enabled && (
        <p className="text-muted-foreground text-center text-xs">{t.auth.googleUnavailable}</p>
      )}
    </div>
  );
}
