/**
 * What a customer is told about stock, which is not the number.
 *
 * The count is the business's own information: a colour with one left and a
 * colour with forty are the same offer to somebody deciding whether to come and
 * look, and publishing "1 left" invents a pressure this site does not trade on.
 * So the public projections carry a flag, and the number is stripped.
 *
 * Null stock means "not counted" — every colour that predates the column, and
 * any colour the owner can always order in. Not counted is available. Zero is
 * sold out. Those are different statements, which is the whole reason the
 * column is nullable.
 */

export interface StockBearing {
  stock?: number | null;
}

/** Whether this colour can be booked. */
export function colourAvailable(colour: StockBearing): boolean {
  return colour.stock == null || colour.stock > 0;
}

/**
 * Swaps the count for a flag.
 *
 * Returned to customers; the administration reads the count through its own
 * routes, where it is the point.
 */
export function withoutStockCounts<T extends StockBearing>(
  colours: T[],
): (Omit<T, 'stock'> & { isAvailable: boolean })[] {
  return colours.map((colour) => {
    const rest = { ...colour } as Omit<T, 'stock'> & { stock?: number | null };
    delete rest.stock;
    return { ...(rest as Omit<T, 'stock'>), isAvailable: colourAvailable(colour) };
  });
}

/**
 * Whether the vehicle can be booked at all: true unless every one of its
 * exterior colours is counted and sold out.
 *
 * A vehicle in that state is still published, still readable, still
 * photographed — it simply cannot be booked. Deleting it, or hiding it, would
 * throw away the page a customer found on a search engine last week over a
 * stock level that changes on Monday.
 */
export function vehicleAvailable(colours: StockBearing[]): boolean {
  if (colours.length === 0) return true;
  return colours.some(colourAvailable);
}
