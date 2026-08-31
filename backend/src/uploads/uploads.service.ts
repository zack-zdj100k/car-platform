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
import { mkdir, open, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import type { Configuration } from '../config/configuration';
import { CloudinaryStorage } from './cloudinary.storage';

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
export interface StoredVideo {
  url: string;
  filename: string;
  sizeBytes: number;
}

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

  /**
   * Recognises the five accepted formats from their own leading bytes.
   *
   * This runs *before* the image parser, and exists for a specific reason:
   * `image-size` carries an unfixed advisory where malformed ICNS, JXL and HEIF
   * input drives its parsers into an infinite loop, hanging the process. None
   * of those three are formats we accept, so refusing anything whose signature
   * we do not recognise means the vulnerable code paths are never entered.
   *
   * HEIF is the awkward case: it shares the ISOBMFF `ftyp` container with AVIF,
   * so the brand is checked rather than the container.
   */
  private static detectSignature(buffer: Buffer): string | null {
    if (buffer.length < 16) return null;

    // JPEG — FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';

    // PNG — 89 50 4E 47 0D 0A 1A 0A
    if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
      return 'png';
    }

    // GIF — "GIF87a" or "GIF89a"
    if (buffer.subarray(0, 6).toString('ascii').match(/^GIF8[79]a$/)) return 'gif';

    // WebP — "RIFF" .... "WEBP"
    if (
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    ) {
      return 'webp';
    }

    // AVIF — ISOBMFF with an AVIF brand. Deliberately narrow: `heic` and `mif1`
    // share this container and route into the vulnerable HEIF parser.
    if (buffer.subarray(4, 8).toString('ascii') === 'ftyp') {
      const brand = buffer.subarray(8, 12).toString('ascii');
      if (brand === 'avif' || brand === 'avis') return 'avif';
    }

    return null;
  }

  constructor(
    private readonly config: ConfigService<Configuration, true>,
    private readonly cloudinary: CloudinaryStorage,
  ) {}

  /** Where files go. Local on a laptop; Cloudinary on a host with no disk. */
  private get remote(): boolean {
    return this.settings.driver === 'cloudinary';
  }

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

    // Identify the format from the file's own bytes before any parser runs.
    const type = UploadsService.detectSignature(file.buffer);
    const extension = type ? UploadsService.ALLOWED.get(type) : undefined;

    if (!type || !extension) {
      throw new UnprocessableEntityException(
        'That file is not a supported image. Use JPG, PNG, WebP, AVIF or GIF.',
      );
    }

    // Only now, on a format we recognise, read the dimensions.
    let dimensions: { width: number; height: number };
    try {
      dimensions = imageSize(file.buffer);
    } catch {
      throw new UnprocessableEntityException('That image could not be read. It may be corrupt.');
    }

    // Random name: an uploaded filename must never influence the path.
    const name = `${Date.now().toString(36)}-${randomBytes(8).toString('hex')}`;
    const filename = `${name}${extension}`;

    /*
     * Everything above this line is the same either way, and that is the point:
     * what a file is allowed to be does not depend on where it is kept.
     */
    let stored: { url: string; filename: string };

    if (this.remote) {
      stored = await this.cloudinary.putBuffer(file.buffer, name);
    } else {
      await this.ensureDirectory();
      await writeFile(join(this.directory, filename), file.buffer);
      stored = { url: `/uploads/${filename}`, filename };
    }

    this.logger.log(`Stored ${stored.filename} (${dimensions.width}×${dimensions.height}, ${file.size} bytes)`);

    return {
      url: stored.url,
      filename: stored.filename,
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
  async remove(reference: string): Promise<void> {
    /*
     * A URL is accepted as well as a filename, and is the form the
     * administration now sends: once a file may live somewhere else, the only
     * handle that is still true after a page reload is the address stored
     * against the vehicle. Working out what that address refers to belongs
     * here, where the destination is known.
     */
    const publicId = CloudinaryStorage.publicIdFromUrl(reference);
    if (publicId) {
      await this.cloudinary.destroy(publicId);
      return;
    }

    const filename = reference.startsWith('/uploads/')
      ? reference.slice('/uploads/'.length)
      : reference;

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

  /**
   * Stores an uploaded video.
   *
   * Written straight to disk rather than held in memory like the photographs.
   * A video is an order of magnitude larger, and buffering eighty megabytes per
   * upload — several at once, from an administrator adding a clip to every car
   * — is a straightforward way to exhaust a small server's memory.
   *
   * The consequence is that the file exists before it has been checked, so the
   * check happens on what was written and a rejected file is deleted again.
   */
  async storeVideo(file: Express.Multer.File): Promise<StoredVideo> {
    if (!file?.path) {
      throw new BadRequestException('No file was received');
    }

    const written = resolve(file.path);

    const reject = async (message: string): Promise<never> => {
      await unlink(written).catch(() => undefined);
      throw new UnprocessableEntityException(message);
    };

    // The first bytes decide the format. The declared type and the extension
    // are both the uploader's to invent.
    const handle = await open(written, 'r');
    let head: Buffer;
    try {
      head = Buffer.alloc(16);
      await handle.read(head, 0, 16, 0);
    } finally {
      await handle.close();
    }

    const extension = UploadsService.detectVideoSignature(head);
    if (!extension) {
      return reject('That file is not a supported video. Use MP4, MOV or WebM.');
    }

    const name = `${Date.now().toString(36)}-${randomBytes(8).toString('hex')}`;
    const filename = `${name}${extension}`;

    if (this.remote) {
      /*
       * Sent from where multer wrote it, then removed. The local copy exists
       * only so the format could be checked without holding eighty megabytes
       * in memory, and it has no reason to outlive that check.
       */
      const stored = await this.cloudinary.putFile(written, name);
      await unlink(written).catch(() => undefined);
      this.logger.log(`Stored video ${stored.filename} (${file.size} bytes)`);
      return { url: stored.url, filename: stored.filename, sizeBytes: file.size };
    }

    await rename(written, join(this.directory, filename));

    this.logger.log(`Stored video ${filename} (${file.size} bytes)`);
    return { url: `/uploads/${filename}`, filename, sizeBytes: file.size };
  }

  /**
   * Recognises the three accepted video formats from their leading bytes.
   *
   * MP4 and QuickTime share the ISOBMFF container: both carry `ftyp` at byte
   * four, and the brand that follows says which. Both are stored as .mp4
   * because both are H.264 in practice and every browser plays them from that
   * extension; a .mov extension makes Firefox refuse a file it can decode.
   */
  private static detectVideoSignature(head: Buffer): string | null {
    if (head.length >= 12 && head.toString('ascii', 4, 8) === 'ftyp') return '.mp4';
    // WebM/Matroska: the EBML header.
    if (head.length >= 4 && head.readUInt32BE(0) === 0x1a45dfa3) return '.webm';
    return null;
  }

  /** Used by tests to read a stored file back. */
  async read(filename: string): Promise<Buffer> {
    return readFile(resolve(this.directory, basename(filename)));
  }
}
