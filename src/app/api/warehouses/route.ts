import { NextResponse } from 'next/server';
import { prisma, logAudit } from '@/lib/db';
import { guarded } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const POST = guarded(async (request: Request) => {
  try {
    const body = await request.json();
    const nameAr = typeof body.nameAr === 'string' ? body.nameAr.trim() : '';
    const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
    if (!nameAr || !code) return NextResponse.json({ error: 'nameAr and code are required' }, { status: 400 });

    const branch = await prisma.branch.findUnique({ where: { id: body.branchId ?? '' }, select: { id: true } });
    if (!branch) return NextResponse.json({ error: 'branch_required' }, { status: 400 });

    if (await prisma.warehouse.findUnique({ where: { code } })) {
      return NextResponse.json({ error: 'code_taken' }, { status: 409 });
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        id: `wh-${Date.now()}`,
        branchId: branch.id,
        code,
        nameAr,
        nameEn: body.nameEn?.trim() || nameAr,
      },
    });
    await logAudit('CREATE_WAREHOUSE', 'WAREHOUSE', warehouse.id, `تمت إضافة مستودع: ${warehouse.nameAr} (${warehouse.code})`);
    return NextResponse.json({ warehouse });
  } catch (error) {
    console.error('Error creating warehouse:', error);
    return NextResponse.json({ error: 'Failed to create warehouse' }, { status: 500 });
  }
});
