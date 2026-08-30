#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Removes invented analytics, so the administration reports reality.
 *
 * The development seed filled the database with plausible activity — 7,647 car
 * views, favourites, browsing history and five orders from people who do not
 * exist — because a dashboard with nothing in it is hard to build against. It
 * is a bad thing to launch with: the site has never been published, so the true
 * number of visitors is zero, and a dashboard that says otherwise is worthless
 * for making decisions.
 *
 * What is removed: every car view, and the favourites, browsing history, saved
 * comparisons, orders and accounts belonging to demo customers.
 *
 * What is kept: the catalogue, the settings, the administrator account, and
 * every real person's account and order. Real accounts are the ones that are
 * not demo accounts — the fabricated ones all end in @carplatform.dev and are
 * listed below.
 *
 *   npm run analytics:reset            # show what would be removed
 *   npm run analytics:reset -- --yes   # remove it
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_EMAIL_SUFFIX = '@carplatform.dev';
const DEMO_ORDER_PREFIX = 'DEMO-';

/** The administrator signs in with this; it is not demo activity. */
const KEEP_EMAILS = new Set([process.env.SEED_ADMIN_EMAIL ?? 'admin@carplatform.dev']);

const confirmed = process.argv.includes('--yes');

async function main() {
  const demoUsers = await prisma.user.findMany({
    where: { email: { endsWith: DEMO_EMAIL_SUFFIX } },
    select: { id: true, email: true, role: true },
  });

  const removable = demoUsers.filter((user) => !KEEP_EMAILS.has(user.email));
  const removableIds = removable.map((user) => user.id);

  const [views, favourites, history, comparisons, demoOrders, realOrders, realUsers] = await Promise.all([
    prisma.carView.count(),
    prisma.favorite.count(),
    prisma.recentlyViewed.count(),
    prisma.comparison.count(),
    prisma.order.count({ where: { reference: { startsWith: DEMO_ORDER_PREFIX } } }),
    prisma.order.count({ where: { reference: { not: { startsWith: DEMO_ORDER_PREFIX } } } }),
    prisma.user.count({ where: { email: { not: { endsWith: DEMO_EMAIL_SUFFIX } } } }),
  ]);

  console.log('\nInvented activity in the database\n');
  console.log(`  car views ............... ${views}`);
  console.log(`  favourites .............. ${favourites}`);
  console.log(`  browsing history ........ ${history}`);
  console.log(`  saved comparisons ....... ${comparisons}`);
  console.log(`  demo orders ............. ${demoOrders}`);
  console.log(`  demo accounts ........... ${removable.length}`);
  console.log('\nKept\n');
  console.log(`  real orders ............. ${realOrders}`);
  console.log(`  real accounts ........... ${realUsers}`);
  console.log(`  the catalogue, the settings and the administrator account`);

  if (!confirmed) {
    console.log('\nNothing was changed. Run it again with --yes to remove the invented activity.\n');
    return;
  }

  /*
   * One transaction, in dependency order. Views and favourites reference both
   * cars and users, so they go before the accounts they belong to; orders keep
   * their own history rows and email log, which have to go with them.
   */
  const demoOrderIds = (
    await prisma.order.findMany({
      where: { reference: { startsWith: DEMO_ORDER_PREFIX } },
      select: { id: true },
    })
  ).map((order) => order.id);

  await prisma.$transaction([
    prisma.carView.deleteMany({}),
    prisma.recentlyViewed.deleteMany({}),
    prisma.favorite.deleteMany({}),
    prisma.comparisonCar.deleteMany({ where: { comparison: { userId: { in: removableIds } } } }),
    prisma.comparison.deleteMany({ where: { userId: { in: removableIds } } }),
    prisma.emailLog.deleteMany({ where: { orderId: { in: demoOrderIds } } }),
    prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: demoOrderIds } } }),
    prisma.order.deleteMany({ where: { id: { in: demoOrderIds } } }),
    prisma.refreshToken.deleteMany({ where: { userId: { in: removableIds } } }),
    prisma.passwordResetToken.deleteMany({ where: { userId: { in: removableIds } } }),
    prisma.user.deleteMany({ where: { id: { in: removableIds } } }),
  ]);

  console.log('\nRemoved. Every figure in the administration is now a real one.');
  console.log('Counting starts with your first real visitor.\n');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
