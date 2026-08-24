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
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { UploadsService } from './uploads.service';

/** Image upload for the admin car form (spec §47). Admin only. */
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

  @Delete(':filename')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a stored image (admin)' })
  async remove(@Param('filename') filename: string): Promise<void> {
    await this.uploads.remove(filename);
  }
}
