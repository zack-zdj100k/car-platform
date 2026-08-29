import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { resolve } from 'node:path';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { UploadsService } from './uploads.service';

/*
 * The video limit is read from the environment here rather than through
 * ConfigService.
 *
 * Not a shortcut: the interceptor below is a decorator, evaluated when this
 * class is defined, long before any injector exists. The default matches the
 * one in env.validation.ts, and a mismatch would only ever be more permissive
 * at the edge — the service checks the file it actually received.
 */
const VIDEO_LIMIT_BYTES = Number(process.env.MAX_VIDEO_UPLOAD_MB ?? 80) * 1024 * 1024;

/*
 * Written into the upload directory itself, under a temporary name, and never
 * into the system temp directory: renaming across two filesystems fails, and
 * whether those are the same is a property of the machine, not of this code.
 */
const UPLOAD_DIRECTORY = resolve(process.cwd(), process.env.UPLOAD_DIR ?? './uploads');

/** Image and video upload for the admin car form (spec §47). Admin only. */
@ApiTags('uploads')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  /**
   * The declared mime type is not checked here on purpose.
   *
   * It is supplied by the client, so it proves nothing, and different clients
   * set it inconsistently for the same file. The service reads the actual bytes
   * and decides from those — the only check that means anything.
   */
  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload one car image (admin)' })
  upload(@UploadedFile() file: Express.Multer.File) {
    return this.uploads.store(file);
  }

  @Post('images')
  @UseInterceptors(FilesInterceptor('files', 20))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload up to 20 car images at once (admin)' })
  uploadMany(@UploadedFiles() files: Express.Multer.File[]) {
    return this.uploads.storeMany(files);
  }

  @Post('video')
  @UseInterceptors(
    FileInterceptor('file', {
      /*
       * On disk, not in memory. A clip can be eighty megabytes; buffering that
       * per upload is how a small server runs out of memory. The service checks
       * the written file's own bytes and removes it if it is not a video.
       */
      storage: diskStorage({ destination: (_req, _file, done) => done(null, UPLOAD_DIRECTORY) }),
      limits: { fileSize: VIDEO_LIMIT_BYTES },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: "Upload a vehicle's video (admin)" })
  uploadVideo(@UploadedFile() file: Express.Multer.File) {
    return this.uploads.storeVideo(file);
  }

  @Delete(':filename')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a stored image (admin)' })
  async remove(@Param('filename') filename: string): Promise<void> {
    await this.uploads.remove(filename);
  }
}
