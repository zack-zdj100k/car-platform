import { SetMetadata } from '@nestjs/common';

export const OPTIONAL_AUTH_KEY = 'optionalAuth';

/**
 * Route is reachable anonymously, but a valid token is still decoded and
 * attached when present — used where behaviour differs for signed-in users
 * (for example recording a car view against an account).
 */
export const OptionalAuth = () => SetMetadata(OPTIONAL_AUTH_KEY, true);
