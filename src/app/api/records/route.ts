import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Read-only browser for what is stored in the database.
 *   GET /api/records                → record count per table + latest additions (from the audit log)
 *   GET /api/records?table=clients  → newest rows of one table
 */

export const dynamic = 'force-dynamic';

const LIMIT = 200;

// Only these tables can be browsed; each maps to its Prisma query (newest first where a date exists)
const TABLES = {
  clients: () => prisma.client.findMany({ orderBy: { createdAt: 'desc' }, take: LIMIT }),
  items: () => prisma.item.findMany({ orderBy: { id: 'desc' }, take: LIMIT }),
  serialUnits: () =>
    prisma.serialUnit.findMany({
      include: { item: { select: { nameEn: true, nameAr: true } } },
      orderBy: { id: 'desc' },
      take: LIMIT,
    }),
  invoices: () =>
    prisma.invoice.findMany({
      include: { client: { select: { nameAr: true, nameEn: true } } },
      orderBy: { date: 'desc' },
      take: LIMIT,
    }),
  earmoldOrders: () =>
    prisma.earmoldOrder.findMany({
      include: { client: { select: { nameAr: true, nameEn: true } } },
      orderBy: { createdAt: 'desc' },
      take: LIMIT,
    }),
  repairTickets: () =>
    prisma.repairTicket.findMany({
      include: { client: { select: { nameAr: true, nameEn: true } } },
      orderBy: { createdAt: 'desc' },
      take: LIMIT,
    }),
  audiograms: () =>
    prisma.audiogram.findMany({
      include: { client: { select: { nameAr: true, nameEn: true } } },
      orderBy: { date: 'desc' },
      take: LIMIT,
    }),
  stockTransfers: () => prisma.stockTransfer.findMany({ orderBy: { createdAt: 'desc' }, take: LIMIT }),
  messageLogs: () => prisma.messageLog.findMany({ orderBy: { sentAt: 'desc' }, take: LIMIT }),
} as const;

type RecordTable = keyof typeof TABLES;

export async function GET(request: Request) {
  try {
    const table = new URL(request.url).searchParams.get('table');

    if (table) {
      if (!(table in TABLES)) {
        return NextResponse.json({ error: 'Unknown table' }, { status: 400 });
      }
      const rows = await TABLES[table as RecordTable]();
      return NextResponse.json({ table, rows });
    }

    const [
      clients, items, serialUnits, invoices, earmoldOrders,
      repairTickets, audiograms, stockTransfers, messageLogs, recentAdditions,
    ] = await Promise.all([
      prisma.client.count(),
      prisma.item.count(),
      prisma.serialUnit.count(),
      prisma.invoice.count(),
      prisma.earmoldOrder.count(),
      prisma.repairTicket.count(),
      prisma.audiogram.count(),
      prisma.stockTransfer.count(),
      prisma.messageLog.count(),
      prisma.auditLog.findMany({
        where: { OR: [{ action: { startsWith: 'CREATE' } }, { action: 'MIGRATION_IMPORT' }] },
        orderBy: { timestamp: 'desc' },
        take: 30,
      }),
    ]);

    return NextResponse.json({
      counts: {
        clients, items, serialUnits, invoices, earmoldOrders,
        repairTickets, audiograms, stockTransfers, messageLogs,
      },
      recentAdditions,
    });
  } catch (error) {
    console.error('Error reading records:', error);
    return NextResponse.json({ error: 'Failed to read records' }, { status: 500 });
  }
}
