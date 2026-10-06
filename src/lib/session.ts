/**
 * Signed session cookie. The cookie holds only the user id and an expiry, signed with HMAC-SHA256;
 * everything else (role, permissions, active flag) is read from the database on each request,
 * so disabling a user or changing permissions takes effect immediately.
 */
import { createHash } from 'node:crypto';

export const SESSION_COOKIE = 'ha_session';
export const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;

function secret(): string {
  const explicit = process.env.SESSION_SECRET;
  if (explicit && explicit.length >= 16) return explicit;
  // Fall back to a key derived from the database connection string: it is only known to the server.
  const db = process.env.NETLIFY_DB_URL || process.env.DATABASE_URL;
  if (db) return createHash('sha256').update(`ha-pos-session-v1:${db}`).digest('hex');
  throw new Error('SESSION_SECRET is not configured');
}

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

const b64 = (bytes: ArrayBuffer | Uint8Array) => Buffer.from(bytes as ArrayBuffer).toString('base64url');

/** Short fingerprint of the current password hash: changing the password makes older sessions invalid. */
export function passwordFingerprint(passwordHash: string | null | undefined): string {
  return createHash('sha256').update(`pv:${passwordHash ?? ''}`).digest('hex').slice(0, 16);
}

export async function signSession(userId: string, passwordHash: string | null | undefined): Promise<string> {
  const payload = b64(
    new TextEncoder().encode(
      JSON.stringify({
        uid: userId,
        pv: passwordFingerprint(passwordHash),
        exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
      })
    )
  );
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(), new TextEncoder().encode(payload));
  return `${payload}.${b64(sig)}`;
}

/** Returns the user id and password fingerprint if the token is genuine and not expired, otherwise null. */
export async function verifySession(token: string | undefined | null): Promise<{ uid: string; pv: string } | null> {
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  try {
    const ok = await crypto.subtle.verify(
      'HMAC',
      await hmacKey(),
      Buffer.from(sig, 'base64url'),
      new TextEncoder().encode(payload)
    );
    if (!ok) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof data.uid !== 'string' || typeof data.pv !== 'string' || typeof data.exp !== 'number') return null;
    return data.exp > Math.floor(Date.now() / 1000) ? { uid: data.uid, pv: data.pv } : null;
  } catch {
    return null;
  }
}

export function sessionCookie(token: string): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}${secure}`;
}

export function clearedSessionCookie(): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}
