/**
 * Roles, permissions and which permission each page / API route needs.
 * Pure data and functions, so the same rules run in the browser (menus) and on the server (enforcement).
 */

export type Role =
  | 'super_admin'
  | 'branch_manager'
  | 'cashier'
  | 'inventory_officer'
  | 'audiologist'
  | 'accountant';

export const PERMISSIONS = [
  { key: 'dashboard', ar: 'لوحة التحكم', en: 'Dashboard' },
  { key: 'pos', ar: 'نقطة البيع السريعة', en: 'Fast POS' },
  { key: 'invoices', ar: 'الفواتير والمبيعات', en: 'Invoices & sales' },
  { key: 'earmolds', ar: 'طلبات المعمل (القوالب)', en: 'Lab orders (earmolds)' },
  { key: 'repairs', ar: 'صيانة الأجهزة', en: 'Device repairs' },
  { key: 'clients', ar: 'المرضى والعملاء', en: 'Patients & clients' },
  { key: 'inventory', ar: 'المستودعات والمخزون', en: 'Inventory' },
  { key: 'inventory_prices', ar: 'تعديل أسعار الأصناف', en: 'Edit item prices' },
  { key: 'transfers', ar: 'التحويلات بين الفروع', en: 'Branch transfers' },
  { key: 'serials', ar: 'الأرقام التسلسلية', en: 'Serial numbers' },
  { key: 'messaging', ar: 'رسائل واتساب و SMS', en: 'Messaging' },
  { key: 'migration', ar: 'استيراد البيانات القديمة', en: 'Data import' },
  { key: 'reports', ar: 'التقارير والمؤشرات', en: 'Reports' },
  { key: 'finance', ar: 'التقرير المالي', en: 'Finance report' },
  { key: 'records', ar: 'سجل البيانات المحفوظة', en: 'Database records' },
  { key: 'settings', ar: 'الإعدادات والبيانات الأساسية', en: 'Settings & master data' },
  { key: 'users', ar: 'إدارة المستخدمين والصلاحيات', en: 'Users & permissions' },
] as const;

export type Permission = (typeof PERMISSIONS)[number]['key'];

export const ALL_PERMISSIONS: Permission[] = PERMISSIONS.map((p) => p.key);

export const ROLES: { key: Role; ar: string; en: string }[] = [
  { key: 'super_admin', ar: 'مدير النظام', en: 'System administrator' },
  { key: 'branch_manager', ar: 'مدير فرع', en: 'Branch manager' },
  { key: 'accountant', ar: 'محاسب', en: 'Accountant' },
  { key: 'cashier', ar: 'كاشير', en: 'Cashier' },
  { key: 'audiologist', ar: 'أخصائي سمعيات', en: 'Audiologist' },
  { key: 'inventory_officer', ar: 'مسؤول مخزون', en: 'Inventory officer' },
];

export const ROLE_DEFAULTS: Record<Role, Permission[]> = {
  super_admin: ALL_PERMISSIONS,
  branch_manager: [
    'dashboard', 'pos', 'invoices', 'earmolds', 'repairs', 'clients', 'inventory',
    'inventory_prices', 'transfers', 'serials', 'messaging', 'reports', 'finance', 'records',
  ],
  accountant: ['dashboard', 'invoices', 'reports', 'finance', 'records'],
  cashier: ['dashboard', 'pos', 'invoices', 'clients'],
  audiologist: ['dashboard', 'clients', 'earmolds', 'repairs'],
  inventory_officer: ['dashboard', 'inventory', 'transfers', 'serials'],
};

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && value in ROLE_DEFAULTS;
}

export function isPermission(value: unknown): value is Permission {
  return typeof value === 'string' && (ALL_PERMISSIONS as string[]).includes(value);
}

/** Parse the stored override (JSON array or null) into a clean list of known permissions, or null. */
export function parsePermissionOverride(raw: string | null | undefined): Permission[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isPermission) : null;
  } catch {
    return null;
  }
}

/** A system administrator always has every permission; others use their override, else their role defaults. */
export function effectivePermissions(role: string, override: Permission[] | null): Permission[] {
  if (role === 'super_admin') return ALL_PERMISSIONS;
  if (override) return override;
  return isRole(role) ? ROLE_DEFAULTS[role] : [];
}

// ─── What each page / API route needs ─────────────────────────────────────

