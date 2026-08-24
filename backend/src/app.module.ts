import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
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
      inject: [ConfigService],
      useFactory: (config: ConfigService<Configuration, true>) => {
        const throttle = config.get('throttle', { infer: true });
        return { throttlers: [{ ttl: throttle.ttl * 1000, limit: throttle.limit }] };
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
