import type { NextConfig } from 'next';

/**
 * Spec §6 defines /sign-in, /sign-up, /cars/[id] and /dashboard/recently-viewed,
 * while the Final Route Map defines /login, /signup, /car/:id and
 * /dashboard/recent. The route map is authoritative for routing, and every
 * variant from the master prompt redirects to it — so both documents' links
 * work. See docs/DECISIONS.md Part 1.
 */
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
    // Placeholder assets are local SVGs; real photography will be served from
    // the same public paths or an uploads directory.
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    formats: ['image/avif', 'image/webp'],
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
