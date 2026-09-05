/**
 * A WhatsApp link to the showroom.
 *
 * The business runs on conversations rather than checkouts, so the moment an
 * appointment is requested is the moment a customer most wants to say one more
 * thing — and the reply they are waiting for is more likely to arrive if they
 * can start the conversation themselves.
 *
 * `wa.me` takes a number in international form with no punctuation. Algerian
 * numbers are written locally as 0774 84 04 92, which that link rejects, so a
 * leading zero is replaced with the country code rather than sent as typed.
 */
const DEFAULT_COUNTRY_CODE = '213';

export function whatsappLink(phone: string, message: string): string | null {
  const digits = phone.replace(/[^\d+]/g, '');
  if (!digits) return null;

  let international = digits.startsWith('+') ? digits.slice(1) : digits;
  if (international.startsWith('00')) international = international.slice(2);
  else if (international.startsWith('0')) international = `${DEFAULT_COUNTRY_CODE}${international.slice(1)}`;

  // Too short to be a real number: better no button than one that opens a
  // conversation with nobody.
  if (international.length < 8) return null;

  return `https://wa.me/${international}?text=${encodeURIComponent(message)}`;
}
