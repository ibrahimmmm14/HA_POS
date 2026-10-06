import { NextResponse } from 'next/server';
import { prisma, logAudit } from '@/lib/db';
import { guarded } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const TEXT_FIELDS = ['code', 'nameAr', 'nameEn', 'phone'] as const;

async function PUTHandler(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();

    const data: Record<string, string | number | boolean> = {};
    for (const f of TEXT_FIELDS) {
      if (typeof body[f] === 'string') data[f] = body[f].trim();
    }
    if (('nameAr' in data && !data.nameAr) || ('code' in data && !data.code)) {
      return NextResponse.json({ error: 'code and nameAr cannot be empty' }, { status: 400 });
    }
    if (body.defaultCoveragePercent !== undefined) {
      const pct = Number(body.defaultCoveragePercent);
      data.defaultCoveragePercent = Number.isFinite(pct) ? Math.min(Math.max(pct, 0), 100) : 0;
    }
    if (body.requiresPreApproval !== undefined) {
      data.requiresPreApproval = body.requiresPreApproval === true || body.requiresPreApproval === 'true';
    }

    const insuranceCompany = await prisma.insuranceCompany.update({ where: { id: params.id }, data });
    await logAudit('UPDATE_INSURANCE', 'INSURANCE', insuranceCompany.id, `تم تعديل بيانات شركة التأمين: ${insuranceCompany.nameAr}`);

    return NextResponse.json({ insuranceCompany });
  } catch (error) {
    console.error('Error updating insurance company:', error);
    return NextResponse.json({ error: 'Failed to update insurance company' }, { status: 500 });
  }
}

export const PUT = guarded(PUTHandler);
