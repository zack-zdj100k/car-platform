import { Module, type Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Logger } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import type { Configuration } from '../config/configuration';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';

/**
 * Google's strategy is only registered when credentials exist (spec §3).
 * Registering it unconditionally would crash the application on boot with an
 * empty client ID, which is the documented default until credentials arrive.
 */
const googleStrategyProvider: Provider = {
  provide: 'GOOGLE_STRATEGY',
  inject: [ConfigService],
  useFactory: (config: ConfigService<Configuration, true>) => {
    const google = config.get('auth', { infer: true }).google;
    if (!google.enabled) {
      new Logger('AuthModule').warn(
        'Google sign-in is disabled — set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_CALLBACK_URL to enable it.',
      );
      return null;
    }
    return new GoogleStrategy(config);
  },
};

@Module({
  imports: [ConfigModule, PassportModule, JwtModule.register({}), NotificationsModule],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, TokenService, JwtStrategy, googleStrategyProvider],
  exports: [AuthService, PasswordService, TokenService],
})
export class AuthModule {}
