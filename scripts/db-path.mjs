// Resolves the SQLite file behind DATABASE_URL the same way Prisma does
// (relative "file:" paths are relative to the prisma/ folder).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  if (process.env.DATABASE_URL) return;
  const envFile = path.join(ROOT, '.env');
  if (!fs.existsSync(envFile)) return;
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*DATABASE_URL\s*=\s*"?([^"\n]+)"?/);
    if (m) process.env.DATABASE_URL = m[1];
  }
}

export function resolveDbPath() {
  loadEnv();
  const url = process.env.DATABASE_URL;
  if (!url || !url.startsWith('file:')) {
    throw new Error('DATABASE_URL must point to a SQLite file (file:...)');
  }
  const file = url.slice('file:'.length).split('?')[0];
  return path.isAbsolute(file) ? file : path.resolve(ROOT, 'prisma', file);
}

export function timestamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}
