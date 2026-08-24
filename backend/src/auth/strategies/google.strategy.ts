import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type Profile, type VerifyCallback } from 'passport-google-oauth20';
import type { Configuration } from '../../config/configuration';

export interface GoogleProfile {
  googleId: string;
  email: string;
  fullName: string;
  picture?: string;
}

/**
 * Google OAuth 2.0 (spec §3, §36).
 *
 * Registered only when credentials are configured — see AuthModule. Without
 * this guard the application would fail to boot with empty credentials.
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService<Configuration, true>) {
    const google = config.get('auth', { infer: true }).google;
    super({
      clientID: google.clientId,
      clientSecret: google.clientSecret,
      callbackURL: google.callbackUrl,
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const email = profile.emails?.[0]?.value;

    if (!email) {
      done(new Error('Google account did not provide an email address'), undefined);
      return;
    }

    const result: GoogleProfile = {
      googleId: profile.id,
      email: email.toLowerCase(),
      fullName: profile.displayName || email.split('@')[0],
      picture: profile.photos?.[0]?.value,
    };

    done(null, result);
  }
}
