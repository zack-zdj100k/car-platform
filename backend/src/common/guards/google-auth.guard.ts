import { ExecutionContext, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import type { Configuration } from '../../config/configuration';

/**
 * Google OAuth entry guard.
 *
 * The Google routes are always mapped, but the Passport strategy only exists
 * once credentials are configured. Without this check Passport is asked for an
 * unknown strategy and the request dies as an opaque 500 — which is what a
 * visitor clicking "Continue with Google" used to get.
 *
 * Now an unconfigured provider answers with a clear, actionable 503 instead.
 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(private readonly config: ConfigService<Configuration, true>) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const google = this.config.get('auth', { infer: true }).google;

    if (!google.enabled) {
      throw new ServiceUnavailableException(
        'Google sign-in is not configured on this server. Set GOOGLE_CLIENT_ID, ' +
          'GOOGLE_CLIENT_SECRET and GOOGLE_CALLBACK_URL, then restart the API.',
      );
    }

    return super.canActivate(context);
  }
}
