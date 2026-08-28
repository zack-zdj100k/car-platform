#!/usr/bin/env node
/**
 * Checks the three things that stop `npm run dev` from working, before it runs.
 *
 * Every one of these has actually happened on this machine:
 *
 *   1. PostgreSQL was not running. It had shut down uncleanly and left a stale
 *      `postmaster.pid` behind, so every restart failed and the API died with
 *      "Can't reach database server". From the outside it looked as though the
 *      data had been lost.
 *
 *   2. A previous server was still holding a port, so the new one exited with
 *      EADDRINUSE and only one half of the site came up.
 *
 *   3. A migration existed that the database had not been given, which fails
 *      later and further away, as a query about a column that does not exist.
 *
 * The point is to fail here, with the remedy, rather than three layers down in
 * somebody else's stack trace.
 */

import { execFile, execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createConnection } from 'node:net';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const GREEN = '[32m';
const RED = '[31m';
const YELLOW = '[33m';
const DIM = '[2m';
const RESET = '[0m';

const ok = (message) => console.log(`${GREEN}✓${RESET} ${message}`);
const warn = (message) => console.log(`${YELLOW}!${RESET} ${message}`);
const fail = (message) => console.log(`${RED}✗${RESET} ${message}`);
const hint = (message) => console.log(`  ${DIM}${message}${RESET}`);

/** Reads a single value out of the shared .env without loading dotenv. */
function envValue(key) {
  const file = join(ROOT, '.env');
  if (!existsSync(file)) return undefined;
  const match = readFileSync(file, 'utf8').match(new RegExp(`^${key}="?([^"\\n]*)"?$`, 'm'));
  return match?.[1];
}

