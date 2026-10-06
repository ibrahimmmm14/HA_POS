import { NextResponse } from 'next/server';
import { prisma, logAudit } from '@/lib/db';

const TEXT_FIELDS = ['code', 'nameAr', 'nameEn', 'cityAr', 'cityEn', 'addressAr', 'addressEn', 'phone', 'taxNumber'] as const;

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();

    const data: Record<string, string> = {};
    for (const f of TEXT_FIELDS) {
      if (typeof body[f] === 'string') data[f] = body[f].trim();
    }
    if ('code' in data) data.code = data.code.toUpperCase();
    if (('nameAr' in data && !data.nameAr) || ('code' in data && !data.code)) {
      return NextResponse.json({ error: 'code and nameAr cannot be empty' }, { status: 400 });
    }

    const branch = await prisma.branch.update({ where: { id: params.id }, data });
    await logAudit('UPDATE_BRANCH', 'BRANCH', branch.id, `تم تعديل بيانات الفرع: ${branch.nameAr} (${branch.code})`);

    return NextResponse.json({ branch });
  } catch (error) {
    console.error('Error updating branch:', error);
    return NextResponse.json({ error: 'Failed to update branch' }, { status: 500 });
  }
}
