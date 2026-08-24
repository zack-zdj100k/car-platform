import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as reachable without authentication.
 *
 * Authentication is applied globally, so access is deny-by-default: forgetting
 * this decorator makes a route protected rather than accidentally public.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