/** 'auth' = any signed-in user; otherwise the user needs at least one of the listed permissions. */
export type Requirement = 'auth' | Permission[];

interface Rule {
  prefix: string;
  /** Exact match only (for '/') */
  exact?: boolean;
  methods?: string[];
  need: Requirement;
}

// First matching rule wins, so put the most specific ones first.
const API_RULES: Rule[] = [
  // Master data is readable by every signed-in user (menus, pickers); changing it needs "settings".
  { prefix: '/api/branches', methods: ['GET'], need: 'auth' },
  { prefix: '/api/branches', need: ['settings'] },
  { prefix: '/api/hospitals', need: ['settings'] },
  { prefix: '/api/doctors', need: ['settings'] },
  { prefix: '/api/insurance', need: ['settings'] },

  { prefix: '/api/items', methods: ['GET'], need: ['inventory', 'pos', 'invoices', 'transfers', 'serials', 'earmolds', 'repairs'] },
  { prefix: '/api/items/bulk-price', need: ['inventory_prices'] },
  { prefix: '/api/items/', methods: ['PUT'], need: ['inventory_prices'] },
  { prefix: '/api/items', need: ['inventory'] },

  { prefix: '/api/clients', methods: ['GET'], need: ['clients', 'invoices', 'pos', 'earmolds', 'repairs', 'messaging'] },
  { prefix: '/api/clients', need: ['clients', 'pos', 'invoices'] },
  { prefix: '/api/audiograms', need: ['clients'] },
  { prefix: '/api/invoices', need: ['invoices', 'pos'] },
  { prefix: '/api/earmolds', need: ['earmolds', 'invoices'] },
  { prefix: '/api/repairs', need: ['repairs'] },
  { prefix: '/api/transfers', need: ['transfers', 'inventory'] },
  { prefix: '/api/messaging', need: ['messaging'] },
  { prefix: '/api/migration', need: ['migration'] },
  { prefix: '/api/records', need: ['records'] },
  { prefix: '/api/reports', need: ['dashboard', 'reports'] },
  { prefix: '/api/audit-logs', need: ['dashboard', 'reports', 'records', 'users'] },
  { prefix: '/api/finance', need: ['finance'] },
  { prefix: '/api/users', need: ['users'] },
  { prefix: '/api/login-logs', need: ['users'] },
];

const PAGE_RULES: Rule[] = [
  { prefix: '/', exact: true, need: ['dashboard'] },
  { prefix: '/pos', need: ['pos'] },
  { prefix: '/invoices', need: ['invoices', 'pos'] },
  { prefix: '/earmolds', need: ['earmolds'] },
  { prefix: '/repairs', need: ['repairs'] },
  { prefix: '/clients', need: ['clients'] },
  { prefix: '/inventory/transfers', need: ['transfers', 'inventory'] },
  { prefix: '/inventory/serials', need: ['serials'] },
  { prefix: '/inventory', need: ['inventory'] },
  { prefix: '/messaging', need: ['messaging'] },
  { prefix: '/migration', need: ['migration'] },
  { prefix: '/reports', need: ['reports'] },
  { prefix: '/finance', need: ['finance'] },
  { prefix: '/records', need: ['records'] },
  { prefix: '/settings', need: ['settings'] },
  { prefix: '/users', need: ['users'] },
  { prefix: '/account', need: 'auth' },
];

function match(rules: Rule[], pathname: string, method: string): Requirement | null {
  for (const r of rules) {
    if (r.methods && !r.methods.includes(method.toUpperCase())) continue;
    const hit = r.exact ? pathname === r.prefix : pathname === r.prefix || pathname.startsWith(r.prefix.endsWith('/') ? r.prefix : r.prefix + '/');
    if (hit) return r.need;
  }
  return null;
}

/** Unknown API routes are restricted to users with "users" (in practice, administrators). */
export function apiRequirement(pathname: string, method: string): Requirement {
  return match(API_RULES, pathname, method) ?? ['users'];
}

/** Unknown pages need only a signed-in user (the page itself calls guarded APIs). */
export function pageRequirement(pathname: string): Requirement {
  return match(PAGE_RULES, pathname, 'GET') ?? 'auth';
}

export function satisfies(permissions: readonly string[], need: Requirement): boolean {
  return need === 'auth' || need.some((p) => permissions.includes(p));
}
