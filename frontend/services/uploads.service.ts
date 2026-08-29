import { API_URL, ApiError } from './api-client';

export interface UploadedVideo {
  url: string;
  filename: string;
  sizeBytes: number;
}

export interface UploadedImage {
  url: string;
  filename: string;
  width: number | null;
  height: number | null;
  sizeBytes: number;
  mimeType: string;
}

/**
 * Image upload.
 *
 * Uses FormData rather than the JSON client, since the body is multipart. Still
 * lives in the service layer so components never call `fetch` (spec §58).
 */
export const uploadsService = {
  async uploadImage(file: File, token: string | null): Promise<UploadedImage> {
    const body = new FormData();
    body.append('file', file);

    const response = await fetch(`${API_URL}/uploads/image`, {
      method: 'POST',
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
      body,
    });

    if (!response.ok) {
      let message = 'Upload failed';
      try {
        const parsed = (await response.json()) as { message?: string | string[] };
        message = (Array.isArray(parsed.message) ? parsed.message[0] : parsed.message) ?? message;
      } catch {
        /* keep the default */
      }
      throw new ApiError(response.status, message);
    }

    return (await response.json()) as UploadedImage;
  },

  /**
   * Several images at once, a few at a time.
   *
   * The admin used to upload a 360° set one file at a time — twenty-four
   * requests, each waiting for the one before, which is most of the wait a
   * person notices when adding a set. These go four at a time instead.
   *
   * Not the API's own batch endpoint, which would be one request for the lot:
   * it silently drops everything past the second file, so a set of twenty-four
   * would come back as two frames and no error. Until that is fixed this is
   * both faster than before and correct.
   *
   * Results come back in the order the files were given, whatever order they
   * finish in — a 360° set's angles depend on it.
   */
  async uploadImages(files: File[], token: string | null): Promise<UploadedImage[]> {
    const CONCURRENCY = 4;
    const results: UploadedImage[] = new Array(files.length);
    let next = 0;

    const worker = async (): Promise<void> => {
      for (;;) {
        const index = next++;
        if (index >= files.length) return;
        results[index] = await uploadsService.uploadImage(files[index], token);
      }
    };

    /*
     * One rejection fails the whole call, deliberately: every caller here
     * replaces a set outright, and half a set is worse than none. The files
     * that did upload are left on the server unreferenced, which the form
     * clears up after the next save.
     */
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, files.length) }, worker));
    return results;
  },

  /**
   * A car's video clip.
   *
   * Separate from the image endpoint because the server keeps videos on disk
   * rather than in memory and allows them to be far larger — eighty megabytes
   * against eight.
   */
  async uploadVideo(file: File, token: string | null): Promise<UploadedVideo> {
    const body = new FormData();
    body.append('file', file);

    const response = await fetch(`${API_URL}/uploads/video`, {
      method: 'POST',
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
      body,
    });

    if (!response.ok) {
      let message = 'Upload failed';
      try {
        const parsed = (await response.json()) as { message?: string | string[] };
        message = (Array.isArray(parsed.message) ? parsed.message[0] : parsed.message) ?? message;
      } catch {
        /* keep the default */
      }
      throw new ApiError(response.status, message);
    }

    return (await response.json()) as UploadedVideo;
  },

  async deleteImage(filename: string, token: string | null): Promise<void> {
    await fetch(`${API_URL}/uploads/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    });
  },
};

/** Uploaded images live on the API origin; local placeholders are site-relative. */
export function resolveImageUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads/')) {
    return `${API_URL.replace(/\/api$/, '')}${url}`;
  }
  return url;
}