function tcpOpen(port, host = '127.0.0.1', timeout = 1000) {
  return new Promise((resolvePort) => {
    const socket = createConnection({ port, host });
    const done = (value) => {
      socket.destroy();
      resolvePort(value);
    };
    socket.setTimeout(timeout);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

/** Who is holding a port, and whether it belongs to this project. */
function portHolder(port) {
  try {
    const pids = execFileSync('lsof', ['-ti', `tcp:${port}`, '-sTCP:LISTEN'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .split('\n')
      .filter(Boolean);

    return pids.map((pid) => {
      let command = '';
      try {
        command = execFileSync('ps', ['-o', 'command=', '-p', pid], {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        }).trim();
      } catch {
        // The process vanished between the two calls; nothing to report.
      }

      /*
       * Ownership is decided by the process's working directory, not by its
       * command line. A server started by hand as `node dist/main.js` carries no
       * absolute path at all, and matching on the command line called this
       * project's own backend a stranger and refused to start.
       */
      let cwd = '';
      try {
        cwd = execFileSync('lsof', ['-p', pid, '-a', '-d', 'cwd', '-Fn'], {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        })
          .split('\n')
          .find((line) => line.startsWith('n'))
          ?.slice(1) ?? '';
      } catch {
        // lsof can refuse for processes owned by another user; fall back below.
      }

      const mine = cwd.startsWith(ROOT) || command.includes(ROOT);
      return { pid, command, cwd, mine };
    });
  } catch {
    return [];
  }
}

async function checkDatabase() {
  const url = envValue('DATABASE_URL');
  if (!url) {
    fail('DATABASE_URL is missing from car-platform/.env');
    return false;
  }

  const port = Number(new URL(url).port || 5432);
  const database = new URL(url).pathname.replace(/^\//, '').split('?')[0];

  if (await tcpOpen(port)) {
    ok(`PostgreSQL is accepting connections on ${port} (database ${database})`);
    return true;
  }

  warn(`PostgreSQL is not answering on port ${port} — trying to start it`);

  try {
    await run('brew', ['services', 'start', 'postgresql@17'], { timeout: 30_000 });
  } catch {
    // Reported below by the connection check, with the manual remedy.
  }

  for (let attempt = 0; attempt < 12; attempt += 1) {
    await new Promise((r) => setTimeout(r, 1000));
    if (await tcpOpen(port)) {
      ok(`PostgreSQL started (database ${database})`);
      return true;
    }
  }

  fail('PostgreSQL will not start');

  /*
   * The specific failure seen on this machine: an unclean shutdown leaves a
   * lock file naming a process id that the system has since given to something
   * else, and every start refuses. The data is untouched — only the lock is
   * stale.
   */
  for (const dataDir of ['/usr/local/var/postgresql@17', '/opt/homebrew/var/postgresql@17']) {
    if (existsSync(join(dataDir, 'postmaster.pid'))) {
      hint('A stale lock file is the usual cause. Your data is safe; the lock is not:');
      hint(`  rm -f ${dataDir}/postmaster.pid && brew services restart postgresql@17`);
      return false;
    }
  }

  hint('Start it by hand and look at the log:');
  hint('  brew services restart postgresql@17');
  hint('  tail -20 /usr/local/var/log/postgresql@17.log');
  return false;
}

async function checkPorts() {
  /*
   * The backend's port really does come from .env — Nest reads it there. The
   * frontend's does not: `next dev` takes it on the command line, so 3000 is
   * fixed in the frontend's own script and repeated here rather than pretending
   * a FRONTEND_PORT variable would be honoured.
   */
  const frontend = 3000;
  const backend = Number(envValue('BACKEND_PORT') ?? 4000);
  let clear = true;

  for (const [name, port] of [
    ['frontend', frontend],
    ['backend', backend],
  ]) {
    const holders = portHolder(port);
    if (holders.length === 0) {
      ok(`Port ${port} is free for the ${name}`);
      continue;
    }

    /*
     * A leftover server of this project's own is stopped automatically: it is
     * the same thing this command is about to start, and leaving it there means
     * half the site silently fails to come up.
     */
    const mine = holders.filter((holder) => holder.mine);
    const theirs = holders.filter((holder) => !holder.mine);

    for (const holder of mine) {
      try {
        process.kill(Number(holder.pid), 'SIGTERM');
        warn(`Stopped a leftover ${name} server on port ${port} (pid ${holder.pid})`);
      } catch {
        warn(`Could not stop pid ${holder.pid} on port ${port}`);
      }
    }

    if (theirs.length > 0) {
      clear = false;
      fail(`Port ${port} is held by something that is not this project`);
      for (const holder of theirs) hint(`pid ${holder.pid}: ${holder.command.slice(0, 90)}`);
      hint(
        name === 'frontend'
          ? 'Stop it, or change the port in frontend/package.json → "dev"'
          : 'Stop it, or change BACKEND_PORT in car-platform/.env',
      );
    }
  }

  if (!clear) return false;

  // A SIGTERM'd server does not release its port instantly; wait for it rather
  // than handing the next process an EADDRINUSE.
  for (const port of [frontend, backend]) {
    for (let attempt = 0; attempt < 20 && (await tcpOpen(port, '127.0.0.1', 300)); attempt += 1) {
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  return true;
}

async function checkMigrations() {
  try {
    const { stdout } = await run('npx', ['prisma', 'migrate', 'status'], {
      cwd: ROOT,
      timeout: 60_000,
      env: process.env,
    });
    if (stdout.includes('Database schema is up to date')) {
      ok('Database schema is up to date');
      return true;
    }
    warn('The database is missing a migration');
    hint('npm run prisma:deploy');
    return true;
  } catch (error) {
    const output = String(error.stdout ?? '') + String(error.stderr ?? '');
    if (output.includes('following migration')) {
      warn('The database is missing a migration');
      hint('npm run prisma:deploy');
    } else {
      warn('Could not read the migration status (continuing)');
    }
    return true;
  }
}

console.log(`\n${DIM}Checking the development environment…${RESET}\n`);

if (!existsSync(join(ROOT, '.env'))) {
  fail('car-platform/.env is missing — the whole project reads its settings from it');
  hint('Copy .env.example to .env and fill in DATABASE_URL and the secrets');
  process.exit(1);
}
ok('car-platform/.env found');

const database = await checkDatabase();
if (!database) {
  console.log(`\n${RED}Not starting: the database has to be up first.${RESET}\n`);
  process.exit(1);
}

await checkMigrations();
const ports = await checkPorts();
if (!ports) {
  console.log(`\n${RED}Not starting: a port is occupied.${RESET}\n`);
  process.exit(1);
}

const frontendPort = '3000';
const backendPort = envValue('BACKEND_PORT') ?? '4000';
console.log(
  `\n${GREEN}Ready.${RESET}  site http://localhost:${frontendPort}   api http://localhost:${backendPort}/api\n`,
);
