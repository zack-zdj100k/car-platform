'use client';

import { useEffect, useRef } from 'react';
import { carsService } from '@/services/cars.service';
import { useAuth } from '@/providers/auth-provider';

/**
 * Tells the API that this car was looked at.
 *
 * From the browser, because the browser is the only place that knows who is
 * looking. The car page is rendered on the site's server, where the reader's
 * access token does not exist — so when this was a side effect of rendering,
 * every view reached the API anonymous. Two things followed: "recently viewed"
 * never recorded a row for anybody, and an administrator browsing their own
 * catalogue was counted as a visitor, because nothing could tell it was them.
 *
 * Sent once per car per mount, and never allowed to fail loudly: the page has
 * already rendered, and a view that goes unrecorded is not the reader's problem.
 */
export function RecordView({ slug }: { slug: string }) {
  const { token, isLoading } = useAuth();
  const reported = useRef<string | null>(null);

  useEffect(() => {
    // Wait for the session to resolve, or a signed-in reader would be reported
    // as anonymous in the moment before their token arrives.
    if (isLoading) return;
    if (reported.current === slug) return;
    reported.current = slug;

    const visitorId = document.cookie
      .split('; ')
      .find((entry) => entry.startsWith('visitor_id='))
      ?.split('=')[1];

    void carsService
      .recordView(slug, {
        token,
        headers: {
          ...(visitorId ? { 'x-visitor-id': visitorId } : {}),
          // Where they came from, when the browser will say.
          ...(document.referrer ? { 'x-visitor-referrer': document.referrer } : {}),
        },
      })
      .catch(() => undefined);
  }, [slug, token, isLoading]);

  return null;
}
