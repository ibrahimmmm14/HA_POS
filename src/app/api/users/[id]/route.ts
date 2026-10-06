import { NextResponse } from 'next/server';
import { prisma, logAudit } from '@/lib/db';
import { getSessionUser, guarded } from '@/lib/auth';
import { isPermission, isRole } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export const PUT = guarded(async (request: Request, { params }: { params: { id: string } }) => {
  try {
    const admin = await getSessionUser(request);
    const body = await request.json();

    const target = await prisma.user.findUnique({ where: { id: params.id } });
    if (!target) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const isSelf = admin?.id === target.id;
    const data: Record<string, unknown> = {};

    if (typeof body.nameAr === 'string') {
      if (!body.nameAr.trim()) return NextResponse.json({ error: 'nameAr cannot be empty' }, { status: 400 });
      data.nameAr = body.nameAr.trim();
    }
    if (typeof body.nameEn === 'string') data.nameEn = body.nameEn.trim() || target.nameAr;

    if (body.role !== undefined) {
      if (!isRole(body.role)) return NextResponse.json({ error: 'invalid_role' }, { status: 400 });
      if (isSelf && body.role !== target.role) {
        return NextResponse.json({ error: 'cannot_change_own_role' }, { status: 400 });
      }
      data.role = body.role;
    }

    if (body.branchIds !== undefined) {
      const branches = await prisma.branch.findMany({ select: { id: true } });
      const ids: string[] = Array.isArray(body.branchIds)
        ? body.branchIds.filter((b: unknown) => branches.some((x) => x.id === b))
        : [];
      if (ids.length === 0) return NextResponse.json({ error: 'branch_required' }, { status: 400 });
      data.branchIds = JSON.stringify(ids);
      if (!ids.includes(target.currentBranchId)) data.currentBranchId = ids[0];
    }

    if (body.active !== undefined) {
      if (isSelf && body.active === false) {
        return NextResponse.json({ error: 'cannot_disable_self' }, { status: 400 });
      }
      data.active = Boolean(body.active);
    }

    // permissions: an array replaces the role defaults, null goes back to the role defaults
    if (body.permissions !== undefined) {
      data.permissions = Array.isArray(body.permissions)
        ? JSON.stringify(body.permissions.filter(isPermission))
        : null;
    }

    // Never leave the system without an active administrator.
    const losesAdmin =
      target.role === 'super_admin' &&
      ((data.role !== undefined && data.role !== 'super_admin') || data.active === false);
    if (losesAdmin) {
      const others = await prisma.user.count({
        where: { role: 'super_admin', active: true, id: { not: target.id } },
      });
      if (others === 0) return NextResponse.json({ error: 'last_admin' }, { status: 409 });
    }

    const updated = await prisma.user.update({ where: { id: target.id }, data });

    await logAudit('UPDATE_USER', 'USER', updated.id, `تم تعديل المستخدم: ${updated.nameAr} (${updated.username})`, admin?.id, admin?.nameAr);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
});
