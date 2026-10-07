'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, UserPlus, Pencil, KeyRound, Users as UsersIcon, History, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/components/common/LanguageContext';
import { useBranch } from '@/components/common/BranchContext';
import { PERMISSIONS, Permission, ROLES, ROLE_DEFAULTS, Role, isAdminOnly } from '@/lib/permissions';

interface ManagedUser {
  id: string;
  username: string;
  nameAr: string;
  nameEn: string;
  role: Role;
  branchIds: string[];
  active: boolean;
  mustChangePassword: boolean;
  hasPassword: boolean;
  lastLoginAt: string | null;
  permissionOverride: Permission[] | null;
  permissions: Permission[];
}

interface LoginLogRow {
  id: string;
  timestamp: string;
  username: string;
  event: string;
  success: boolean;
  ip: string | null;
  userAgent: string | null;
  detail: string | null;
}

const EVENT_LABELS: Record<string, { ar: string; en: string }> = {
  login: { ar: 'تسجيل دخول', en: 'Sign in' },
  logout: { ar: 'تسجيل خروج', en: 'Sign out' },
  login_failed: { ar: 'محاولة دخول فاشلة', en: 'Failed sign-in' },
  login_blocked: { ar: 'محاولة محظورة (قفل مؤقت)', en: 'Blocked (locked out)' },
  setup: { ar: 'الإعداد الأول', en: 'First-time setup' },
  password_changed: { ar: 'تغيير كلمة المرور', en: 'Password changed' },
  password_change_failed: { ar: 'فشل تغيير كلمة المرور', en: 'Password change failed' },
  password_reset: { ar: 'إعادة تعيين كلمة المرور', en: 'Password reset' },
};

