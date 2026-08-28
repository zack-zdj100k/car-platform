import { config as loadEnv } from 'dotenv';
import type { NextConfig } from 'next';

/*
 * One environment file for the whole project.
 *
 * Next only reads `.env` files inside its own directory, so the frontend used to
 * keep its own copy of NEXT_PUBLIC_API_URL and NEXT_PUBLIC_SITE_URL alongside
 * the ones in `car-platform/.env`. Two copies of the same setting drift: change
 * the shared file and the site quietly carries on using the stale value, which
 * is a miserable thing to debug. The shared file is loaded here instead, and
 * anything already set in the environment still wins — so a one-off override on
 * the command line keeps working.
 */
loadEnv({ path: new URL('../.env', import.meta.url).pathname, override: false });

/**
 * Spec §6 defines /sign-in, /sign-up, /cars/[id] and /dashboard/recently-viewed,
 * while the Final Route Map defines /login, /signup, /car/:id and
 * /dashboard/recent. The route map is authoritative for routing, and every
 * variant from the master prompt redirects to it — so both documents' links
 * work. See docs/DECISIONS.md Part 1.
 */
/** The API the browser talks to, and whether it is on this machine. */
const apiUrl = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api');
  } catch {
    return null;
  }
})();

const apiIsLocal = ['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(apiUrl?.hostname ?? '');

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/sign-in', destination: '/login', permanent: true },
      { source: '/sign-up', destination: '/signup', permanent: true },
      { source: '/cars/:id', destination: '/car/:id', permanent: true },
      { source: '/cars/:id/order', destination: '/car/:id/order', permanent: true },
      { source: '/dashboard/recently-viewed', destination: '/dashboard/recent', permanent: true },
      { source: '/admin/cars/new', destination: '/admin/cars/add', permanent: true },
      { source: '/admin', destination: '/admin/dashboard', permanent: false },
    ];
  },

  images: {
    // Placeholder assets are local SVGs served from /public.
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    formats: ['image/avif', 'image/webp'],

    /*
     * Uploaded car photography is served by the API, which is a different
     * origin in production. Listing it here lets Next resize and re-encode
     * those photographs to AVIF/WebP rather than shipping the original file.
     *
     * Only the configured API host is allowed — an open pattern would turn the
     * optimiser into a proxy for arbitrary remote images.
     */
    /*
     * Next refuses to optimise an image whose host resolves to a private IP,
     * because an open optimiser is an SSRF vector.
     *
     * Keyed to the configured API host rather than NODE_ENV: `next start` runs
     * as production even on a laptop, so NODE_ENV cannot tell the two apart.
     * This is enabled only when the API is explicitly localhost — which is
     * exactly when the guard gets in the way and never true for a real
     * deployment.
     */
    dangerouslyAllowLocalIP: apiIsLocal,

    remotePatterns: apiUrl
      ? [
          {
            protocol: apiUrl.protocol.replace(':', '') as 'http' | 'https',
            hostname: apiUrl.hostname,
            port: apiUrl.port || undefined,
            pathname: '/uploads/**',
          },
        ]
      : [],
  },

  poweredByHeader: false,

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
