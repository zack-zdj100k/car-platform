'use client';

import { useAsync } from '@/hooks/use-async';
import { useAuth } from '@/providers/auth-provider';
import { ordersService } from '@/services/customer.service';

/**
 * The colours of one vehicle this customer has already asked to see.
 *
 * A second request for the same car in the same colour is not a second
 * appointment — it is the same one, asked twice, and the showroom rings the
 * customer twice about one car. The API refuses it; this is what lets the page
 * say so before they fill the form in rather than after.
 *
 * A signed-out reader gets an empty answer and the ordinary booking button:
 * there is no identity to look anything up against, and the API does not check
 * guests either.
 */
export function useRequestedColours(carId: string) {
  const { token } = useAuth();

  const requested = useAsync<{ colorIds: string[]; withoutColour: boolean }>(
    () => ordersService.forCar(carId, { token }),
    [carId, token],
    { enabled: Boolean(token) },
  );

  const data = requested.data;

  return {
    /*
     * False while the answer is still coming, so the booking button is what a
     * reader sees first. Pressing it in that moment is not a trap: the form
     * asks the API, which refuses the repeat and says the same thing this page
     * would have.
     */
    has(colourId: string | null | undefined): boolean {
      if (!data) return false;
      return colourId ? data.colorIds.includes(colourId) : data.withoutColour;
    },
    reload: requested.reload,
  };
}
