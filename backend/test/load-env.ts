import { config } from 'dotenv';
import { resolve } from 'node:path';

/**
 * Integration tests run against the dedicated test database, never the
 * development one — TEST_DATABASE_URL is promoted to DATABASE_URL before the
 * application module reads it.
 */
config({ path: resolve(__dirname, '../../.env') });

if (!process.env.TEST_DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL is required to run integration tests. See .env.example.');
}

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.NODE_ENV = 'test';
// Never attempt real delivery from a test run.
process.env.MAIL_PROVIDER = 'console';
