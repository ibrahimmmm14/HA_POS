#!/usr/bin/env node
/**
 * HA_POS data quality-control check.
 *
 *   npx netlify dev:exec npm run qc
 *
 * Read-only. Scans client files, invoices, serialised devices, earmold orders and
 * repair tickets for missing or inconsistent data, and prints a report.
 * Exits 1 when any ERROR is found (WARN/INFO alone exit 0), so it can run on a schedule.
 * Set QC_JSON=1 for machine-readable output.
 */
import { PrismaClient } from '@prisma/client';
import { requireDatabaseUrl } from './tables.mjs';

requireDatabaseUrl();
const prisma = new PrismaClient();
const today = new Date().toISOString().split('T')[0];
const findings = [];
const add = (level, area, ref, message) => findings.push({ level, area, ref, message });

const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86_400_000);
const money = (n) => Math.round(n * 100) / 100;

try {
  // ── Client files ─────────────────────────────────────────────────────────
  const clients = await prisma.client.findMany();
  const byNationalId = new Map();
  for (const c of clients) {
    const ref = `${c.fileNo} ${c.nameEn || c.nameAr}`;
    const phone = (c.phone || '').replace(/[\s-]/g, '');
    if (!phone) add('ERROR', 'client', ref, 'No phone number, the client cannot be contacted');
    else if (!/^(05\d{8}|\+?9665\d{8})$/.test(phone))
      add('WARN', 'client', ref, `Phone "${c.phone}" is not a Saudi mobile number (05XXXXXXXX)`);

    if (!c.nationalId) add('WARN', 'client', ref, 'National ID / Iqama missing (needed for insurance claims)');
    else if (!/^[12]\d{9}$/.test(c.nationalId))
      add('WARN', 'client', ref, `National ID "${c.nationalId}" is not 10 digits starting with 1 or 2`);
    else byNationalId.set(c.nationalId, [...(byNationalId.get(c.nationalId) || []), c.fileNo]);

    if (c.insuranceId && !c.insurancePolicyNo)
      add('WARN', 'client', ref, 'Insurance company set but policy number missing');
    if (!c.nameAr || !c.nameEn) add('INFO', 'client', ref, 'Name missing in Arabic or English');
  }
  for (const [nid, files] of byNationalId) {
    if (files.length > 1)
      add('ERROR', 'client', files.join(', '), `Duplicate client files share national ID ${nid}`);
  }

  // ── Invoices ─────────────────────────────────────────────────────────────
  const invoices = await prisma.invoice.findMany({ where: { status: { not: 'cancelled' } } });
  for (const inv of invoices) {
    const ref = inv.invoiceNo;
    const expectedTotal = money(inv.subtotalBeforeTax + inv.taxAmount);
    if (Math.abs(expectedTotal - inv.grandTotal) > 0.05)
      add('ERROR', 'invoice', ref, `Grand total ${inv.grandTotal} ≠ subtotal + VAT (${expectedTotal})`);
    if (!inv.isInsurance && Math.abs(money(inv.subtotalBeforeTax * 0.15) - inv.taxAmount) > 0.05)
      add('WARN', 'invoice', ref, `VAT ${inv.taxAmount} is not 15% of ${inv.subtotalBeforeTax}`);
    if (inv.remainingDue < 0 || inv.remainingDue > inv.grandTotal + 0.05)
      add('ERROR', 'invoice', ref, `Remaining due ${inv.remainingDue} is outside 0..${inv.grandTotal}`);
    if (inv.remainingDue > 0 && inv.date && daysBetween(inv.date, today) > 30)
      add('WARN', 'invoice', ref, `Unpaid balance ${inv.remainingDue} SAR for ${daysBetween(inv.date, today)} days`);
  }

  // ── Serialised hearing aids ──────────────────────────────────────────────
  const units = await prisma.serialUnit.findMany();
  for (const u of units) {
    const ref = `S/N ${u.serialNumber}`;
    if (u.status === 'sold' && !u.clientId) add('ERROR', 'device', ref, 'Sold but not linked to a client');
    if (u.status === 'sold' && !u.invoiceId) add('ERROR', 'device', ref, 'Sold but not linked to an invoice');
    if (u.status === 'sold' && !u.warrantyEndDate) add('WARN', 'device', ref, 'Sold with no warranty end date');
    if (u.status === 'trial' && !u.clientId) add('ERROR', 'device', ref, 'On trial but no client recorded');
  }

  // ── Earmold lab orders ───────────────────────────────────────────────────
  const earmolds = await prisma.earmoldOrder.findMany();
  for (const o of earmolds) {
    if (!['ready', 'delivered'].includes(o.status) && o.expectedDate < today)
      add('WARN', 'earmold', o.orderNo, `Past expected date ${o.expectedDate}, status "${o.status}"`);
    if (o.status === 'delivered' && !o.invoiceId)
      add('WARN', 'earmold', o.orderNo, 'Delivered but never invoiced');
  }

  // ── Repair tickets ───────────────────────────────────────────────────────
  const repairs = await prisma.repairTicket.findMany({ include: { events: true } });
  const repeatBySerial = new Map();
  for (const r of repairs) {
    const open = !['ready', 'delivered', 'cancelled'].includes(r.status);
    if (open && r.expectedDate && r.expectedDate < today)
      add('WARN', 'repair', r.ticketNo, `Overdue: promised ${r.expectedDate}, status "${r.status}"`);
    if (open && !r.expectedDate) add('INFO', 'repair', r.ticketNo, 'No expected ready date given to the client');
    if (r.status === 'ready') {
      const readyEvent = r.events.filter((e) => e.toStatus === 'ready').pop();
      const since = readyEvent ? daysBetween(readyEvent.timestamp.slice(0, 10), today) : 0;
      if (since > 14) add('WARN', 'repair', r.ticketNo, `Ready for pickup for ${since} days, follow up with client`);
    }
    if (r.events.length === 0) add('ERROR', 'repair', r.ticketNo, 'Ticket has no history entries');
    if (r.serialNumber) repeatBySerial.set(r.serialNumber, [...(repeatBySerial.get(r.serialNumber) || []), r]);
  }
  for (const [serial, list] of repeatBySerial) {
    const recent = list.filter((r) => daysBetween(r.receivedAt, today) <= 90);
    if (recent.length >= 2)
      add('WARN', 'repair', `S/N ${serial}`, `${recent.length} repairs in 90 days, check for a recurring fault or replacement`);
  }

  // ── Report ───────────────────────────────────────────────────────────────
  const counts = { ERROR: 0, WARN: 0, INFO: 0 };
  findings.forEach((f) => counts[f.level]++);

  if (process.env.QC_JSON) {
    console.log(JSON.stringify({ date: today, counts, findings }, null, 2));
  } else {
    console.log(`HA_POS quality-control report, ${today}`);
    console.log(
      `Checked ${clients.length} clients, ${invoices.length} invoices, ${units.length} devices, ` +
        `${earmolds.length} earmold orders, ${repairs.length} repairs`
    );
    console.log(`Found ${counts.ERROR} errors, ${counts.WARN} warnings, ${counts.INFO} notes\n`);
    for (const level of ['ERROR', 'WARN', 'INFO']) {
      for (const f of findings.filter((x) => x.level === level)) {
        console.log(`${level.padEnd(5)} [${f.area}] ${f.ref}: ${f.message}`);
      }
    }
  }
  process.exitCode = counts.ERROR > 0 ? 1 : 0;
} finally {
  await prisma.$disconnect();
}
