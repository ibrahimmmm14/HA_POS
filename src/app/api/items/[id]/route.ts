import { NextResponse } from 'next/server';
import { prisma, mapItem, logAudit } from '@/lib/db';
import { guarded } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Update a catalog item (details and prices)
async function PUTHandler(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();

    const data: Record<string, string | number | boolean> = {};
    for (const field of ['sku', 'barcode', 'nameAr', 'nameEn', 'category', 'brand', 'model', 'unit'] as const) {
      if (typeof body[field] !== 'string') continue;
      const value = body[field].trim();
      if (!value && (field === 'sku' || field === 'nameAr')) {
        return NextResponse.json({ error: `${field} is required` }, { status: 400 });
      }
      data[field] = value;
    }
    if (typeof body.hasSerials === 'boolean') data.hasSerials = body.hasSerials;
    for (const field of ['warrantyMonths', 'minStockLevel'] as const) {
      if (body[field] === undefined) continue;
      const value = Math.trunc(Number(body[field]));
      if (!Number.isFinite(value) || value < 0) {
        return NextResponse.json({ error: `${field} must be 0 or more` }, { status: 400 });
      }
      data[field] = value;
    }
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

    if (typeof data.sku === 'string' && data.sku !== before.sku) {
      if (await prisma.item.findUnique({ where: { sku: data.sku } })) {
        return NextResponse.json({ error: 'sku_taken' }, { status: 409 });
      }
    }

    const updated = await prisma.item.update({ where: { id: params.id }, data });

    await logAudit(
      'UPDATE_ITEM',
      'ITEM',
      updated.id,
      `تعديل الصنف ${updated.nameAr} (${updated.sku}): البيع ${before.salePrice} ← ${updated.salePrice}، التكلفة ${before.costPrice} ← ${updated.costPrice}`
    );

    return NextResponse.json({ item: mapItem(updated) });
  } catch (error) {
    console.error('Error updating item price:', error);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}

export const PUT = guarded(PUTHandler);
