/**
 * Device repair tracking helpers shared by the repair API routes and screens.
 */

import type { RepairStatus } from '@/types';

export const REPAIR_STATUSES: RepairStatus[] = [
  'received',
  'diagnosing',
  'sent_to_manufacturer',
  'repairing',
  'ready',
  'delivered',
  'cancelled',
];

export const REPAIR_STATUS_LABELS: Record<RepairStatus, { ar: string; en: string }> = {
  received: { ar: 'تم الاستلام', en: 'Received' },
  diagnosing: { ar: 'قيد الفحص', en: 'Diagnosing' },
  sent_to_manufacturer: { ar: 'أُرسل للوكيل/المصنع', en: 'Sent to Manufacturer' },
  repairing: { ar: 'قيد الإصلاح', en: 'Repairing' },
  ready: { ar: 'جاهز للاستلام', en: 'Ready for Pickup' },
  delivered: { ar: 'تم التسليم', en: 'Delivered' },
  cancelled: { ar: 'ملغي', en: 'Cancelled' },
};

export const REPAIR_STATUS_COLORS: Record<RepairStatus, string> = {
  received: 'bg-amber-100 text-amber-800',
  diagnosing: 'bg-sky-100 text-sky-800',
  sent_to_manufacturer: 'bg-indigo-100 text-indigo-800',
  repairing: 'bg-blue-100 text-blue-800',
  ready: 'bg-emerald-100 text-emerald-800',
  delivered: 'bg-purple-100 text-purple-800',
  cancelled: 'bg-gray-200 text-gray-700',
};

/** Statuses a ticket may move to from its current status. Delivered and cancelled are final. */
export const REPAIR_TRANSITIONS: Record<RepairStatus, RepairStatus[]> = {
  received: ['diagnosing', 'repairing', 'sent_to_manufacturer', 'cancelled'],
  diagnosing: ['repairing', 'sent_to_manufacturer', 'ready', 'cancelled'],
  sent_to_manufacturer: ['repairing', 'ready', 'cancelled'],
  repairing: ['sent_to_manufacturer', 'ready', 'cancelled'],
  ready: ['delivered', 'repairing'],
  delivered: [],
  cancelled: [],
};

export function isRepairStatus(value: unknown): value is RepairStatus {
  return typeof value === 'string' && (REPAIR_STATUSES as string[]).includes(value);
}

export function canTransition(from: RepairStatus, to: RepairStatus): boolean {
  return REPAIR_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Ticket is still in the workshop and past its promised date. */
export function isRepairOverdue(
  ticket: { status: string; expectedDate?: string | null },
  today = new Date().toISOString().split('T')[0]
): boolean {
  if (!ticket.expectedDate) return false;
  if (['ready', 'delivered', 'cancelled'].includes(ticket.status)) return false;
  return ticket.expectedDate < today;
}

/** Local timestamp in the same "YYYY-MM-DD HH:mm" shape the audit log uses. */
export function nowStamp(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 16);
}
