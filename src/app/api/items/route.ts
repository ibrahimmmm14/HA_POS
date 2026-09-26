import { NextResponse } from 'next/server';
import { readDb, writeDb, logAudit } from '@/lib/db';
import { Item } from '@/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const search = searchParams.get('search')?.toLowerCase();
  const branchId = searchParams.get('branchId');

  const db = readDb();
  let items = db.items;

  if (category && category !== 'all') {
    items = items.filter((item) => item.category === category);
  }

  if (search) {
    items = items.filter(
      (item) =>
        item.nameAr.toLowerCase().includes(search) ||
        item.nameEn.toLowerCase().includes(search) ||
        item.sku.toLowerCase().includes(search) ||
        item.barcode.includes(search)
    );
  }

  return NextResponse.json({
    items,
    serials: db.serialUnits,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const db = readDb();

    if (body.type === 'item') {
      const newItem: Item = {
        ...body.data,
        id: `item-${Date.now()}`,
      };
      db.items.push(newItem);
      writeDb(db);
      logAudit('CREATE_ITEM', 'ITEM', newItem.id, `Created item ${newItem.nameAr} (${newItem.sku})`);
      return NextResponse.json({ item: newItem });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process item' }, { status: 500 });
  }
}
