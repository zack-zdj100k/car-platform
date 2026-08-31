import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { UploadApiResponse, v2 as CloudinaryClient } from 'cloudinary';
import { createReadStream } from 'node:fs';
import type { Configuration } from '../config/configuration';

/**
 * Uploaded files, kept somewhere that survives a deploy.
 *
 * The API's own filesystem does not. On a container host it is recreated from
 * the image every time the service restarts — a deploy, a crash, waking from
 * idle — so photographs uploaded through the administration are there in the
 * afternoon and gone by evening, leaving a catalogue of broken pictures and a
 * database full of URLs pointing at nothing.
 *
 * What this is not: a second place to decide whether a file is acceptable. The
 * bytes are read and identified before anything reaches here, exactly as they
 * are for local storage, because that check is what makes an upload safe and it
 * must not depend on which destination is configured.
 *
 * The folder is `zodic/`, so an account shared with another site stays legible.
 */

/** What both destinations return, so nothing above them knows the difference. */
export interface StoredFile {
  /** Absolute for Cloudinary, site-relative (/uploads/...) for local storage. */
  url: string;
  /** The handle this file is deleted by — a public id here, a filename there. */
  filename: string;
}

const FOLDER = 'zodic';

@Injectable()
export class CloudinaryStorage {
  private readonly logger = new Logger(CloudinaryStorage.name);
  private client: typeof CloudinaryClient | null = null;

  constructor(private readonly config: ConfigService<Configuration, true>) {}

  /**
   * Loads the SDK, and only then.
   *
   * Not a static import, and that is the whole point: the library reads
   * CLOUDINARY_URL out of `process.env` while it is being *imported*, and
   * throws from inside its own config file if the value is malformed. That
   * happens before any of this application's code runs, so a mistyped
   * credential killed the process with a stack trace from a third-party module
   * instead of the sentence written here — which was the one thing this class
   * was supposed to guarantee. Importing it lazily puts our message first.
   */
  private async ensureConfigured(): Promise<typeof CloudinaryClient> {
    if (this.client) return this.client;

    const url = this.config.get('upload', { infer: true }).cloudinaryUrl;
    if (!url) {
      throw new ServiceUnavailableException('Uploads are not configured on this server.');
    }

    if (!url.startsWith('cloudinary://')) {
      throw new ServiceUnavailableException(
        'CLOUDINARY_URL is malformed: it must be the whole value from the Cloudinary dashboard, starting with cloudinary:// — the name of the variable does not belong in it.',
      );
    }

    const parsed = new URL(url);
    const { v2 } = await import('cloudinary');
    v2.config({
      cloud_name: parsed.hostname,
      api_key: parsed.username,
      api_secret: decodeURIComponent(parsed.password),
      secure: true,
    });
    this.client = v2;
    return v2;
  }

  /** Sends bytes already held in memory — a photograph. */
  async putBuffer(buffer: Buffer, publicId: string): Promise<StoredFile> {
    const cloudinary = await this.ensureConfigured();

    const uploaded = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: FOLDER, public_id: publicId, resource_type: 'image', overwrite: false },
        (error, result) => {
          if (error || !result) {
            // Cloudinary's error type is not an Error, so it is wrapped rather
            // than thrown as-is — a rejection has to carry a stack.
            reject(new Error(error?.message ?? 'Cloudinary returned no result'));
            return;
          }
          resolve(result);
        },
      );
      stream.end(buffer);
    });

    this.logger.log(`Stored ${uploaded.public_id} (${uploaded.bytes} bytes)`);
    return { url: uploaded.secure_url, filename: uploaded.public_id };
  }

  /**
   * Sends a file from disk — a video, which is never held in memory because a
   * clip is an order of magnitude larger than a photograph.
   */
  async putFile(path: string, publicId: string): Promise<StoredFile> {
    const cloudinary = await this.ensureConfigured();

    const uploaded = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: FOLDER, public_id: publicId, resource_type: 'video', overwrite: false },
        (error, result) => {
          if (error || !result) {
            // Cloudinary's error type is not an Error, so it is wrapped rather
            // than thrown as-is — a rejection has to carry a stack.
            reject(new Error(error?.message ?? 'Cloudinary returned no result'));
            return;
          }
          resolve(result);
        },
      );
      createReadStream(path).pipe(stream);
    });

    this.logger.log(`Stored video ${uploaded.public_id} (${uploaded.bytes} bytes)`);
    return { url: uploaded.secure_url, filename: uploaded.public_id };
  }

  /**
   * Removes a file.
   *
   * A public id that is already gone is not an error worth raising: the caller
   * is tidying up after a save, and the outcome it wants — the file is not
   * there — is already true.
   */
  async destroy(publicId: string): Promise<void> {
    const cloudinary = await this.ensureConfigured();

    for (const type of ['image', 'video'] as const) {
      const result = (await cloudinary.uploader.destroy(publicId, { resource_type: type })) as {
        result?: string;
      };
      if (result.result === 'ok') {
        this.logger.log(`Deleted ${publicId}`);
        return;
      }
    }

    this.logger.warn(`Nothing to delete for ${publicId}`);
  }

  /**
   * The public id inside a Cloudinary URL.
   *
   * A delivery URL looks like
   * `https://res.cloudinary.com/<cloud>/image/upload/v1699/zodic/abc.jpg`, and
   * the id is everything after the version, without the extension. Reading it
   * back here is what lets the rest of the application refer to a file by the
   * only durable handle it has — the URL stored against the vehicle.
   */
  static publicIdFromUrl(url: string): string | null {
    let path: string;
    try {
      const parsed = new URL(url);
      if (!parsed.hostname.endsWith('cloudinary.com')) return null;
      path = parsed.pathname;
    } catch {
      return null;
    }

    const afterUpload = path.split('/upload/')[1];
    if (!afterUpload) return null;

    const withoutVersion = afterUpload.replace(/^v\d+\//, '');
    const withoutExtension = withoutVersion.replace(/\.[a-z0-9]+$/i, '');
    return withoutExtension || null;
  }
}
