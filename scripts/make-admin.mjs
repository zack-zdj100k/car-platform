#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Gives an existing account administrator rights.
 *
 * The site ships with one administrator, `admin@carplatform.dev`, and every
 * account created by signing up is a customer. So the owner, signed in with
 * their own email, finds the administration closed to them and nothing explains
 * why — which is exactly what happened here.
 *
 * This does not create accounts and does not touch passwords: the person must
 * already have signed up, and they keep the password they chose.
 *
 *   npm run make:admin -- you@example.com
 *   npm run make:admin -- you@example.com --customer   (to undo it)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const email = args.find((argument) => !argument.startsWith('--'))?.trim().toLowerCase();
const role = args.includes('--customer') ? 'CUSTOMER' : 'ADMIN';

async function main() {
  if (!email) {
    console.log('\nWhich account?\n');
    console.log('  npm run make:admin -- you@example.com\n');

    const accounts = await prisma.user.findMany({
      select: { email: true, role: true, fullName: true },
      orderBy: [{ role: 'asc' }, { email: 'asc' }],
    });
    console.log('Accounts that exist:\n');
    for (const account of accounts) {
      console.log(`  ${account.role.padEnd(9)} ${account.email}  (${account.fullName})`);
    }
    console.log('');
    return;
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true, fullName: true } });

  if (!user) {
    console.log(`\nNo account with the email ${email}.`);
    console.log('Sign up on the site first, then run this again — it changes an');
    console.log('existing account and never creates one.\n');
    process.exitCode = 1;
    return;
  }

  if (user.role === role) {
    console.log(`\n${email} is already ${role.toLowerCase()}. Nothing to do.\n`);
    return;
  }

  await prisma.user.update({ where: { email }, data: { role } });
  console.log(`\n${user.fullName} (${email}) is now ${role.toLowerCase()}.`);
  console.log(role === 'ADMIN' ? 'Sign out and back in, then open /admin.\n' : 'They no longer have access to /admin.\n');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
