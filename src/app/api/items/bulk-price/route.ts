import { NextResponse } from 'next/server';
import { prisma, mapItem, logAudit } from '@/lib/db';

const CATEGORIES = ['hearing_aids', 'earmolds', 'batteries', 'spare_parts', 'accessories'];
const TARGETS = ['salePrice', 'costPrice', 'both'];

const round2 = (n: number) => Math.round(n * 100) / 100;

// Raise or lower the prices of every item in one category by a percentage
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { category, target } = body;
    const percent = Number(body.percent);

    if (!CATEGORIES.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }
    if (!TARGETS.includes(target)) {
      return NextResponse.json({ error: 'Invalid target' }, { status: 400 });
    }
    if (!Number.isFinite(percent) || percent === 0 || percent < -90 || percent > 500) {
      return NextResponse.json({ error: 'percent must be between -90 and 500, and not 0' }, { status: 400 });
    }

    const items = await prisma.item.findMany({ where: { category } });
    const factor = 1 + percent / 100;

    const updated = await prisma.$transaction(
      items.map((item) =>
        prisma.item.update({
          where: { id: item.id },
          data: {
            ...(target !== 'costPrice' ? { salePrice: round2(item.salePrice * factor) } : {}),
            ...(target !== 'salePrice' ? { costPrice: round2(item.costPrice * factor) } : {}),
          },
        })
      )
    );

    await logAudit(
      'BULK_UPDATE_ITEM_PRICES',
      'ITEM',
      category,
      `تعديل أسعار فئة ${category} بنسبة ${percent > 0 ? '+' : ''}${percent}% (${target}) — ${updated.length} صنف`
    );

    return NextResponse.json({ count: updated.length, items: updated.map(mapItem) });
  } catch (error) {
    console.error('Error bulk-updating prices:', error);
    return NextResponse.json({ error: 'Failed to update prices' }, { status: 500 });
  }
}
