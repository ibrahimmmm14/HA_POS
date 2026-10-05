#!/usr/bin/env node
/**
 * Restore an HA_POS backup.
 *
 *   npx netlify dev:exec npm run db:restore -- backups/ha_pos-20261005-230000.json.gz
 *
 * Adds back every row in the backup that is missing from the database. It never changes
 * or deletes a row that already exists, so it is safe to run against the live database
 * (to recover deleted records) or against a fresh one (to rebuild everything).
 * The target needs the schema already (Netlify applies netlify/database/migrations on deploy).
 * Runs in one transaction: either every missing row is added, or nothing is.
 */
import fs from 'node:fs';
import zlib from 'node:zlib';
import { PrismaClient } from '@prisma/client';
import { TABLES, requireDatabaseUrl } from './tables.mjs';

const source = process.argv[2];
if (!source || !fs.existsSync(source)) {
  console.error('Usage: npm run db:restore -- <backup-file.json.gz>');
  process.exit(1);
}
requireDatabaseUrl();

let snapshot;
try {
  snapshot = JSON.parse(zlib.gunzipSync(fs.readFileSync(source)).toString('utf8'));
  if (snapshot.app !== 'HA_POS' || !snapshot.tables) throw new Error('not an HA_POS backup');
} catch (err) {
  console.error(`Refusing to restore, backup is not usable: ${err.message}`);
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  const before = Object.fromEntries(
    await Promise.all(TABLES.map(async (t) => [t, await prisma[t].count()]))
  );

  await prisma.$transaction(
    TABLES.filter((t) => snapshot.tables[t]?.length).map((t) =>
      prisma[t].createMany({ data: snapshot.tables[t], skipDuplicates: true })
    )
  );
  for (const t of TABLES) {
    const n = await prisma[t].count();
    const inBackup = snapshot.tables[t]?.length || 0;
    console.log(`${t.padEnd(18)} ${String(n - before[t]).padStart(5)} added, ${n} now (${inBackup} in backup)`);
  }
  console.log(`Restored ${source} (taken ${snapshot.createdAt}).`);
} catch (err) {
  console.error('Restore failed, nothing was written:', err.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
