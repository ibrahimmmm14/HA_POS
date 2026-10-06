import { NextResponse } from 'next/server';
import { prisma, mapItem, logAudit } from '@/lib/db';
import { guarded } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function GETHandler(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search')?.toLowerCase().trim();

    const [rawItems, serialUnits] = await Promise.all([
      prisma.item.findMany({
        orderBy: { nameAr: 'asc' },
      }),
      prisma.serialUnit.findMany(),
    ]);

    let items = rawItems.map(mapItem);

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
      serials: serialUnits,
    });
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}

async function POSTHandler(request: Request) {
  try {
    const body = await request.json();

    if (body.type === 'item') {
      const itemData = body.data || {};
      const id = itemData.id || `item-${Date.now()}`;

      const stockObj = itemData.stockByWarehouse || {
        'wh-01': 10,
        'wh-02': 5,
        'wh-03': 5,
      };

      const created = await prisma.item.create({
        data: {
          id,
          sku: itemData.sku || `SKU-${Date.now()}`,
          barcode: itemData.barcode || `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
          nameAr: itemData.nameAr || '',
          nameEn: itemData.nameEn || '',
          category: itemData.category || 'hearing_aids',
          brand: itemData.brand || 'Generic',
          model: itemData.model || '',
          unit: itemData.unit || 'حبة',
          costPrice: Number(itemData.costPrice) || 0,
          salePrice: Number(itemData.salePrice) || 0,
          taxRate: itemData.taxRate !== undefined ? Number(itemData.taxRate) : 0.15,
          hasSerials: Boolean(itemData.hasSerials),
          warrantyMonths: Number(itemData.warrantyMonths) || 0,
          minStockLevel: Number(itemData.minStockLevel) || 5,
          image: itemData.image || null,
          stockByWarehouse: JSON.stringify(stockObj),
        },
      });

      const newItem = mapItem(created);

      await logAudit(
        'CREATE_ITEM',
        'ITEM',
        newItem.id,
        `Created item ${newItem.nameAr} (${newItem.sku})`
      );

      return NextResponse.json({ item: newItem });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Error creating inventory item:', error);
    return NextResponse.json({ error: 'Failed to process item' }, { status: 500 });
  }
}

export const GET = guarded(GETHandler);
export const POST = guarded(POSTHandler);
