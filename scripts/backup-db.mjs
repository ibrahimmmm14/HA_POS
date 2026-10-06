#!/usr/bin/env node
/**
 * HA_POS database backup (off-site copy).
 *
 *   npx netlify dev:exec npm run db:backup
 *
 * Exports every table of the Netlify Database (Postgres) to one gzipped JSON file in
 * BACKUP_DIR (default ./backups), reads the file back to check it is complete, and keeps
 * the newest BACKUP_KEEP files (default 30). Exits non-zero on any failure so a scheduler
 * can alert. This is a portable copy you hold yourself, on top of the database
 * provider's own point-in-time restore.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { TABLES, timestamp, requireDatabaseUrl } from './tables.mjs';

requireDatabaseUrl();

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backupDir = path.resolve(ROOT, process.env.BACKUP_DIR || 'backups');
const keep = Number(process.env.BACKUP_KEEP || 30);
const prisma = new PrismaClient();

let snapshot;
try {
  // One read-only transaction so all tables come from the same moment
  const rows = await prisma.$transaction(
    TABLES.map((t) => prisma[t].findMany()),
    { isolationLevel: 'RepeatableRead' }
  );
  snapshot = {
    app: 'HA_POS',
    createdAt: new Date().toISOString(),
    tables: Object.fromEntries(TABLES.map((t, i) => [t, rows[i]])),
  };
} catch (err) {
  console.error('Backup failed while reading the database:', err.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}

fs.mkdirSync(backupDir, { recursive: true });
const target = path.join(backupDir, `ha_pos-${timestamp()}.json.gz`);
fs.writeFileSync(target, zlib.gzipSync(JSON.stringify(snapshot)));

// Verify: the file decompresses, parses and holds the same row counts
try {
  const check = JSON.parse(zlib.gunzipSync(fs.readFileSync(target)).toString('utf8'));
  for (const t of TABLES) {
    if (check.tables[t]?.length !== snapshot.tables[t].length) {
      throw new Error(`row count mismatch in ${t}`);
    }
  }
} catch (err) {
  console.error('Backup verification failed:', err.message);
  process.exit(1);
}

const sizeKb = Math.round(fs.statSync(target).size / 1024);
const total = TABLES.reduce((n, t) => n + snapshot.tables[t].length, 0);
console.log(
  `Backup OK: ${target} (${sizeKb} KB, ${total} rows, ` +
    `${snapshot.tables.client.length} clients, ${snapshot.tables.invoice.length} invoices)`
);

// Rotation: keep the newest `keep` backups
const backups = fs
  .readdirSync(backupDir)
  .filter((f) => /^ha_pos-\d{8}-\d{6}\.json\.gz$/.test(f))
  .sort()
  .reverse();
for (const old of backups.slice(keep)) {
  fs.unlinkSync(path.join(backupDir, old));
  console.log(`Removed old backup: ${old}`);
}
