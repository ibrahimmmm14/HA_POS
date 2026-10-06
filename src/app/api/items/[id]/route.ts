import { NextResponse } from 'next/server';
import { prisma, mapItem, logAudit } from '@/lib/db';
import { guarded } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Update the prices of a single catalog item
async function PUTHandler(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();

    const data: { costPrice?: number; salePrice?: number } = {};
    for (const field of ['costPrice', 'salePrice'] as const) {
      if (body[field] === undefined) continue;
      const value = Number(body[field]);
      if (!Number.isFinite(value) || value < 0) {
        return NextResponse.json({ error: `${field} must be a number of 0 or more` }, { status: 400 });
      }
      data[field] = Math.round(value * 100) / 100;
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const before = await prisma.item.findUnique({ where: { id: params.id } });
    if (!before) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const updated = await prisma.item.update({ where: { id: params.id }, data });

    await logAudit(
      'UPDATE_ITEM_PRICE',
      'ITEM',
      updated.id,
      `تعديل أسعار الصنف ${updated.nameAr} (${updated.sku}): البيع ${before.salePrice} ← ${updated.salePrice}، التكلفة ${before.costPrice} ← ${updated.costPrice}`
    );

    return NextResponse.json({ item: mapItem(updated) });
  } catch (error) {
    console.error('Error updating item price:', error);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}

export const PUT = guarded(PUTHandler);
