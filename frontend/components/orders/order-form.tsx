'use client';

import { MediaImage } from '@/components/shared/media-image';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Info, Loader2 } from 'lucide-react';
import { BackLink } from '@/components/shared/back-link';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Price } from '@/components/shared/price';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useLocale } from '@/providers/locale-provider';
import { useAuth } from '@/providers/auth-provider';
import { ordersService } from '@/services/customer.service';
import { ApiError } from '@/services/api-client';
import { cn } from '@/lib/utils';
import { whatsappLink } from '@/lib/whatsapp';
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon';
import type { CarDetail, OrderDetail } from '@/types/api';

/**
 * Order form (spec §24): buyer name, email and phone, plus the selected car and
 * colour. This is an enquiry — there are deliberately no payment fields.
 *
 * Validation runs with Zod on the client (spec §3) so honest mistakes are caught
 * before a round trip; the backend validates independently and remains the
 * authority.
 */
const schema = z.object({
  buyerName: z.string().trim().min(2, 'Please enter your full name').max(120),
  buyerEmail: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address')),
  buyerPhone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ()-]{6,20}$/, 'Enter a valid phone number'),
  message: z.string().trim().max(2000).optional(),
});

type FieldErrors = Partial<Record<'buyerName' | 'buyerEmail' | 'buyerPhone' | 'message', string>>;

