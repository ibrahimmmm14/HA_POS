import { NextResponse } from 'next/server';
import { prisma, logAudit } from '@/lib/db';

const TEXT_FIELDS = ['code', 'nameAr', 'nameEn', 'cityAr', 'cityEn', 'phone'] as const;

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();

    const data: Record<string, string> = {};
    for (const f of TEXT_FIELDS) {
      if (typeof body[f] === 'string') data[f] = body[f].trim();
    }
    if (('nameAr' in data && !data.nameAr) || ('code' in data && !data.code)) {
      return NextResponse.json({ error: 'code and nameAr cannot be empty' }, { status: 400 });
    }

    const hospital = await prisma.hospital.update({ where: { id: params.id }, data });
    await logAudit('UPDATE_HOSPITAL', 'HOSPITAL', hospital.id, `تم تعديل بيانات المستشفى: ${hospital.nameAr}`);

    return NextResponse.json({ hospital });
  } catch (error) {
    console.error('Error updating hospital:', error);
    return NextResponse.json({ error: 'Failed to update hospital' }, { status: 500 });
  }
}
