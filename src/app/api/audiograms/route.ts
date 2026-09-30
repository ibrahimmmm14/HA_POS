import { NextResponse } from 'next/server';
import { prisma, mapAudiogram, logAudit } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    const rawAudiograms = await prisma.audiogram.findMany({
      where: clientId ? { clientId } : undefined,
      orderBy: { date: 'desc' },
    });

    return NextResponse.json({
      audiograms: rawAudiograms.map(mapAudiogram),
    });
  } catch (error) {
    console.error('Error fetching audiograms:', error);
    return NextResponse.json({ error: 'Failed to fetch audiograms' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Calculate PTA (500, 1000, 2000 Hz)
    const calcPta = (air: Record<number, number | null>) => {
      const v500 = air[500] ?? 0;
      const v1000 = air[1000] ?? 0;
      const v2000 = air[2000] ?? 0;
      return Number(((v500 + v1000 + v2000) / 3).toFixed(1));
    };

    const leftAirObj = body.leftAir || {};
    const rightAirObj = body.rightAir || {};
    const leftBoneObj = body.leftBone || {};
    const rightBoneObj = body.rightBone || {};

    const ptaLeft = body.ptaLeft !== undefined ? Number(body.ptaLeft) : calcPta(leftAirObj);
    const ptaRight = body.ptaRight !== undefined ? Number(body.ptaRight) : calcPta(rightAirObj);

    const id = body.id || `aud-${Date.now()}`;
    const date = body.date || new Date().toISOString().split('T')[0];
    const frequencies = body.frequencies || [125, 250, 500, 1000, 2000, 4000, 8000];

    const created = await prisma.audiogram.create({
      data: {
        id,
        clientId: body.clientId,
        date,
        audiologistName: body.audiologistName || 'أخصائي السمعيات',
        testType: body.testType || 'PTA Diagnostic',
        frequencies: JSON.stringify(frequencies),
        leftAir: JSON.stringify(leftAirObj),
        rightAir: JSON.stringify(rightAirObj),
        leftBone: JSON.stringify(leftBoneObj),
        rightBone: JSON.stringify(rightBoneObj),
        ptaLeft,
        ptaRight,
        sdsLeft: Number(body.sdsLeft) || 100,
        sdsRight: Number(body.sdsRight) || 100,
        notes: body.notes || null,
      },
    });

    const newAudiogram = mapAudiogram(created);

    const client = await prisma.client.findUnique({
      where: { id: newAudiogram.clientId },
      select: { nameAr: true },
    });

    await logAudit(
      'CREATE_AUDIOGRAM',
      'AUDIOGRAM',
      newAudiogram.id,
      `تسجيل مخطط فحص سمعي للمريض ${client?.nameAr || newAudiogram.clientId} (PTA: L=${ptaLeft}dB, R=${ptaRight}dB)`
    );

    return NextResponse.json({ audiogram: newAudiogram });
  } catch (error) {
    console.error('Error saving audiogram:', error);
    return NextResponse.json({ error: 'Failed to save audiogram' }, { status: 500 });
  }
}
