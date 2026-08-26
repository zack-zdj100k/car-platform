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
  { key: 'site.name', value: 'Car Platform', group: 'general', isPublic: true, description: 'Site name shown in the header and metadata. Replace when the final brand name is provided.' },
  { key: 'site.tagline', value: 'Chinese cars: The best choice for quality & innovation', group: 'general', isPublic: true, description: 'Home hero headline (spec §8).' },
  { key: 'site.defaultLocale', value: 'EN', group: 'general', isPublic: true, description: 'Fallback locale — EN / FR / AR (spec §7).' },
  { key: 'site.contactEmail', value: 'contact@example.com', group: 'general', isPublic: true, description: 'Placeholder until the real address is provided.' },
  { key: 'site.contactPhone', value: '', group: 'general', isPublic: true, description: 'Placeholder until the real number is provided.' },

  { key: 'social.tiktok', value: '', group: 'social', isPublic: true, description: 'Official TikTok URL (spec §27) — intentionally empty; never invent account URLs.' },
  { key: 'social.instagram', value: '', group: 'social', isPublic: true, description: 'Official Instagram URL (spec §27) — intentionally empty.' },
  { key: 'social.facebook', value: '', group: 'social', isPublic: true, description: 'Official Facebook URL (spec §27) — intentionally empty.' },
  { key: 'social.github', value: '', group: 'social', isPublic: true, description: 'Project repository URL (spec §10) — set once the GitHub repo exists.' },

  { key: 'stats.carsListed', value: { label: '500+', caption: 'Cars Listed' }, group: 'marketing-stats', isPublic: true, description: 'MARKETING CONTENT (spec §33), editable in admin settings. Not live analytics.' },
  { key: 'stats.brands', value: { label: '50+', caption: 'Brands' }, group: 'marketing-stats', isPublic: true, description: 'MARKETING CONTENT (spec §33), editable in admin settings. Not live analytics.' },
  { key: 'stats.visitors', value: { label: '10K+', caption: 'Visitors' }, group: 'marketing-stats', isPublic: true, description: 'MARKETING CONTENT (spec §33), editable in admin settings. Not live analytics.' },
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

  // Portrait shown on the About page (spec §29 — supplied, never invented).
  { key: 'about.image.portrait', value: '', group: 'about-images', isPublic: true, description: 'Photograph of the person behind the platform, shown on the About page.' },

  { key: 'about.whoWeAre', value: 'PLACEHOLDER — supply the real founding story. Spec §29 forbids inventing facts about the owners.', group: 'about', isPublic: true, description: 'About page "Who We Are" copy (spec §29).' },
  { key: 'about.mission', value: 'To make discovering the right car simple, visual, and inspiring.', group: 'about', isPublic: true, description: 'Mission statement, verbatim from spec §30.' },
];
