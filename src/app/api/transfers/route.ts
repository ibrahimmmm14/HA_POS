import { NextResponse } from 'next/server';
import { readDb, writeDb, logAudit } from '@/lib/db';
import { StockTransfer } from '@/types';

export async function GET() {
  const db = readDb();
  const transfersWithNames = db.transfers.map((tr) => {
    const fromBranch = db.branches.find((b) => b.id === tr.fromBranchId);
    const toBranch = db.branches.find((b) => b.id === tr.toBranchId);
    const fromWh = db.warehouses.find((w) => w.id === tr.fromWarehouseId);
    const toWh = db.warehouses.find((w) => w.id === tr.toWarehouseId);
    return {
      ...tr,
      fromBranchNameAr: fromBranch?.nameAr || '-',
      toBranchNameAr: toBranch?.nameAr || '-',
      fromWhNameAr: fromWh?.nameAr || '-',
      toWhNameAr: toWh?.nameAr || '-',
    };
  });
  return NextResponse.json({ transfers: transfersWithNames });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const db = readDb();

    const transferNo = `TR-${new Date().getFullYear()}-${String(db.transfers.length + 13).padStart(4, '0')}`;

    const newTransfer: StockTransfer = {
      ...body,
      id: `tr-${Date.now()}`,
      transferNo,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    db.transfers.unshift(newTransfer);
    writeDb(db);

    logAudit(
      'CREATE_STOCK_TRANSFER',
      'STOCK_TRANSFER',
      newTransfer.id,
      `طلب تحويل مخزني جديد ${newTransfer.transferNo} بقيمة أصناف متعددة`
    );

    return NextResponse.json({ transfer: newTransfer });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create transfer' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, status, action } = body;
    const db = readDb();
    const index = db.transfers.findIndex((t) => t.id === id);

    if (index === -1) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    const transfer = db.transfers[index];
    const prevStatus = transfer.status;
    transfer.status = status;

    if (status === 'completed' && prevStatus !== 'completed') {
      transfer.completedAt = new Date().toISOString();
      // Move stock between warehouses
      for (const itemTr of transfer.items) {
        const item = db.items.find((i) => i.id === itemTr.itemId);
        if (item) {
          item.stockByWarehouse[transfer.fromWarehouseId] = Math.max(
            0,
            (item.stockByWarehouse[transfer.fromWarehouseId] || 0) - itemTr.quantity
          );
          item.stockByWarehouse[transfer.toWarehouseId] =
            (item.stockByWarehouse[transfer.toWarehouseId] || 0) + itemTr.quantity;
        }

        // Move serial numbers if any
        if (itemTr.serials && itemTr.serials.length > 0) {
          for (const sn of itemTr.serials) {
            const serialUnit = db.serialUnits.find((s) => s.serialNumber === sn);
            if (serialUnit) {
              serialUnit.branchId = transfer.toBranchId;
              serialUnit.warehouseId = transfer.toWarehouseId;
            }
          }
        }
      }
    }

    writeDb(db);
    logAudit(
      'UPDATE_TRANSFER_STATUS',
      'STOCK_TRANSFER',
      transfer.id,
      `تحديث حالة أمر التحويل ${transfer.transferNo} إلى ${status}`
    );

    return NextResponse.json({ transfer });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update transfer' }, { status: 500 });
  }
}
