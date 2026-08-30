'use client';

import Link from 'next/link';
import { FileText } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Section, SectionHeading } from '@/components/shared/section';
import { useLocale } from '@/providers/locale-provider';

/**
 * A document the owner writes, shown at /privacy and /terms.
 *
 * The footer has always linked to these two pages and neither existed, so both
 * links returned 404 — on every page of the site. The text is a setting rather
 * than something written here: a privacy notice and terms of use are the
 * owner's own statements, and drafting them in their name would commit them to
 * promises they never made. While a document is empty the page says exactly
 * that, which is honest and still better than a dead link.
 */
export function LegalPage({ title, body }: { title: string; body: string }) {
  const { t } = useLocale();

  return (
    <Section>
      <SectionHeading title={title} />

      {body ? (
        <div className="text-muted-foreground mt-8 max-w-3xl space-y-4 text-base/7 whitespace-pre-line">
          {body}
        </div>
      ) : (
        <div className="mt-8 max-w-2xl">
          <Alert>
            <FileText className="size-4" aria-hidden="true" />
            <AlertDescription>{t.legal.notPublished}</AlertDescription>
          </Alert>
          <Button asChild variant="outline" className="mt-6">
            <Link href="/about">{t.legal.aboutUs}</Link>
          </Button>
        </div>
      )}
    </Section>
  );
}
