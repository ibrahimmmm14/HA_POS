/**
 * Prisma Seed Script for HA_POS
 * 
 * This script seeds the SQLite database with all initial data from seedData.ts
 * Run with: npx prisma db seed
 * (or automatically during: npx prisma migrate dev)
 */

import { PrismaClient } from '@prisma/client';
import {
  initialBranches,
  initialWarehouses,
  initialUsers,
  initialDoctors,
  initialHospitals,
  initialInsuranceCompanies,
  initialItems,
  initialSerialUnits,
  initialClients,
  initialAudiograms,
  initialEarmoldOrders,
  initialInvoices,
  initialTransfers,
  initialTemplates,
  initialMessageLogs,
  initialAuditLogs,
} from '../src/lib/seedData';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // ─── Hospitals (must come before Doctors & Clients) ───────────────────────
  console.log('📋 Seeding hospitals...');
  for (const hospital of initialHospitals) {
    await prisma.hospital.upsert({
      where: { id: hospital.id },
      update: {},
      create: hospital,
    });
  }

  // ─── Insurance Companies (must come before Clients) ───────────────────────
  console.log('📋 Seeding insurance companies...');
  for (const ins of initialInsuranceCompanies) {
    await prisma.insuranceCompany.upsert({
      where: { id: ins.id },
      update: {},
      create: ins,
    });
  }

  // ─── Branches (must come before Warehouses, SerialUnits, Invoices) ────────
  console.log('🏢 Seeding branches...');
  for (const branch of initialBranches) {
    await prisma.branch.upsert({
      where: { id: branch.id },
      update: {},
      create: branch,
    });
  }

  // ─── Warehouses (must come before Items, SerialUnits) ─────────────────────
  console.log('🏭 Seeding warehouses...');
  for (const warehouse of initialWarehouses) {
    await prisma.warehouse.upsert({
      where: { id: warehouse.id },
      update: {},
      create: warehouse,
    });
  }

  // ─── Users ────────────────────────────────────────────────────────────────
  console.log('👤 Seeding users...');
  for (const user of initialUsers) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {},
      create: {
        ...user,
        branchIds: JSON.stringify(user.branchIds),
      },
    });
  }

  // ─── Doctors (must come before Clients & Invoices) ────────────────────────
  console.log('🩺 Seeding doctors...');
  for (const doctor of initialDoctors) {
    await prisma.doctor.upsert({
      where: { id: doctor.id },
      update: {},
      create: doctor,
    });
  }

  // ─── Items ────────────────────────────────────────────────────────────────
  console.log('📦 Seeding inventory items...');
  for (const item of initialItems) {
    await prisma.item.upsert({
      where: { id: item.id },
      update: {},
      create: {
        ...item,
        stockByWarehouse: JSON.stringify(item.stockByWarehouse),
      },
    });
  }

  // ─── Serial Units ─────────────────────────────────────────────────────────
  console.log('🔢 Seeding serial units...');
  for (const serial of initialSerialUnits) {
    await prisma.serialUnit.upsert({
      where: { id: serial.id },
      update: {},
      create: serial,
    });
  }

  // ─── Clients ──────────────────────────────────────────────────────────────
  console.log('👥 Seeding clients/patients...');
  for (const client of initialClients) {
    await prisma.client.upsert({
      where: { id: client.id },
      update: {},
      create: client,
    });
  }

  // ─── Audiograms ───────────────────────────────────────────────────────────
  console.log('🦻 Seeding audiograms...');
  for (const audiogram of initialAudiograms) {
    await prisma.audiogram.upsert({
      where: { id: audiogram.id },
      update: {},
      create: {
        ...audiogram,
        frequencies: JSON.stringify(audiogram.frequencies),
        leftAir: JSON.stringify(audiogram.leftAir),
        rightAir: JSON.stringify(audiogram.rightAir),
        leftBone: JSON.stringify(audiogram.leftBone),
        rightBone: JSON.stringify(audiogram.rightBone),
      },
    });
  }

  // ─── Earmold Orders ───────────────────────────────────────────────────────
  console.log('🧪 Seeding earmold orders...');
  for (const order of initialEarmoldOrders) {
    await prisma.earmoldOrder.upsert({
      where: { id: order.id },
      update: {},
      create: order,
    });
  }

  // ─── Invoices ─────────────────────────────────────────────────────────────
  console.log('🧾 Seeding invoices...');
  for (const invoice of initialInvoices) {
    await prisma.invoice.upsert({
      where: { id: invoice.id },
      update: {},
      create: {
        ...invoice,
        lines: JSON.stringify(invoice.lines),
        paymentDetails: invoice.paymentDetails ? JSON.stringify(invoice.paymentDetails) : null,
        insuranceDetails: invoice.insuranceDetails ? JSON.stringify(invoice.insuranceDetails) : null,
      },
    });
  }

  // ─── Stock Transfers ──────────────────────────────────────────────────────
  console.log('🔄 Seeding stock transfers...');
  for (const transfer of initialTransfers) {
    await prisma.stockTransfer.upsert({
      where: { id: transfer.id },
      update: {},
      create: {
        ...transfer,
        items: JSON.stringify(transfer.items),
      },
    });
  }

  // ─── Message Templates ────────────────────────────────────────────────────
  console.log('💬 Seeding message templates...');
  for (const template of initialTemplates) {
    await prisma.messageTemplate.upsert({
      where: { id: template.id },
      update: {},
      create: template,
    });
  }

  // ─── Message Logs ─────────────────────────────────────────────────────────
  console.log('📨 Seeding message logs...');
  for (const log of initialMessageLogs) {
    await prisma.messageLog.upsert({
      where: { id: log.id },
      update: {},
      create: log,
    });
  }

  // ─── Audit Logs ───────────────────────────────────────────────────────────
  console.log('📝 Seeding audit logs...');
  for (const log of initialAuditLogs) {
    await prisma.auditLog.upsert({
      where: { id: log.id },
      update: {},
      create: log,
    });
  }

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
