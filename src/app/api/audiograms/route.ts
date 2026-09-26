import { NextResponse } from 'next/server';
import { readDb, writeDb, logAudit } from '@/lib/db';
import { Audiogram } from '@/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');
  const db = readDb();

  let audiograms = db.audiograms;
  if (clientId) {
    audiograms = audiograms.filter((a) => a.clientId === clientId);
  }

  return NextResponse.json({ audiograms });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const db = readDb();

    // Calculate PTA (500, 1000, 2000 Hz)
    const calcPta = (air: Record<number, number | null>) => {
      const v500 = air[500] ?? 0;
      const v1000 = air[1000] ?? 0;
      const v2000 = air[2000] ?? 0;
      return Number(((v500 + v1000 + v2000) / 3).toFixed(1));
    };

    const ptaLeft = body.ptaLeft !== undefined ? body.ptaLeft : calcPta(body.leftAir || {});
    const ptaRight = body.ptaRight !== undefined ? body.ptaRight : calcPta(body.rightAir || {});

    const newAudiogram: Audiogram = {
      ...body,
      id: `aud-${Date.now()}`,
      date: body.date || new Date().toISOString().split('T')[0],
      frequencies: [125, 250, 500, 1000, 2000, 4000, 8000],
      ptaLeft,
      ptaRight,
    };

    db.audiograms.unshift(newAudiogram);
    writeDb(db);

    const client = db.clients.find((c) => c.id === newAudiogram.clientId);
    logAudit(
      'CREATE_AUDIOGRAM',
      'AUDIOGRAM',
      newAudiogram.id,
      `تسجيل مخطط فحص سمعي للمريض ${client?.nameAr || newAudiogram.clientId} (PTA: L=${ptaLeft}dB, R=${ptaRight}dB)`
    );

    return NextResponse.json({ audiogram: newAudiogram });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save audiogram' }, { status: 500 });
  }
}
