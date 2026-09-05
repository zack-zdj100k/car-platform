import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Configuration } from '../config/configuration';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { CloudinaryStorage } from './cloudinary.storage';

@Module({
  imports: [
    ConfigModule,
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Configuration, true>) => ({
        // Held in memory so the bytes can be inspected before anything reaches
        // the disk — a file that fails validation is never written at all.
        storage: memoryStorage(),
        limits: { fileSize: config.get('upload', { infer: true }).maxBytes, files: 20 },
      }),
    }),
  ],
  controllers: [UploadsController],
  providers: [UploadsService, CloudinaryStorage],
  /*
   * MulterModule is re-exported so a module that imports this one gets the
   * same limits. Without it a `FileInterceptor` elsewhere falls back to
   * Multer's defaults and will buffer a file of any size into memory before
   * the service ever gets to refuse it.
   */
  exports: [UploadsService, MulterModule],
})
export class UploadsModule implements OnModuleInit {
  constructor(private readonly uploads: UploadsService) {}

  async onModuleInit(): Promise<void> {
    await this.uploads.ensureDirectory();
  }
}
