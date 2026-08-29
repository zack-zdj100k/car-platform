/**
 * Website settings (spec §33, §27, §75).
 *
 * The four figures in the `stats.*` group are the numbers listed in spec §33.
 * They are stored as CONFIGURABLE MARKETING CONTENT, not as computed analytics:
 * spec §33 forbids presenting invented numbers as live platform analytics, and
 * §45/§68 require the admin dashboard to compute its own metrics from the
 * database. The About page therefore renders these editable values, while the
 * admin overview renders real aggregates.
 */
export const settings: {
  key: string;
  value: unknown;
  group: string;
  isPublic: boolean;
  description: string;
}[] = [
  { key: 'site.name', value: 'ZODIC CAR', group: 'general', isPublic: true, description: 'Site name shown in the header and metadata. The brand name, shown in the header, the tab title and the footer.' },
  { key: 'site.tagline', value: 'Chinese cars: The best choice for quality & innovation', group: 'general', isPublic: true, description: 'Home hero headline (spec §8).' },
  { key: 'site.defaultLocale', value: 'EN', group: 'general', isPublic: true, description: 'Fallback locale — EN / FR / AR (spec §7).' },
  { key: 'site.contactEmail', value: 'contact@example.com', group: 'general', isPublic: true, description: 'Placeholder until the real address is provided.' },
  { key: 'site.contactPhone', value: '', group: 'general', isPublic: true, description: 'Placeholder until the real number is provided.' },

  { key: 'social.tiktok', value: '', group: 'social', isPublic: true, description: 'Official TikTok URL (spec §27) — intentionally empty; never invent account URLs.' },
  { key: 'social.instagram', value: '', group: 'social', isPublic: true, description: 'Official Instagram URL (spec §27) — intentionally empty.' },
  { key: 'social.facebook', value: '', group: 'social', isPublic: true, description: 'Official Facebook URL (spec §27) — intentionally empty.' },
  { key: 'social.github', value: '', group: 'social', isPublic: true, description: 'Project repository URL (spec §10) — set once the GitHub repo exists.' },

  { key: 'stats.carsListed', value: { label: '0', caption: 'Cars Listed' }, group: 'marketing-stats', isPublic: true, description: 'Counted from the database when the page is built (published cars, brands, visitors in 30 days). Only the caption is used; a zero is hidden.' },
  { key: 'stats.brands', value: { label: '0', caption: 'Brands' }, group: 'marketing-stats', isPublic: true, description: 'Counted from the database when the page is built (published cars, brands, visitors in 30 days). Only the caption is used; a zero is hidden.' },
  { key: 'stats.visitors', value: { label: '0', caption: 'Visitors' }, group: 'marketing-stats', isPublic: true, description: 'Counted from the database when the page is built (published cars, brands, visitors in 30 days). Only the caption is used; a zero is hidden.' },
  { key: 'stats.availability', value: { label: '24/7', caption: 'Platform Access' }, group: 'marketing-stats', isPublic: true, description: 'MARKETING CONTENT (spec §33), editable in admin settings. Not live analytics.' },

  { key: 'orders.requireAuth', value: true, group: 'orders', isPublic: true, description: 'When true a customer must be signed in to submit an order (system graph). Falls back to the REQUIRE_AUTH_FOR_ORDERS env value on first boot.' },
  { key: 'orders.notificationEmail', value: '', group: 'orders', isPublic: false, description: 'Overrides ADMIN_NOTIFICATION_EMAIL when set (spec §26).' },

  { key: 'cars.pageSize', value: 12, group: 'cars', isPublic: true, description: 'Default page size for the cars listing (spec §57 pagination).' },
  { key: 'compare.maxCars', value: 4, group: 'cars', isPublic: true, description: 'Maximum vehicles in a single comparison (spec §43).' },

  // Home features showcase (spec §9). Empty means "fall back to a placeholder",
  // so the section still renders before real photography is uploaded.
  { key: 'home.image.safety', value: '', group: 'home-images', isPublic: true, description: 'Safety & driver assistance photo (spec §9).' },
  { key: 'home.image.engine', value: '', group: 'home-images', isPublic: true, description: 'Engine photo (spec §9).' },
  { key: 'home.image.wheels', value: '', group: 'home-images', isPublic: true, description: 'Wheels photo — standard and sport (spec §9).' },
  { key: 'home.image.tyres', value: '', group: 'home-images', isPublic: true, description: 'Tyres photo — 14 and 16 inch (spec §9).' },
  { key: 'home.image.exterior', value: '', group: 'home-images', isPublic: true, description: 'Exterior design photo (spec §9).' },
  { key: 'home.image.interior', value: '', group: 'home-images', isPublic: true, description: 'Interior design photo (spec §9).' },

  /*
   * "The best of our cars" — the gallery above the feature diagram on the home
   * page. Six slots, each a photograph the administrator uploads with a caption
   * beside it, so the section is curated rather than whatever the catalogue
   * happens to sort first.
   */
  { key: 'home.best.1.image', value: '', group: 'best-of', isPublic: true, description: 'Best-of gallery photo 1.' },
  { key: 'home.best.1.caption', value: '', group: 'best-of', isPublic: true, description: 'Best-of gallery caption 1.' },
  { key: 'home.best.2.image', value: '', group: 'best-of', isPublic: true, description: 'Best-of gallery photo 2.' },
  { key: 'home.best.2.caption', value: '', group: 'best-of', isPublic: true, description: 'Best-of gallery caption 2.' },
  { key: 'home.best.3.image', value: '', group: 'best-of', isPublic: true, description: 'Best-of gallery photo 3.' },
  { key: 'home.best.3.caption', value: '', group: 'best-of', isPublic: true, description: 'Best-of gallery caption 3.' },
  { key: 'home.best.4.image', value: '', group: 'best-of', isPublic: true, description: 'Best-of gallery photo 4.' },
  { key: 'home.best.4.caption', value: '', group: 'best-of', isPublic: true, description: 'Best-of gallery caption 4.' },
  { key: 'home.best.5.image', value: '', group: 'best-of', isPublic: true, description: 'Best-of gallery photo 5.' },
  { key: 'home.best.5.caption', value: '', group: 'best-of', isPublic: true, description: 'Best-of gallery caption 5.' },
  { key: 'home.best.6.image', value: '', group: 'best-of', isPublic: true, description: 'Best-of gallery photo 6.' },
  { key: 'home.best.6.caption', value: '', group: 'best-of', isPublic: true, description: 'Best-of gallery caption 6.' },

  // Portrait shown on the About page (spec §29 — supplied, never invented).
  { key: 'about.image.portrait', value: '', group: 'about-images', isPublic: true, description: 'Photograph of the person behind the platform, shown on the About page.' },

  /*
   * The two documents the footer links to. Left empty deliberately: a privacy
   * notice and terms of use are the owner's statements, and inventing them
   * would put commitments in their name that they never made. While empty, the
   * pages say so plainly rather than returning a 404.
   */
  { key: 'legal.privacy', value: '', group: 'legal', isPublic: true, description: 'Privacy notice shown at /privacy.' },
  { key: 'legal.terms', value: '', group: 'legal', isPublic: true, description: 'Terms shown at /terms.' },

  { key: 'about.whoWeAre', value: '', group: 'about', isPublic: true, description: 'About page "Who We Are" copy (spec §29). Empty by design — the section is not rendered until a real story is written here. It used to ship with the word PLACEHOLDER in it, which customers read on the page.' },
  { key: 'about.mission', value: 'To make discovering the right car simple, visual, and inspiring.', group: 'about', isPublic: true, description: 'Mission statement, verbatim from spec §30.' },
];
