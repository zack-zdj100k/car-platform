import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Configuration } from '../config/configuration';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

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
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule implements OnModuleInit {
  constructor(private readonly uploads: UploadsService) {}

  async onModuleInit(): Promise<void> {
    await this.uploads.ensureDirectory();
  }
}
