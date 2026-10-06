import { NextResponse } from 'next/server';
import { prisma, logAudit } from '@/lib/db';
import { getSessionUser, guarded, hashPassword, logLoginEvent, passwordProblem } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Administrator sets a new temporary password; the user must change it at their next sign-in.
export const POST = guarded(async (request: Request, { params }: { params: { id: string } }) => {
  try {
    const admin = await getSessionUser(request);
    const body = await request.json();

    const problem = passwordProblem(body.password);
    if (problem) return NextResponse.json({ error: 'weak_password', message: problem }, { status: 400 });

    const target = await prisma.user.findUnique({ where: { id: params.id } });
    if (!target) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    await prisma.user.update({
      where: { id: target.id },
      data: { passwordHash: await hashPassword(body.password), mustChangePassword: true },
    });

    // Also clears any sign-in lockout for this user (see the login route).
    await logLoginEvent(request, {
      userId: target.id,
      username: target.username,
      event: 'password_reset',
      success: true,
      detail: `by ${admin?.username}`,
    });
    await logAudit('RESET_PASSWORD', 'USER', target.id, `تم تعيين كلمة مرور جديدة للمستخدم: ${target.nameAr} (${target.username})`, admin?.id, admin?.nameAr);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
});
