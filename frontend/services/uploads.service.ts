import { API_URL, ApiError } from './api-client';

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
