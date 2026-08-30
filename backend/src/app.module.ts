import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { validateEnv, type Env } from './config/env.validation';
import { configuration, type Configuration } from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CarsModule } from './cars/cars.module';
import { FavoritesModule } from './favorites/favorites.module';
import { RecentlyViewedModule } from './recently-viewed/recently-viewed.module';
import { ComparisonsModule } from './comparisons/comparisons.module';
import { OrdersModule } from './orders/orders.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SettingsModule } from './settings/settings.module';
import { UploadsModule } from './uploads/uploads.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Environment is read from the repository root so frontend and backend
      // share a single .env file.
      envFilePath: ['../.env', '.env'],
      validate: (raw: Record<string, unknown>) => configuration(validateEnv(raw)),
      cache: true,
    }),
    ThrottlerModule.forRootAsync({
      imports: [JwtModule.register({})],
      inject: [ConfigService, JwtService],
      useFactory: (config: ConfigService<Configuration, true>, jwt: JwtService) => {
        const throttle = config.get('throttle', { infer: true });
        const { accessSecret } = config.get('auth', { infer: true });
        const isTest = config.get('app', { infer: true }).env === 'test';

        return {
          throttlers: [{ ttl: throttle.ttl * 1000, limit: throttle.limit }],
          /*
           * Signed-in callers are counted per account, anonymous ones per
           * address. A household, an office or a mobile carrier puts many
           * genuine customers behind one NAT address, so an address-keyed
           * bucket makes them share a single quota — one shopper submitting
           * enquiries locks out their colleagues. The bearer token is verified
           * against the access secret before its subject is used as the key:
           * trusting an unverified `sub` would let a caller mint a fresh bucket
           * per request and remove the limit altogether.
           */
          getTracker: (req: Record<string, unknown>) => {
            const header = (req.headers as Record<string, unknown> | undefined)?.authorization;

            if (typeof header === 'string' && header.startsWith('Bearer ')) {
              try {
                const payload = jwt.verify<{ sub?: string }>(header.slice(7), {
                  secret: accessSecret,
                });
                if (payload.sub) {
                  return `user:${payload.sub}`;
                }
              } catch {
                // Expired or forged: fall back to the address below.
              }
            }

            const forwarded = req.ips as string[] | undefined;
            return `ip:${forwarded?.length ? forwarded[0] : (req.ip as string)}`;
          },
          /*
           * Integration tests issue every request from one address, so the
           * limiter would reject later cases for reasons unrelated to what they
           * assert. Disabled only under NODE_ENV=test — which env validation
           * restricts to development | test | production, so this can never be
           * switched on accidentally in production.
           */
          skipIf: () => isTest,
        };
      },
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CarsModule,
    FavoritesModule,
    RecentlyViewedModule,
    ComparisonsModule,
    OrdersModule,
    AnalyticsModule,
    NotificationsModule,
    SettingsModule,
    UploadsModule,
    DashboardModule,
    HealthModule,
  ],
  providers: [
    // Order matters: rate limit, then authenticate, then authorize.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}

export type { Env };
