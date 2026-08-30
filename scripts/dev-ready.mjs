#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Says where the site is, once it is actually there.
 *
 * The preflight prints the addresses before either server starts, and by the
 * time both are ready that line is a hundred lines of Nest route mapping up the
 * scrollback. What is left at the bottom of the terminal is the API's own
 * "listening on http://localhost:4000/api" — so that is the address that gets
 * opened, and it answers 404, because it is an API and not a web page.
 *
 * This waits for both to answer and then prints the pair, last, with the one to
 * open marked.
 */

import { createConnection } from 'node:net';

const FRONTEND = 3000;
const BACKEND = Number(process.env.BACKEND_PORT ?? 4000);

const GREEN = '[32m';
const DIM = '[2m';
const BOLD = '[1m';
const RESET = '[0m';

function answering(port) {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host: '127.0.0.1' });
    const done = (value) => {
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(600);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

/** Waits for a port, giving up after a minute rather than hanging for ever. */
async function waitFor(port) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (await answering(port)) return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

const [site, api] = await Promise.all([waitFor(FRONTEND), waitFor(BACKEND)]);

if (!site || !api) {
  console.log(`\n${DIM}Still waiting: ${!site ? 'the site' : 'the API'} has not answered.${RESET}\n`);
  process.exit(0);
}

console.log(
  `\n${GREEN}Both running.${RESET}\n\n` +
    `  ${BOLD}Open this${RESET}   ${BOLD}http://localhost:${FRONTEND}${RESET}\n` +
    `  ${DIM}The API     http://localhost:${BACKEND}/api   — not a page; its documentation is at /api/docs${RESET}\n`,
);
