#!/usr/bin/env tsx
/* eslint-disable no-console */
/**
 * Puts the website's settings into a database that has none.
 *
 * A fresh production database has the tables and nothing in them, and the
 * settings are not something the administration can create: the API rejects a
 * key it does not know, deliberately, so a typo cannot invent a setting the
 * site never reads. With the table empty, "Website Settings" is therefore an
 * empty page, the home page has no showroom card, no gallery and no figures,
 * and there is no way in from the outside.
 *
 * The full seed is not the answer for that: it also creates demo vehicles,
 * demo customers and demo orders, which have no business in a real catalogue.
 * This is the settings alone.
 *
 * Safe to run more than once. A key that already exists keeps its value — only
 * its grouping, visibility and description are refreshed, so a later release
 * that improves the wording of a description does not overwrite the address
 * somebody typed in.
 *
 *   DATABASE_URL="postgresql://..." npm run seed:settings
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { settings } from '../prisma/data/settings';

const prisma = new PrismaClient();

/** The host being written to, with the password left out of the log. */
function target(): string {
  const url = process.env.DATABASE_URL;
  if (!url) return 'unknown — DATABASE_URL is not set';
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.port ? `:${parsed.port}` : ''}${parsed.pathname}`;
  } catch {
    return 'unparseable DATABASE_URL';
  }
}

async function main(): Promise<void> {
  console.log(`\nSettings → ${target()}\n`);

  const existing = new Set(
    (await prisma.setting.findMany({ select: { key: true } })).map((row) => row.key),
  );

  let created = 0;

  for (const setting of settings) {
    if (existing.has(setting.key)) {
      // Everything but the value, which belongs to whoever edited it.
      await prisma.setting.update({
        where: { key: setting.key },
        data: {
          group: setting.group,
          isPublic: setting.isPublic,
          description: setting.description,
        },
      });
      continue;
    }

    await prisma.setting.create({
      data: {
        key: setting.key,
        value: setting.value as Prisma.InputJsonValue,
        group: setting.group,
        isPublic: setting.isPublic,
        description: setting.description,
      },
    });
    created += 1;
  }

  const kept = settings.length - created;
  console.log(`  created ....... ${created}`);
  console.log(`  already there . ${kept} (values untouched)`);
  console.log(
    created > 0
      ? '\nOpen Website Settings in the administration — the fields are there now.\n'
      : '\nNothing was missing.\n',
  );
}

main()
  .catch((error) => {
    console.error('\nCould not seed the settings:\n');
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
