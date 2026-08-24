import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import type { Configuration } from './config/configuration';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const config = app.get(ConfigService<Configuration, true>);
  const appConfig = config.get('app', { infer: true });

  app.setGlobalPrefix(appConfig.apiPrefix);

  // Secure headers (spec §67).
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cookieParser());

  // Explicit origin allow-list; credentials are required for the refresh cookie.
  app.enableCors({
    origin: appConfig.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      // Unexpected properties are rejected rather than silently dropped, so a
      // client cannot smuggle fields such as `role` into a payload.
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  app.enableShutdownHooks();

  if (!appConfig.isProduction) {
    const swagger = new DocumentBuilder()
      .setTitle('Car Platform API')
      .setDescription('REST API for the Car Platform — see docs/API.md')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup(`${appConfig.apiPrefix}/docs`, app, SwaggerModule.createDocument(app, swagger));
    logger.log(`API documentation at http://localhost:${appConfig.port}/${appConfig.apiPrefix}/docs`);
  }

  await app.listen(appConfig.port);
  logger.log(`API listening on http://localhost:${appConfig.port}/${appConfig.apiPrefix} [${appConfig.env}]`);
}

void bootstrap();