const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
function generatePassword(): string {
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

const formatTime = (iso: string | null, lang: string) =>
  iso
    ? new Date(iso).toLocaleString(lang === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB', {
        timeZone: 'Asia/Riyadh',
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : '—';

const shortDevice = (ua: string | null) => {
  if (!ua) return '—';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
  return `${browser}${os ? ' / ' + os : ''}`;
};

type Dialog = { type: 'create' } | { type: 'edit'; user: ManagedUser } | { type: 'password'; user: ManagedUser } | null;

export default function UsersPage() {
  const { lang } = useLanguage();
  const { branches, session } = useBranch();
  const ar = lang === 'ar';

  const [tab, setTab] = useState<'users' | 'logs'>('users');
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState('');

  // user form
  const [username, setUsername] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [role, setRole] = useState<Role>('cashier');
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [active, setActive] = useState(true);
  const [customPerms, setCustomPerms] = useState(false);
  const [perms, setPerms] = useState<Permission[]>([]);
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // login log
  const [logs, setLogs] = useState<LoginLogRow[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logFrom, setLogFrom] = useState('');
  const [logTo, setLogTo] = useState('');
  const [logUser, setLogUser] = useState('');
  const [logStatus, setLogStatus] = useState('all');

  const loadUsers = useCallback(() => {
    return fetch('/api/users')
      .then((r) => r.json())
      .then((d) => d.users && setUsers(d.users))
      .finally(() => setLoading(false));
  }, []);

  const loadLogs = useCallback(() => {
    setLogsLoading(true);
    const q = new URLSearchParams();
    if (logFrom) q.set('from', logFrom);
    if (logTo) q.set('to', logTo);
    if (logUser.trim()) q.set('username', logUser.trim());
    if (logStatus !== 'all') q.set('status', logStatus);
    return fetch(`/api/login-logs?${q}`)
      .then((r) => r.json())
      .then((d) => d.logs && setLogs(d.logs))
      .finally(() => setLogsLoading(false));
  }, [logFrom, logTo, logUser, logStatus]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (tab === 'logs') loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const roleLabel = (r: string) => {
    const found = ROLES.find((x) => x.key === r);
    return found ? (ar ? found.ar : found.en) : r;
  };

  const openCreate = () => {
    setUsername('');
    setNameAr('');
    setNameEn('');
    setRole('cashier');
    setBranchIds(branches.length ? [branches[0].id] : []);
    setActive(true);
    setCustomPerms(false);
    setPerms([...ROLE_DEFAULTS.cashier]);
    setPassword(generatePassword());
    setFormError('');
    setDialog({ type: 'create' });
  };

  const openEdit = (u: ManagedUser) => {
    setNameAr(u.nameAr);
    setNameEn(u.nameEn);
    setRole(u.role);
    setBranchIds(u.branchIds);
    setActive(u.active);
    setCustomPerms(!!u.permissionOverride);
    setPerms((u.permissionOverride ?? ROLE_DEFAULTS[u.role]).filter((p) => !isAdminOnly(p)));
    setFormError('');
    setDialog({ type: 'edit', user: u });
  };

  const openPassword = (u: ManagedUser) => {
    setPassword(generatePassword());
    setFormError('');
    setDialog({ type: 'password', user: u });
  };

  const changeRole = (r: Role) => {
    setRole(r);
    if (!customPerms) setPerms([...ROLE_DEFAULTS[r]]);
  };

  const togglePerm = (p: Permission) => setPerms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  const toggleBranch = (id: string) => setBranchIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const errorText = (code?: string, message?: string) => {
    switch (code) {
      case 'username_taken': return ar ? 'اسم المستخدم مستخدم من قبل.' : 'That username is taken.';
      case 'invalid_username': return ar ? 'اسم المستخدم: 3-30 حرفاً إنجليزياً صغيراً أو أرقاماً أو . _ -' : 'Username: 3-30 lowercase letters, digits, . _ -';
      case 'weak_password': return ar ? 'كلمة المرور يجب ألا تقل عن 8 أحرف.' : message || 'Password must be at least 8 characters.';
      case 'branch_required': return ar ? 'اختر فرعاً واحداً على الأقل.' : 'Choose at least one branch.';
      case 'last_admin': return ar ? 'لا يمكن ذلك: هذا آخر مدير نظام فعّال.' : 'Not allowed: this is the last active administrator.';
      case 'cannot_disable_self': return ar ? 'لا يمكنك إيقاف حسابك بنفسك.' : 'You cannot disable your own account.';
      case 'cannot_change_own_role': return ar ? 'لا يمكنك تغيير دورك بنفسك.' : 'You cannot change your own role.';
      default: return ar ? 'تعذر الحفظ.' : 'Could not save.';
    }
  };

  const send = async (url: string, method: string, body: unknown) => {
    setSaving(true);
    setFormError('');
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(errorText(data.error, data.message));
        return false;
      }
      return true;
    } catch {
      setFormError(ar ? 'حدث خطأ في الاتصال.' : 'Connection error.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const submitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dialog || dialog.type === 'password') return;
    const permissions = customPerms ? perms.filter((p) => !isAdminOnly(p)) : null;
    const ok =
      dialog.type === 'create'
        ? await send('/api/users', 'POST', { username, nameAr, nameEn, role, branchIds, password, permissions })
        : await send(`/api/users/${dialog.user.id}`, 'PUT', { nameAr, nameEn, role, branchIds, active, permissions });
    if (ok) {
      setNotice(
        dialog.type === 'create'
          ? ar ? `تم إنشاء المستخدم. سلّمه كلمة المرور المؤقتة: ${password}` : `User created. Give them the temporary password: ${password}`
          : ar ? 'تم حفظ التعديلات.' : 'Changes saved.'
      );
      setDialog(null);
      loadUsers();
    }
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dialog || dialog.type !== 'password') return;
    if (await send(`/api/users/${dialog.user.id}/password`, 'POST', { password })) {
      setNotice(
        ar
          ? `تم تعيين كلمة مرور مؤقتة لـ ${dialog.user.username}: ${password} (سيُطلب منه تغييرها عند الدخول)`
          : `Temporary password set for ${dialog.user.username}: ${password} (they must change it at sign-in)`
      );
      setDialog(null);
      loadUsers();
    }
  };

  const quickToggleActive = async (u: ManagedUser) => {
    const res = await fetch(`/api/users/${u.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !u.active }),
    });
    const data = await res.json().catch(() => ({}));
    setNotice(res.ok ? '' : errorText(data.error));
    loadUsers();
  };

  const field = 'w-full border border-gray-300 rounded-lg p-2 text-xs';
  const label = 'block font-semibold text-gray-700 mb-1';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
            <span>{ar ? 'المستخدمون والصلاحيات' : 'Users & Permissions'}</span>
          </h2>
          <p className="text-xs text-gray-500">
            {ar ? 'إضافة المستخدمين، تحديد أدوارهم وصلاحياتهم، ومراجعة سجل الدخول' : 'Add users, set their roles and permissions, and review sign-in activity'}
          </p>
        </div>
        {tab === 'users' && (
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition">
            <UserPlus className="w-4 h-4" />
            <span>{ar ? 'إضافة مستخدم' : 'Add User'}</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 border-b border-gray-200 text-xs font-bold">
        {[
          { id: 'users', icon: UsersIcon, text: ar ? 'المستخدمون' : 'Users' },
          { id: 'logs', icon: History, text: ar ? 'سجل الدخول' : 'Sign-in Log' },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id as 'users' | 'logs')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.text}</span>
            </button>
          );
        })}
      </div>

      {notice && (
        <div className="flex items-start justify-between gap-3 text-xs bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl p-3">
          <span dir="auto" className="font-semibold break-all">{notice}</span>
          <button onClick={() => setNotice('')} className="font-bold text-emerald-700">✕</button>
        </div>
      )}

      {tab === 'users' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-900 text-white font-semibold">
                <tr>
                  <th className="p-3 text-start">{ar ? 'المستخدم' : 'User'}</th>
                  <th className="p-3 text-start">{ar ? 'الدور' : 'Role'}</th>
                  <th className="p-3 text-start">{ar ? 'الفروع' : 'Branches'}</th>
                  <th className="p-3 text-center">{ar ? 'الصلاحيات' : 'Permissions'}</th>
                  <th className="p-3 text-center">{ar ? 'الحالة' : 'Status'}</th>
                  <th className="p-3 text-start">{ar ? 'آخر دخول' : 'Last sign-in'}</th>
                  <th className="p-3 text-center">{ar ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className={`hover:bg-slate-50 ${u.active ? '' : 'opacity-60'}`}>
                    <td className="p-3">
                      <div className="font-bold text-gray-900">{ar ? u.nameAr : u.nameEn || u.nameAr}</div>
                      <div className="font-mono text-[11px] text-gray-500">{u.username}</div>
                    </td>
                    <td className="p-3 font-semibold text-gray-800">{roleLabel(u.role)}</td>
                    <td className="p-3 text-gray-600">
                      {u.branchIds.map((id) => branches.find((b) => b.id === id)?.code || id).join(', ')}
                    </td>
                    <td className="p-3 text-center">
                      <span className="font-mono font-bold text-blue-700">{u.permissions.length}</span>
                      <span className="text-gray-400">/{PERMISSIONS.length}</span>
                      {u.permissionOverride && <span className="ms-1 text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">{ar ? 'مخصّص' : 'custom'}</span>}
                    </td>
                    <td className="p-3 text-center">
                      {!u.active ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">{ar ? 'موقوف' : 'Disabled'}</span>
                      ) : !u.hasPassword ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">{ar ? 'بلا كلمة مرور' : 'No password'}</span>
                      ) : u.mustChangePassword ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">{ar ? 'كلمة مرور مؤقتة' : 'Temp password'}</span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">{ar ? 'فعّال' : 'Active'}</span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-gray-500">{formatTime(u.lastLoginAt, lang)}</td>
                    <td className="p-3 text-center">
                      <div className="inline-flex items-center gap-1">
                        <button onClick={() => openEdit(u)} title={ar ? 'تعديل' : 'Edit'} className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => openPassword(u)} title={ar ? 'تعيين كلمة مرور' : 'Set password'} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition">
                          <KeyRound className="w-4 h-4" />
                        </button>
                        {u.id !== session?.id && (
                          <button
                            onClick={() => quickToggleActive(u)}
                            className={`px-2 py-1 rounded-lg text-[11px] font-bold transition ${u.active ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                          >
                            {u.active ? (ar ? 'إيقاف' : 'Disable') : ar ? 'تفعيل' : 'Enable'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && users.length === 0 && (
                  <tr><td colSpan={7} className="py-10 text-center text-gray-400">{ar ? 'لا يوجد مستخدمون' : 'No users'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'logs' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap items-end gap-3 text-xs">
            <div>
              <label className={label}>{ar ? 'من تاريخ' : 'From'}</label>
              <input type="date" value={logFrom} onChange={(e) => setLogFrom(e.target.value)} className={field} />
            </div>
            <div>
              <label className={label}>{ar ? 'إلى تاريخ' : 'To'}</label>
              <input type="date" value={logTo} onChange={(e) => setLogTo(e.target.value)} className={field} />
            </div>
            <div>
              <label className={label}>{ar ? 'المستخدم' : 'User'}</label>
              <input value={logUser} onChange={(e) => setLogUser(e.target.value)} placeholder="username" dir="ltr" className={field} />
            </div>
            <div>
              <label className={label}>{ar ? 'النتيجة' : 'Result'}</label>
              <select value={logStatus} onChange={(e) => setLogStatus(e.target.value)} className={`${field} bg-white`}>
                <option value="all">{ar ? 'الكل' : 'All'}</option>
                <option value="success">{ar ? 'ناجحة' : 'Successful'}</option>
                <option value="failed">{ar ? 'فاشلة' : 'Failed'}</option>
              </select>
            </div>
            <button onClick={loadLogs} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition">
              <RefreshCw className={`w-4 h-4 ${logsLoading ? 'animate-spin' : ''}`} />
              <span>{ar ? 'تطبيق' : 'Apply'}</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-900 text-white font-semibold">
                  <tr>
                    <th className="p-3 text-start">{ar ? 'الوقت' : 'Time'}</th>
                    <th className="p-3 text-start">{ar ? 'المستخدم' : 'User'}</th>
                    <th className="p-3 text-start">{ar ? 'الحدث' : 'Event'}</th>
                    <th className="p-3 text-center">{ar ? 'النتيجة' : 'Result'}</th>
                    <th className="p-3 text-start">IP</th>
                    <th className="p-3 text-start">{ar ? 'الجهاز' : 'Device'}</th>
                    <th className="p-3 text-start">{ar ? 'تفاصيل' : 'Details'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono text-[11px] text-gray-600 whitespace-nowrap">{formatTime(l.timestamp, lang)}</td>
                      <td className="p-3 font-mono font-bold text-gray-900">{l.username}</td>
                      <td className="p-3 text-gray-800">{EVENT_LABELS[l.event] ? (ar ? EVENT_LABELS[l.event].ar : EVENT_LABELS[l.event].en) : l.event}</td>
                      <td className="p-3 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${l.success ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>
                          {l.success ? (ar ? 'نجاح' : 'OK') : ar ? 'فشل' : 'Failed'}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-gray-500">{l.ip || '—'}</td>
                      <td className="p-3 text-[11px] text-gray-500">{shortDevice(l.userAgent)}</td>
                      <td className="p-3 text-[11px] text-gray-500">{l.detail || ''}</td>
                    </tr>
                  ))}
                  {!logsLoading && logs.length === 0 && (
                    <tr><td colSpan={7} className="py-10 text-center text-gray-400">{ar ? 'لا توجد سجلات' : 'No records'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-[11px] text-gray-400">{ar ? 'يعرض آخر 200 سجل مطابق. الأوقات بتوقيت الرياض.' : 'Shows the latest 200 matching entries. Times are Riyadh time.'}</p>
        </div>
      )}

      {/* Create / edit user */}
      {dialog && dialog.type !== 'password' && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-bold text-base text-gray-900">
                {dialog.type === 'create' ? (ar ? 'إضافة مستخدم جديد' : 'Add New User') : ar ? `تعديل: ${dialog.user.username}` : `Edit: ${dialog.user.username}`}
              </h3>
              <button onClick={() => setDialog(null)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            <form onSubmit={submitUser} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {dialog.type === 'create' && (
                  <div>
                    <label className={label}>{ar ? 'اسم المستخدم (للدخول)' : 'Username (for sign-in)'} <span className="text-red-500">*</span></label>
                    <input required dir="ltr" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} className={`${field} font-mono`} />
                  </div>
                )}
                <div>
                  <label className={label}>{ar ? 'الاسم (عربي)' : 'Name (Arabic)'} <span className="text-red-500">*</span></label>
                  <input required value={nameAr} onChange={(e) => setNameAr(e.target.value)} className={field} />
                </div>
                <div>
                  <label className={label}>{ar ? 'الاسم (إنجليزي)' : 'Name (English)'}</label>
                  <input dir="ltr" value={nameEn} onChange={(e) => setNameEn(e.target.value)} className={field} />
                </div>
                <div>
                  <label className={label}>{ar ? 'الدور' : 'Role'}</label>
                  <select
                    value={role}
                    disabled={dialog.type === 'edit' && dialog.user.id === session?.id}
                    onChange={(e) => changeRole(e.target.value as Role)}
                    className={`${field} bg-white`}
                  >
                    {ROLES.map((r) => (
                      <option key={r.key} value={r.key}>{ar ? r.ar : r.en}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={label}>{ar ? 'الفروع المسموح بها' : 'Allowed branches'}</label>
                <div className="flex flex-wrap gap-2">
                  {branches.map((b) => (
                    <label key={b.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer ${branchIds.includes(b.id) ? 'bg-blue-50 border-blue-300 text-blue-900' : 'bg-white border-gray-300 text-gray-700'}`}>
                      <input type="checkbox" checked={branchIds.includes(b.id)} onChange={() => toggleBranch(b.id)} />
                      <span>{ar ? b.nameAr : b.nameEn}</span>
                    </label>
                  ))}
                </div>
              </div>

              {dialog.type === 'create' && (
                <div>
                  <label className={label}>{ar ? 'كلمة مرور مؤقتة (سيُطلب منه تغييرها)' : 'Temporary password (they must change it)'}</label>
                  <div className="flex gap-2">
                    <input required minLength={8} dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} className={`${field} font-mono`} />
                    <button type="button" onClick={() => setPassword(generatePassword())} className="px-3 border border-gray-300 rounded-lg font-bold hover:bg-gray-50 whitespace-nowrap">
                      {ar ? 'توليد' : 'Generate'}
                    </button>
                  </div>
                </div>
              )}

              {dialog.type === 'edit' && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={active}
                    disabled={dialog.user.id === session?.id}
                    onChange={(e) => setActive(e.target.checked)}
                  />
                  <span className="font-semibold text-gray-700">{ar ? 'الحساب فعّال (يمكنه الدخول)' : 'Account is active (can sign in)'}</span>
                </label>
              )}

              <div className="border border-gray-200 rounded-xl p-3 space-y-3">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="font-bold text-gray-900">{ar ? 'الصلاحيات' : 'Permissions'}</span>
                  <label className="flex items-center gap-1.5">
                    <input type="radio" checked={!customPerms} onChange={() => { setCustomPerms(false); setPerms([...ROLE_DEFAULTS[role]]); }} />
                    <span>{ar ? 'حسب الدور (افتراضي)' : 'By role (default)'}</span>
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="radio" checked={customPerms} onChange={() => setCustomPerms(true)} />
                    <span>{ar ? 'تخصيص' : 'Customise'}</span>
                  </label>
                </div>
                {role === 'super_admin' && (
                  <p className="text-[11px] text-amber-800 bg-amber-50 rounded-lg p-2">
                    {ar ? 'مدير النظام يملك كل الصلاحيات دائماً.' : 'A system administrator always has every permission.'}
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {PERMISSIONS.map((p) => {
                    // Settings, adding items, prices, imports, records and users belong to the system administrator only
                    const locked = isAdminOnly(p.key) && role !== 'super_admin';
                    const checked = role === 'super_admin' || (!locked && perms.includes(p.key));
                    const editable = customPerms && role !== 'super_admin' && !locked;
                    return (
                      <label key={p.key} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${editable ? 'cursor-pointer hover:bg-gray-50' : 'opacity-70'}`}>
                        <input type="checkbox" checked={checked} disabled={!editable} onChange={() => togglePerm(p.key)} />
                        <span className="text-gray-800">{ar ? p.ar : p.en}</span>
                        {locked && (
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{ar ? 'مدير النظام فقط' : 'Admin only'}</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              {formError && <p className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5">{formError}</p>}

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setDialog(null)} className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50">{ar ? 'إلغاء' : 'Cancel'}</button>
                <button type="submit" disabled={saving} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow transition disabled:opacity-60">
                  {saving ? (ar ? 'جارٍ الحفظ...' : 'Saving...') : ar ? 'حفظ' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Set temporary password */}
      {dialog && dialog.type === 'password' && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-bold text-base text-gray-900">{ar ? `تعيين كلمة مرور: ${dialog.user.username}` : `Set password: ${dialog.user.username}`}</h3>
              <button onClick={() => setDialog(null)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>
            <form onSubmit={submitPassword} className="space-y-4 text-xs">
              <p className="text-gray-600">
                {ar
                  ? 'ستحل هذه الكلمة محل كلمة المرور الحالية، وسيُطلب من المستخدم تغييرها عند دخوله. كما يُرفع عنه أي قفل مؤقت.'
                  : 'This replaces the current password and the user must change it at their next sign-in. Any temporary lock is lifted too.'}
              </p>
              <div className="flex gap-2">
                <input required minLength={8} dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} className={`${field} font-mono`} />
                <button type="button" onClick={() => setPassword(generatePassword())} className="px-3 border border-gray-300 rounded-lg font-bold hover:bg-gray-50 whitespace-nowrap">
                  {ar ? 'توليد' : 'Generate'}
                </button>
              </div>
              {formError && <p className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5">{formError}</p>}
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setDialog(null)} className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50">{ar ? 'إلغاء' : 'Cancel'}</button>
                <button type="submit" disabled={saving} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow transition disabled:opacity-60">
                  {saving ? (ar ? 'جارٍ الحفظ...' : 'Saving...') : ar ? 'تعيين' : 'Set password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
