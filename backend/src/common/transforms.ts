import type { TransformFnParams } from 'class-transformer';

/**
 * Typed `@Transform` helpers.
 *
 * class-transformer types `value` as `any`. These wrappers narrow it to
 * `unknown` first, so DTOs stay free of implicit `any` and the strict lint rules
 * hold without exceptions.
 */

/** Trims surrounding whitespace from string input, leaving other types alone. */
export const trim = ({ value }: TransformFnParams): unknown => {
  const raw: unknown = value;
  return typeof raw === 'string' ? raw.trim() : raw;
};

/** Trims and lowercases — used for email addresses so lookups are consistent. */
export const trimLower = ({ value }: TransformFnParams): unknown => {
  const raw: unknown = value;
  return typeof raw === 'string' ? raw.trim().toLowerCase() : raw;
};

/** Accepts `true`, `"true"` and `"1"` from query strings and form bodies. */
export const toBoolean = ({ value }: TransformFnParams): unknown => {
  const raw: unknown = value;
  if (typeof raw === 'boolean') return raw;
  if (raw === 'true' || raw === '1') return true;
  if (raw === 'false' || raw === '0') return false;
  return raw;
};

/**
 * Normalises repeatable query parameters: accepts `?brand=a&brand=b` and
 * `?brand=a,b` alike, returning undefined when nothing usable was supplied.
 */
export const toStringArray = ({ value }: TransformFnParams): string[] | undefined => {
  const raw: unknown = value;
  if (raw === undefined || raw === null || raw === '') return undefined;

  const entries = (Array.isArray(raw) ? (raw as unknown[]) : [raw])
    .flatMap((entry) => String(entry).split(','))
    .map((entry) => entry.trim())
    .filter(Boolean);

  return entries.length > 0 ? entries : undefined;
};
