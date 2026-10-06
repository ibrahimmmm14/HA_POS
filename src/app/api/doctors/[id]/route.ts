import { NextResponse } from 'next/server';
import { prisma, logAudit } from '@/lib/db';

const TEXT_FIELDS = ['nameAr', 'nameEn', 'specialtyAr', 'specialtyEn', 'phone', 'hospitalId'] as const;

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();

    const data: Record<string, string | number> = {};
    for (const f of TEXT_FIELDS) {
      if (typeof body[f] === 'string') data[f] = body[f].trim();
    }
    if (('nameAr' in data && !data.nameAr) || ('hospitalId' in data && !data.hospitalId)) {
      return NextResponse.json({ error: 'nameAr and hospitalId cannot be empty' }, { status: 400 });
    }
    if (body.commissionPercent !== undefined) {
      const pct = Number(body.commissionPercent);
      data.commissionPercent = Number.isFinite(pct) ? Math.min(Math.max(pct, 0), 100) : 0;
    }

    const doctor = await prisma.doctor.update({ where: { id: params.id }, data });
    await logAudit('UPDATE_DOCTOR', 'DOCTOR', doctor.id, `تم تعديل بيانات الطبيب: ${doctor.nameAr}`);

    return NextResponse.json({ doctor });
  } catch (error) {
    console.error('Error updating doctor:', error);
    return NextResponse.json({ error: 'Failed to update doctor' }, { status: 500 });
  }
}
