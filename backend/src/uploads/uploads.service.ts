import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { imageSize } from 'image-size';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import type { Configuration } from '../config/configuration';

export interface StoredImage {
  url: string;
  filename: string;
  width: number | null;
  height: number | null;
  sizeBytes: number;
  mimeType: string;
}

/**
 * Image storage for the admin car form (spec §47 Media, §63).
 *
 * Files are written to disk under UPLOAD_DIR and served back by the API. Three
 * rules drive the validation:
 *
 *   1. The file's real content decides whether it is accepted — the declared
 *      mime type and the extension are both attacker-controlled.
 *   2. SVG is refused. It is a document format that can carry script, and it
 *      would be served from our own origin.
 *   3. The stored name is random. An uploaded name could otherwise traverse
 *      directories or overwrite another file.
 */
@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  /** Formats accepted, mapped to the extension actually written. */
  private static readonly ALLOWED = new Map<string, string>([
    ['jpg', '.jpg'],
    ['png', '.png'],
    ['webp', '.webp'],
    ['avif', '.avif'],
    ['gif', '.gif'],
  ]);

  constructor(private readonly config: ConfigService<Configuration, true>) {}

  private get settings() {
    return this.config.get('upload', { infer: true });
  }

  /** Absolute, normalised upload directory. */
  private get directory(): string {
    return resolve(process.cwd(), this.settings.dir);
  }

  async ensureDirectory(): Promise<void> {
    if (!existsSync(this.directory)) {
      await mkdir(this.directory, { recursive: true });
      this.logger.log(`Created upload directory at ${this.directory}`);
    }
  }

  async store(file: Express.Multer.File): Promise<StoredImage> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('No file was received');
    }

    if (file.size > this.settings.maxBytes) {
      const limitMb = Math.round(this.settings.maxBytes / (1024 * 1024));
      throw new BadRequestException(`Image is too large. The limit is ${limitMb} MB.`);
    }

    // The real format, read from the file's own bytes.
    let dimensions: { width: number; height: number; type?: string };
    try {
      dimensions = imageSize(file.buffer);
    } catch {
      throw new UnprocessableEntityException('That file is not a readable image.');
    }

    const type = (dimensions.type ?? '').toLowerCase();
    const extension = UploadsService.ALLOWED.get(type === 'jpeg' ? 'jpg' : type);

    if (!extension) {
      throw new UnprocessableEntityException(
        `Unsupported image format${type ? ` (${type})` : ''}. Use JPG, PNG, WebP, AVIF or GIF.`,
      );
    }

    await this.ensureDirectory();

    // Random name: an uploaded filename must never influence the path.
    const filename = `${Date.now().toString(36)}-${randomBytes(8).toString('hex')}${extension}`;
    await writeFile(join(this.directory, filename), file.buffer);

    this.logger.log(`Stored ${filename} (${dimensions.width}×${dimensions.height}, ${file.size} bytes)`);

    return {
      url: `/uploads/${filename}`,
      filename,
      width: dimensions.width ?? null,
      height: dimensions.height ?? null,
      sizeBytes: file.size,
      mimeType: `image/${type === 'jpg' ? 'jpeg' : type}`,
    };
  }

  async storeMany(files: Express.Multer.File[]): Promise<StoredImage[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files were received');
    }
    return Promise.all(files.map((file) => this.store(file)));
  }

  /**
   * Deletes a previously stored image.
   *
   * Only a bare filename is accepted, and the resolved path is checked to be
   * inside the upload directory, so `../` can never escape it.
   */
  async remove(filename: string): Promise<void> {
    const safe = basename(filename);
    if (safe !== filename || !extname(safe)) {
      throw new BadRequestException('Invalid filename');
    }

    const target = resolve(this.directory, safe);
    if (!target.startsWith(this.directory)) {
      throw new BadRequestException('Invalid filename');
    }

    if (!existsSync(target)) {
      throw new NotFoundException('That image no longer exists');
    }

    await unlink(target);
    this.logger.log(`Deleted ${safe}`);
  }

  /** Used by tests to read a stored file back. */
  async read(filename: string): Promise<Buffer> {
    return readFile(resolve(this.directory, basename(filename)));
  }
}
