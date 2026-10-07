import { NextResponse } from 'next/server';
import { prisma, mapStockTransfer, mapItem, logAudit } from '@/lib/db';
import { StockTransfer } from '@/types';
import { allowedWarehouses, currentUser, guarded } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type TransferItem = StockTransfer['items'][number];

/** The id of the first item the warehouse does not hold enough of, if any. */
async function insufficientStock(warehouseId: string, items: TransferItem[]): Promise<string | null> {
  for (const line of items) {
    if (!line.quantity || line.quantity < 1) return line.itemId;
    const raw = await prisma.item.findUnique({ where: { id: line.itemId } });
    if (!raw) return line.itemId;
    if ((mapItem(raw).stockByWarehouse[warehouseId] || 0) < line.quantity) return line.itemId;
  }
  return null;
}

// pending -> in_transit (sent) -> completed (received); either of the first two can be cancelled
const TRANSITIONS: Record<string, string[]> = {
  pending: ['in_transit', 'cancelled'],
  in_transit: ['completed', 'cancelled'],
};

async function GETHandler(request: Request) {
  try {
    // A user sees the transfers leaving or entering the warehouses they work with
    const mine = await allowedWarehouses(currentUser(request));
    const ids = mine ? Array.from(mine) : null;
    const rawTransfers = await prisma.stockTransfer.findMany({
      where: ids ? { OR: [{ fromWarehouseId: { in: ids } }, { toWarehouseId: { in: ids } }] } : undefined,
      include: {
        fromBranch: { select: { nameAr: true } },
        toBranch: { select: { nameAr: true } },
        fromWarehouse: { select: { nameAr: true } },
        toWarehouse: { select: { nameAr: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const transfersWithNames = rawTransfers.map((tr) => {
      const { fromBranch, toBranch, fromWarehouse, toWarehouse, ...raw } = tr;
      return {
        ...mapStockTransfer(raw),
        fromBranchNameAr: fromBranch?.nameAr || '-',
        toBranchNameAr: toBranch?.nameAr || '-',
        fromWhNameAr: fromWarehouse?.nameAr || '-',
        toWhNameAr: toWarehouse?.nameAr || '-',
      };
    });

    return NextResponse.json({ transfers: transfersWithNames });
  } catch (error) {
    console.error('Error fetching transfers:', error);
    return NextResponse.json({ error: 'Failed to fetch transfers' }, { status: 500 });
  }
}

async function POSTHandler(request: Request) {
  try {
    const user = currentUser(request);
    const body = await request.json();

    // Stock is sent from a warehouse the user works with to a different warehouse (any branch)
    const mine = await allowedWarehouses(user);
    if (body.fromWarehouseId === body.toWarehouseId) {
      return NextResponse.json({ error: 'same_warehouse' }, { status: 400 });
    }
    const [fromWh, toWh] = await Promise.all([
      prisma.warehouse.findUnique({ where: { id: body.fromWarehouseId ?? '' }, select: { branchId: true } }),
      prisma.warehouse.findUnique({ where: { id: body.toWarehouseId ?? '' }, select: { branchId: true } }),
    ]);
    if (!fromWh || !toWh) {
      return NextResponse.json({ error: 'warehouse_not_found' }, { status: 400 });
    }
    if (mine && !mine.has(body.fromWarehouseId)) {
      return NextResponse.json({ error: 'forbidden_warehouse' }, { status: 403 });
    }
    const lacking = await insufficientStock(body.fromWarehouseId, body.items || []);
    if (lacking) return NextResponse.json({ error: 'insufficient_stock', itemId: lacking }, { status: 409 });

    const count = await prisma.stockTransfer.count();
    const transferNo =
      body.transferNo ||
      `TR-${new Date().getFullYear()}-${String(count + 13).padStart(4, '0')}`;

    const items: TransferItem[] = body.items || [];

    const created = await prisma.stockTransfer.create({
      data: {
        id: body.id || `tr-${Date.now()}`,
        transferNo,
        fromBranchId: fromWh.branchId,
        fromWarehouseId: body.fromWarehouseId,
        toBranchId: toWh.branchId,
        toWarehouseId: body.toWarehouseId,
        status: 'pending',
        requestedBy: user.nameAr,
        approvedBy: body.approvedBy || null,
        receivedBy: body.receivedBy || null,
        items: JSON.stringify(items),
        createdAt: body.createdAt || new Date().toISOString(),
        completedAt: null,
        notes: body.notes || null,
      },
    });

    const newTransfer = mapStockTransfer(created);

    await logAudit(
      'CREATE_STOCK_TRANSFER',
      'STOCK_TRANSFER',
      newTransfer.id,
      `طلب تحويل مخزني جديد ${newTransfer.transferNo} بقيمة أصناف متعددة`
    );

    return NextResponse.json({ transfer: newTransfer });
  } catch (error) {
    console.error('Error creating stock transfer:', error);
    return NextResponse.json({ error: 'Failed to create transfer' }, { status: 500 });
  }
}

async function PUTHandler(request: Request) {
  try {
    const user = currentUser(request);
    const body = await request.json();
    const { id, status } = body;

    const prevTransferRaw = await prisma.stockTransfer.findUnique({
      where: { id },
    });

    const mine = await allowedWarehouses(user);
    const touches = (wh: string) => mine === null || mine.has(wh);

    // A transfer that does not involve the user's warehouses looks like one that does not exist
    if (!prevTransferRaw || !(touches(prevTransferRaw.fromWarehouseId) || touches(prevTransferRaw.toWarehouseId))) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    const prevTransfer = mapStockTransfer(prevTransferRaw);
    const prevStatus = prevTransfer.status;

    if (!(TRANSITIONS[prevStatus] ?? []).includes(status)) {
      return NextResponse.json({ error: 'invalid_transition' }, { status: 409 });
    }
    // The sending warehouse dispatches or cancels; the receiving warehouse confirms receipt
    const actingWarehouse = status === 'completed' ? prevTransfer.toWarehouseId : prevTransfer.fromWarehouseId;
    if (!touches(actingWarehouse)) {
      return NextResponse.json({ error: 'forbidden_warehouse' }, { status: 403 });
    }
    if (status === 'in_transit' || status === 'completed') {
      const lacking = await insufficientStock(prevTransfer.fromWarehouseId, prevTransfer.items);
      if (lacking) return NextResponse.json({ error: 'insufficient_stock', itemId: lacking }, { status: 409 });
    }

    let completedAt = prevTransfer.completedAt;

    if (status === 'completed' && prevStatus !== 'completed') {
      completedAt = new Date().toISOString();

      // Move stock between warehouses
      for (const itemTr of prevTransfer.items) {
        const rawItem = await prisma.item.findUnique({
          where: { id: itemTr.itemId },
        });

        if (rawItem) {
          const item = mapItem(rawItem);
          const currentFromStock = item.stockByWarehouse[prevTransfer.fromWarehouseId] || 0;
          const currentToStock = item.stockByWarehouse[prevTransfer.toWarehouseId] || 0;

          item.stockByWarehouse[prevTransfer.fromWarehouseId] = Math.max(
            0,
            currentFromStock - itemTr.quantity
          );
          item.stockByWarehouse[prevTransfer.toWarehouseId] = currentToStock + itemTr.quantity;

          await prisma.item.update({
            where: { id: itemTr.itemId },
            data: {
              stockByWarehouse: JSON.stringify(item.stockByWarehouse),
            },
          });
        }

        // Move serial numbers if any
        if (itemTr.serials && itemTr.serials.length > 0) {
          for (const sn of itemTr.serials) {
            await prisma.serialUnit.updateMany({
              where: { serialNumber: sn, warehouseId: prevTransfer.fromWarehouseId },
              data: {
                branchId: prevTransfer.toBranchId,
                warehouseId: prevTransfer.toWarehouseId,
              },
            });
          }
        }
      }
    }

    const updatedRaw = await prisma.stockTransfer.update({
      where: { id },
      data: {
        status,
        completedAt,
      },
    });

    const updatedTransfer = mapStockTransfer(updatedRaw);

    await logAudit(
      'UPDATE_TRANSFER_STATUS',
      'STOCK_TRANSFER',
      updatedTransfer.id,
      `تحديث حالة أمر التحويل ${updatedTransfer.transferNo} إلى ${status}`
    );

    return NextResponse.json({ transfer: updatedTransfer });
  } catch (error) {
    console.error('Error updating stock transfer:', error);
    return NextResponse.json({ error: 'Failed to update transfer' }, { status: 500 });
  }
}

export const GET = guarded(GETHandler);
export const POST = guarded(POSTHandler);
export const PUT = guarded(PUTHandler);
