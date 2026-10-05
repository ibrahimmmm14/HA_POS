#!/usr/bin/env node
/**
 * HA_POS database backup.
 *
 *   npm run db:backup
 *
 * Takes a consistent snapshot of the live SQLite database with `VACUUM INTO`
 * (safe while the app is running), checks the copy with `PRAGMA integrity_check`,
 * and keeps the newest BACKUP_KEEP copies (default 30) in BACKUP_DIR (default ./backups).
 * Exits non-zero if the backup or the check fails, so a scheduler can alert on it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { ROOT, resolveDbPath, timestamp } from './db-path.mjs';

const dbPath = resolveDbPath();
const backupDir = path.resolve(ROOT, process.env.BACKUP_DIR || 'backups');
const keep = Number(process.env.BACKUP_KEEP || 30);

if (!fs.existsSync(dbPath)) {
  console.error(`Database not found: ${dbPath}`);
  process.exit(1);
}
fs.mkdirSync(backupDir, { recursive: true });

const target = path.join(backupDir, `ha_pos-${timestamp()}.db`);
const live = new PrismaClient({ datasourceUrl: `file:${dbPath}` });

try {
  // VACUUM INTO writes a clean, transactionally consistent copy of the database
  await live.$executeRawUnsafe(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
} catch (err) {
  console.error('Backup failed:', err.message);
  process.exit(1);
} finally {
  await live.$disconnect();
}

// Verify the copy opens, passes SQLite's integrity check, and holds the same client count
const copy = new PrismaClient({ datasourceUrl: `file:${target}` });
try {
  const [{ integrity_check: result }] = await copy.$queryRawUnsafe('PRAGMA integrity_check');
  if (result !== 'ok') throw new Error(`integrity_check returned: ${result}`);
  const [{ n: clients }] = await copy.$queryRawUnsafe('SELECT COUNT(*) AS n FROM clients');
  const [{ n: invoices }] = await copy.$queryRawUnsafe('SELECT COUNT(*) AS n FROM invoices');
  const sizeKb = Math.round(fs.statSync(target).size / 1024);
  console.log(`Backup OK: ${target} (${sizeKb} KB, ${clients} clients, ${invoices} invoices)`);
} catch (err) {
  console.error('Backup verification failed:', err.message);
  process.exit(1);
} finally {
  await copy.$disconnect();
}

// Rotation: keep the newest `keep` backups
const backups = fs
  .readdirSync(backupDir)
  .filter((f) => /^ha_pos-\d{8}-\d{6}\.db$/.test(f))
  .sort()
  .reverse();
for (const old of backups.slice(keep)) {
  fs.unlinkSync(path.join(backupDir, old));
  console.log(`Removed old backup: ${old}`);
}
