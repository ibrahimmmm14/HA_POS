#!/usr/bin/env node
/**
 * Restore HA_POS from a backup file.
 *
 *   npm run db:restore -- backups/ha_pos-20261005-020000.db
 *
 * Stop the app (npm run dev / npm start) before restoring. The current database
 * is first saved as prisma/<name>.before-restore-<timestamp>.db so a restore can be undone.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { resolveDbPath, timestamp } from './db-path.mjs';

const source = process.argv[2];
if (!source || !fs.existsSync(source)) {
  console.error('Usage: npm run db:restore -- <backup-file.db>');
  process.exit(1);
}

const check = new PrismaClient({ datasourceUrl: `file:${path.resolve(source)}` });
try {
  const [{ integrity_check: result }] = await check.$queryRawUnsafe('PRAGMA integrity_check');
  if (result !== 'ok') throw new Error(`integrity_check returned: ${result}`);
} catch (err) {
  console.error(`Refusing to restore, backup is not usable: ${err.message}`);
  process.exit(1);
} finally {
  await check.$disconnect();
}

const dbPath = resolveDbPath();
if (fs.existsSync(dbPath)) {
  const safety = dbPath.replace(/\.db$/, '') + `.before-restore-${timestamp()}.db`;
  fs.copyFileSync(dbPath, safety);
  console.log(`Current database saved to ${safety}`);
}
for (const suffix of ['-wal', '-shm', '-journal']) {
  if (fs.existsSync(dbPath + suffix)) fs.unlinkSync(dbPath + suffix);
}
fs.copyFileSync(source, dbPath);
console.log(`Restored ${source} -> ${dbPath}`);
console.log('Run "npx prisma migrate deploy" if the backup predates the latest schema changes, then start the app.');