export function OrderForm({
  car,
  initialColorId,
  whatsappPhone = '',
}: {
  car: CarDetail;
  initialColorId?: string;
  /** The showroom's number, from settings. No number, no button. */
  whatsappPhone?: string;
}) {
  const { t, format } = useLocale();
  const { user, token, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const exteriorColors = car.colors.filter((color) => color.kind === 'EXTERIOR');
  const [selectedColorId, setSelectedColorId] = useState(
    () =>
      (initialColorId && exteriorColors.some((color) => color.id === initialColorId)
        ? initialColorId
        : exteriorColors.find((color) => color.isDefault)?.id) ?? exteriorColors[0]?.id ?? '',
  );

  const [values, setValues] = useState({
    buyerName: user?.fullName ?? '',
    buyerEmail: user?.email ?? '',
    buyerPhone: user?.phone ?? '',
    message: '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<OrderDetail | null>(null);

  const image = car.images.find((entry) => entry.kind === 'MAIN') ?? car.images[0];
  const selectedColor = exteriorColors.find((color) => color.id === selectedColorId);

  const setField = (field: keyof typeof values, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof FieldErrors;
        next[field] ??= issue.message;
      }
      setErrors(next);
      return;
    }

    setSubmitting(true);
    try {
      const created = await ordersService.create(
        {
          carId: car.id,
          buyerName: parsed.data.buyerName,
          buyerEmail: parsed.data.buyerEmail,
          buyerPhone: parsed.data.buyerPhone,
          selectedColorId: selectedColorId || undefined,
          message: parsed.data.message || undefined,
        },
        { token },
      );
      setOrder(created);
    } catch (error) {
      if (error instanceof ApiError && error.isUnauthorised) {
        // The backend requires a session while orders.requireAuth is true.
        router.push(`/login?next=${encodeURIComponent(`/car/${car.slug}/order`)}`);
        return;
      }
      setFormError(
        error instanceof ApiError ? error.message : 'We could not send your request. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ---- success ----
  if (order) {
    const whatsapp = whatsappPhone
      ? whatsappLink(
          whatsappPhone,
          format(t.order.whatsappBody, {
            reference: order.reference,
            vehicle: `${car.brand.name} ${car.model} ${car.year}`,
          }),
        )
      : null;

    return (
      <div className="mx-auto w-full max-w-2xl px-5 py-16 sm:px-8">
        <div className="border-border bg-card rounded-xl border p-8 text-center shadow-[var(--shadow-card)]">
          <span className="bg-success/10 text-success mx-auto grid size-14 place-items-center rounded-full">
            <CheckCircle2 className="size-7" aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold">{t.order.successTitle}</h1>
          <p className="text-muted-foreground mt-3 text-base/7">
            {format(t.order.successBody, { reference: order.reference })}
          </p>

          <dl className="border-border mt-6 space-y-2 border-t pt-6 text-start text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t.dashboard.reference}</dt>
              <dd className="font-mono font-medium">{order.reference}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t.dashboard.vehicle}</dt>
              <dd className="font-medium">
                {car.brand.name} {car.model} {car.year}
              </dd>
            </div>
            {order.selectedColorName && (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{t.order.colour}</dt>
                <dd className="font-medium">{order.selectedColorName}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t.dashboard.status}</dt>
              <dd>
                <Badge variant="secondary">{t.orderStatus[order.status] ?? order.status}</Badge>
              </dd>
            </div>
          </dl>

          {/*
            WhatsApp, first and in its own colour.

            The appointment is a request for a conversation, and this is the
            moment the customer has the most to say — a time that suits them, a
            question they did not put in the form. Waiting for us to call is the
            slower half of that exchange, and a business that runs on contact
            should not make the customer wait to make contact.
          */}
          {whatsapp && (
            <div className="mt-8">
              <Button
                asChild
                size="lg"
                className="w-full bg-[#25D366] text-black hover:bg-[#1FB855] sm:w-auto"
              >
                <a href={whatsapp} target="_blank" rel="noreferrer noopener">
                  <WhatsAppIcon className="size-5" aria-hidden="true" />
                  {t.order.whatsapp}
                </a>
              </Button>
            </div>
          )}

          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Button asChild variant={whatsapp ? 'outline' : 'default'}>
              <Link href="/dashboard/orders">{t.order.viewOrders}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/cars">{t.dashboard.exploreCars}</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
      <BackLink
        href={`/car/${car.slug}`}
        label={`${car.brand.name} ${car.model}`}
        className="text-muted-foreground -ms-2 mb-6"
      />

      <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <h1 className="text-3xl font-semibold">{t.order.title}</h1>
          <p className="text-muted-foreground mt-3 text-base/7">{t.order.subtitle}</p>

          <Alert className="mt-6">
            <Info className="size-4" aria-hidden="true" />
            <AlertTitle>{t.order.notPayment}</AlertTitle>
          </Alert>

          {!authLoading && !isAuthenticated && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="size-4" aria-hidden="true" />
              <AlertTitle>{t.order.signInRequired}</AlertTitle>
              <AlertDescription>
                <Link
                  className="underline underline-offset-4"
                  href={`/login?next=${encodeURIComponent(`/car/${car.slug}/order`)}`}
                >
                  {t.auth.signIn}
                </Link>
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={(event) => void handleSubmit(event)} className="mt-8 space-y-5" noValidate>
            {formError && (
              <Alert variant="destructive" role="alert">
                <AlertCircle className="size-4" aria-hidden="true" />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="buyerName">{t.order.fullName}</Label>
              <Input
                id="buyerName"
                name="name"
                autoComplete="name"
                required
                value={values.buyerName}
                onChange={(event) => setField('buyerName', event.target.value)}
                aria-invalid={Boolean(errors.buyerName)}
                aria-describedby={errors.buyerName ? 'buyerName-error' : undefined}
              />
              {errors.buyerName && (
                <p id="buyerName-error" className="text-destructive text-sm">
                  {errors.buyerName}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="buyerEmail">{t.order.email}</Label>
              <Input
                id="buyerEmail"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={values.buyerEmail}
                onChange={(event) => setField('buyerEmail', event.target.value)}
                aria-invalid={Boolean(errors.buyerEmail)}
                aria-describedby={errors.buyerEmail ? 'buyerEmail-error' : undefined}
              />
              {errors.buyerEmail && (
                <p id="buyerEmail-error" className="text-destructive text-sm">
                  {errors.buyerEmail}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="buyerPhone">{t.order.phone}</Label>
              <Input
                id="buyerPhone"
                name="tel"
                type="tel"
                autoComplete="tel"
                required
                value={values.buyerPhone}
                onChange={(event) => setField('buyerPhone', event.target.value)}
                aria-invalid={Boolean(errors.buyerPhone)}
                aria-describedby={errors.buyerPhone ? 'buyerPhone-error' : undefined}
              />
              {errors.buyerPhone && (
                <p id="buyerPhone-error" className="text-destructive text-sm">
                  {errors.buyerPhone}
                </p>
              )}
            </div>

            {exteriorColors.length > 0 && (
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">
                  {t.order.colour}
                  {selectedColor && (
                    <span className="text-muted-foreground ms-2 font-normal">{selectedColor.name}</span>
                  )}
                </legend>
                <ul className="flex flex-wrap gap-2.5 pt-1">
                  {exteriorColors.map((color) => (
                    <li key={color.id}>
                      <button
                        type="button"
                        aria-pressed={color.id === selectedColorId}
                        aria-label={color.name}
                        title={color.name}
                        onClick={() => setSelectedColorId(color.id)}
                        className={cn(
                          'block size-8 rounded-full border transition-all',
                          color.id === selectedColorId
                            ? 'ring-primary ring-offset-background border-transparent ring-2 ring-offset-2'
                            : 'border-border hover:scale-105',
                        )}
                        style={{ backgroundColor: color.hexCode }}
                      />
                    </li>
                  ))}
                </ul>
              </fieldset>
            )}

            <div className="space-y-2">
              <Label htmlFor="message">{t.order.messageOptional}</Label>
              <Textarea
                id="message"
                rows={4}
                value={values.message}
                onChange={(event) => setField('message', event.target.value)}
              />
            </div>

            <Button type="submit" size="lg" disabled={submitting} className="w-full sm:w-auto">
              {submitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {submitting ? t.order.submitting : t.order.submit}
            </Button>
          </form>
        </div>

        {/* Selected vehicle summary */}
        <aside className="lg:pt-2">
          <div className="border-border bg-card sticky top-24 overflow-hidden rounded-xl border shadow-[var(--shadow-card)]">
            {image && (
              <div className="bg-secondary relative aspect-16/10">
                <MediaImage src={image.url} alt={image.alt ?? car.model} fill sizes="480px" className="object-cover" />
              </div>
            )}
            <div className="p-5">
              <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                {t.order.selectedVehicle}
              </p>
              <h2 className="mt-1.5 text-lg font-semibold">
                {car.brand.name} {car.model}
              </h2>
              <p className="text-muted-foreground text-sm">
                {car.year}
                {car.trim ? ` · ${car.trim}` : ''}
              </p>
              <Separator className="my-4" />
              {/* The same figure the customer saw on the vehicle's page. */}
              <Price price={car.price} promoPrice={car.promoPrice} currency={car.currency} />
              {selectedColor && (
                <p className="text-muted-foreground mt-2 inline-flex items-center gap-2 text-sm">
                  <span
                    className="border-border size-4 rounded-full border"
                    style={{ backgroundColor: selectedColor.hexCode }}
                    aria-hidden="true"
                  />
                  {selectedColor.name}
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
