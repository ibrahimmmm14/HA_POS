import { NextResponse } from 'next/server';
import { prisma, logAudit } from '@/lib/db';
import { cleanWarehouseIds, getSessionUser, guarded, hashPassword, passwordProblem, toAuthedUser } from '@/lib/auth';
import { isPermission, isRole, parsePermissionOverride } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

const USERNAME_RE = /^[a-z0-9][a-z0-9_.-]{2,29}$/;

function publicUser(row: Parameters<typeof toAuthedUser>[0] & { active: boolean; lastLoginAt: string | null; createdAt: string | null; passwordHash: string | null }) {
  const authed = toAuthedUser(row);
  return {
    id: authed.id,
    username: authed.username,
    nameAr: authed.nameAr,
    nameEn: authed.nameEn,
    role: authed.role,
    branchIds: authed.branchIds,
    active: row.active,
    mustChangePassword: row.mustChangePassword,
    hasPassword: !!row.passwordHash,
    lastLoginAt: row.lastLoginAt,
    createdAt: row.createdAt,
    // null = follows the role's defaults
    permissionOverride: parsePermissionOverride(row.permissions),
    permissions: authed.permissions,
    // null = every warehouse of the user's branches
    warehouseIds: authed.warehouseIds,
  };
}

export const GET = guarded(async () => {
  try {
    const rows = await prisma.user.findMany({ orderBy: { id: 'asc' } });
    return NextResponse.json({ users: rows.map(publicUser) });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
});

export const POST = guarded(async (request: Request) => {
  try {
    const admin = await getSessionUser(request);
    const body = await request.json();

    const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
    if (!USERNAME_RE.test(username)) {
      return NextResponse.json({ error: 'invalid_username', message: 'Username: 3-30 letters, digits, . _ -' }, { status: 400 });
    }
    if (!body.nameAr?.trim()) return NextResponse.json({ error: 'nameAr is required' }, { status: 400 });
    if (!isRole(body.role)) return NextResponse.json({ error: 'invalid_role' }, { status: 400 });
    const problem = passwordProblem(body.password);
    if (problem) return NextResponse.json({ error: 'weak_password', message: problem }, { status: 400 });

    const branches = await prisma.branch.findMany({ select: { id: true } });
    const branchIds: string[] = Array.isArray(body.branchIds)
      ? body.branchIds.filter((b: unknown) => branches.some((x) => x.id === b))
      : [];
    if (branchIds.length === 0) return NextResponse.json({ error: 'branch_required' }, { status: 400 });

    const exists = await prisma.user.findFirst({ where: { username: { equals: username, mode: 'insensitive' } } });
    if (exists) return NextResponse.json({ error: 'username_taken' }, { status: 409 });

    const warehouseIds = await cleanWarehouseIds(body.warehouseIds, branchIds);
    if (warehouseIds === 'invalid') return NextResponse.json({ error: 'warehouse_not_in_branch' }, { status: 400 });

    const override = Array.isArray(body.permissions) ? body.permissions.filter(isPermission) : null;

    const created = await prisma.user.create({
      data: {
        id: `usr-${Date.now()}`,
        username,
        nameAr: body.nameAr.trim(),
        nameEn: body.nameEn?.trim() || body.nameAr.trim(),
        role: body.role,
        branchIds: JSON.stringify(branchIds),
        currentBranchId: branchIds[0],
        passwordHash: await hashPassword(body.password),
        permissions: override ? JSON.stringify(override) : null,
        warehouseIds: warehouseIds && warehouseIds.length ? JSON.stringify(warehouseIds) : null,
        active: true,
        mustChangePassword: true,
        createdAt: new Date().toISOString(),
      },
    });

    await logAudit('CREATE_USER', 'USER', created.id, `تمت إضافة مستخدم: ${created.nameAr} (${created.username}) بدور ${created.role}`, admin?.id, admin?.nameAr);

    return NextResponse.json({ user: publicUser(created) });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
});
