/**
 * HA_POS Prisma Database Client & Helper Utilities
 * 
 * This module replaces the previous file-based JSON database engine.
 * All data is stored in Netlify Database (managed Postgres) via Prisma ORM.
 * 
 * Key design decisions:
 * - A singleton PrismaClient is exported for use across API routes.
 * - Complex nested fields (audiogram readings, invoice lines, etc.) are stored
 *   as JSON strings in text columns and parsed/serialized by helper functions here.
 * - The `logAudit()` helper remains API-compatible with existing routes.
 */

import { PrismaClient } from '@prisma/client';
import type {
  Branch,
  Warehouse,
  User,
  Doctor,
  Hospital,
  InsuranceCompany,
  Item,
  SerialUnit,
  Client,
  Audiogram,
  EarmoldOrder,
  Invoice,
  StockTransfer,
  MessageTemplate,
  MessageLog,
  AuditLog,
} from '@/types';

// ─── Singleton Prisma Client ───────────────────────────────────────────────
// In Next.js dev mode, hot reloading can create multiple PrismaClient instances.
// This pattern prevents "too many connections" warnings.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// ─── JSON Serialization Helpers ───────────────────────────────────────────
// JSON fields are stored as text strings. These helpers handle parsing/serializing
// the fields that contain complex nested objects.

/** Parse a JSON string field, returning a default if null/invalid */
function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

// ─── Type Mappers (DB row → TypeScript domain type) ──────────────────────
// Each mapper converts a raw Prisma row (with JSON strings) to a proper
// typed domain object expected by the rest of the application.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapUser(row: any): User {
  // Explicit fields only: never pass the password hash or other account internals to a client.
  return {
    id: row.id,
    username: row.username,
    nameAr: row.nameAr,
    nameEn: row.nameEn,
    role: row.role,
    branchIds: parseJson<string[]>(row.branchIds, []),
    currentBranchId: row.currentBranchId,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapItem(row: any): Item {
  return {
    ...row,
    stockByWarehouse: parseJson<Record<string, number>>(row.stockByWarehouse, {}),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapAudiogram(row: any): Audiogram {
  return {
    ...row,
    frequencies: parseJson<number[]>(row.frequencies, []),
    leftAir: parseJson<Record<number, number | null>>(row.leftAir, {}),
    rightAir: parseJson<Record<number, number | null>>(row.rightAir, {}),
    leftBone: parseJson<Record<number, number | null>>(row.leftBone, {}),
    rightBone: parseJson<Record<number, number | null>>(row.rightBone, {}),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapInvoice(row: any): Invoice {
  return {
    ...row,
    lines: parseJson(row.lines, []),
    paymentDetails: parseJson(row.paymentDetails, undefined),
    insuranceDetails: parseJson(row.insuranceDetails, undefined),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapStockTransfer(row: any): StockTransfer {
  return {
    ...row,
    items: parseJson(row.items, []),
  };
}

// ─── Audit Log Helper ─────────────────────────────────────────────────────
// Drop-in replacement for the old logAudit() from db.ts
// Keeps API routes unchanged.

export async function logAudit(
  action: string,
  entityType: string,
  entityId: string,
  details: string,
  userId = 'usr-01',
  userName = 'د. طارق العتيبي',
  branchId = 'br-01'
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        userId,
        userName,
        branchId,
        action,
        entityType,
        entityId,
        details,
      },
    });
  } catch (error) {
    // Audit failures should never crash the main operation
    console.error('Failed to write audit log:', error);
  }
}

// ─── Re-export domain types for convenience ───────────────────────────────
export type {
  Branch,
  Warehouse,
  User,
  Doctor,
  Hospital,
  InsuranceCompany,
  Item,
  SerialUnit,
  Client,
  Audiogram,
  EarmoldOrder,
  Invoice,
  StockTransfer,
  MessageTemplate,
  MessageLog,
  AuditLog,
};
