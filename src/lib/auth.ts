/**
 * Server-side authentication helpers: password hashing, reading the signed-in user,
 * the sign-in activity log, and the `guarded()` wrapper that protects every API route.
 */
import { NextResponse } from 'next/server';
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { prisma } from '@/lib/db';
import { requestActor } from '@/lib/requestContext';
import { SESSION_COOKIE, passwordFingerprint, verifySession } from '@/lib/session';
import {
  Permission,
  Role,
  apiRequirement,
  effectivePermissions,
  parsePermissionOverride,
  satisfies,
} from '@/lib/permissions';

// ─── Passwords ────────────────────────────────────────────────────────────

const scrypt = (password: string, salt: Buffer): Promise<Buffer> =>
  new Promise((resolve, reject) =>
    scryptCb(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key)))
  );

export const MIN_PASSWORD_LENGTH = 8;

export function passwordProblem(password: unknown): string | null {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (password.length > 200) return 'Password is too long';
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt);
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  // Always do the same amount of work, so a missing user cannot be told apart by timing.
  const parts = (stored || '').split('$');
  const valid = parts.length === 3 && parts[0] === 'scrypt';
  const salt = valid ? Buffer.from(parts[1], 'base64') : Buffer.alloc(16);
  const expected = valid ? Buffer.from(parts[2], 'base64') : Buffer.alloc(64);
  const actual = await scrypt(password, salt);
  return valid && expected.length === actual.length && timingSafeEqual(expected, actual);
}

// ─── Current user ─────────────────────────────────────────────────────────

export interface AuthedUser {
  id: string;
  username: string;
  nameAr: string;
  nameEn: string;
  role: Role;
  branchIds: string[];
  currentBranchId: string;
  permissions: Permission[];
  mustChangePassword: boolean;
}

function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return rest.join('=');
  }
  return undefined;
}

export function toAuthedUser(row: {
  id: string; username: string; nameAr: string; nameEn: string; role: string;
  branchIds: string; currentBranchId: string; permissions: string | null; mustChangePassword: boolean;
}): AuthedUser {
  let branchIds: string[] = [];
  try {
    const parsed = JSON.parse(row.branchIds);
    if (Array.isArray(parsed)) branchIds = parsed.filter((b) => typeof b === 'string');
  } catch {
    /* no branches */
  }
  return {
    id: row.id,
    username: row.username,
    nameAr: row.nameAr,
    nameEn: row.nameEn,
    role: row.role as Role,
    branchIds,
    currentBranchId: row.currentBranchId,
    permissions: effectivePermissions(row.role, parsePermissionOverride(row.permissions)),
    mustChangePassword: row.mustChangePassword,
  };
}

/** The signed-in user, read fresh from the database; null if not signed in, disabled or deleted. */
export async function getSessionUser(request: Request): Promise<AuthedUser | null> {
  let session: { uid: string; pv: string } | null;
  try {
    session = await verifySession(readCookie(request, SESSION_COOKIE));
  } catch (error) {
    console.error('Session verification failed:', error);
    return null;
  }
  if (!session) return null;
  const row = await prisma.user.findUnique({ where: { id: session.uid } });
  if (!row || !row.active) return null;
  // The password was changed or reset after this session started
  if (session.pv !== passwordFingerprint(row.passwordHash)) return null;
  return toAuthedUser(row);
}

// ─── Route protection ─────────────────────────────────────────────────────

type Handler = (request: Request, context: any) => Promise<Response> | Response;

// The signed-in user for each request that passed guarded(), so handlers need no second lookup.
const usersByRequest = new WeakMap<Request, AuthedUser>();

/** The signed-in user of a request handled by a guarded() route. */
export function currentUser(request: Request): AuthedUser {
  const user = usersByRequest.get(request);
  if (!user) throw new Error('currentUser() called outside a guarded route');
  return user;
}

// ─── Branch scope ─────────────────────────────────────────────────────────
// A system administrator sees every branch. Everyone else only sees the branches assigned to them.

/** Branch ids the user may see, or null for "all branches". */
export function branchScope(user: AuthedUser): string[] | null {
  return user.role === 'super_admin' ? null : user.branchIds;
}

export function inScope(user: AuthedUser, branchId: string | null | undefined): boolean {
  const scope = branchScope(user);
  return scope === null || (!!branchId && scope.includes(branchId));
}

/** Prisma filter on a branch column: `{ branchId: scopeFilter(user) }` — undefined (no filter) for an administrator. */
export function scopeFilter(user: AuthedUser): { in: string[] } | undefined {
  const scope = branchScope(user);
  return scope === null ? undefined : { in: scope };
}

/**
 * Wrap an API route handler: rejects anyone who is not signed in or lacks the permission
 * that the route needs (see API_RULES in permissions.ts).
 */
export function guarded<H extends Handler>(handler: H): H {
  const wrapped = async (request: Request, context: any) => {
    const user = await getSessionUser(request);
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    if (user.mustChangePassword) {
      return NextResponse.json({ error: 'password_change_required' }, { status: 403 });
    }
    const need = apiRequirement(new URL(request.url).pathname, request.method);
    if (!satisfies(user.permissions, need)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    usersByRequest.set(request, user);
    // Audit entries written while handling this request are attributed to this user and their branch
    return requestActor.run(
      { userId: user.id, userName: user.nameAr, branchId: user.branchIds[0] ?? user.currentBranchId },
      () => handler(request, context)
    );
  };
  return wrapped as H;
}

/**
 * The branch a new record is filed under: the requested one if the user may use it,
 * otherwise their first branch. Returns null only if there is no branch at all.
 */
export async function resolveBranchId(user: AuthedUser, requested?: unknown): Promise<string | null> {
  const scope = branchScope(user);
  if (typeof requested === 'string' && (scope === null || scope.includes(requested))) {
    const exists = await prisma.branch.findUnique({ where: { id: requested }, select: { id: true } });
    if (exists) return exists.id;
  }
  if (scope && scope.length > 0) return scope[0];
  return (await prisma.branch.findFirst({ orderBy: { id: 'asc' }, select: { id: true } }))?.id ?? null;
}

// ─── Sign-in activity log ─────────────────────────────────────────────────

export function clientIp(request: Request): string | null {
  return (
    request.headers.get('x-nf-client-connection-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    null
  );
}

export async function logLoginEvent(
  request: Request,
  entry: { userId?: string | null; username: string; event: string; success: boolean; detail?: string }
): Promise<void> {
  try {
    await prisma.loginLog.create({
      data: {
        id: `log-${Date.now()}-${randomBytes(3).toString('hex')}`,
        timestamp: new Date().toISOString(),
        userId: entry.userId ?? null,
        username: entry.username.slice(0, 100),
        event: entry.event,
        success: entry.success,
        ip: clientIp(request),
        userAgent: request.headers.get('user-agent')?.slice(0, 300) ?? null,
        detail: entry.detail ?? null,
      },
    });
  } catch (error) {
    console.error('Failed to write login log:', error);
  }
}
