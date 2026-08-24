'use client';

import Image, { type ImageProps } from 'next/image';
import { resolveImageUrl } from '@/services/uploads.service';

/**
 * Car photography.
 *
 * Uploaded files are served by the API, which in production is a different host
 * from the site, while bundled placeholders are site-relative. This resolves
 * either form to a URL the browser can load, so no caller has to know where a
 * particular image came from.
 *
 * `alt` is named explicitly rather than passed through the spread, so both the
 * type checker and the accessibility lint rule can see that it is required.
 */
export function MediaImage({
  src,
  alt,
  ...props
}: Omit<ImageProps, 'src' | 'alt'> & { src: string; alt: string }) {
  return <Image {...props} src={resolveImageUrl(src)} alt={alt} />;
}
