'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/components/common/LanguageContext';
import { useBranch } from '@/components/common/BranchContext';
import { PERMISSIONS, ROLES } from '@/lib/permissions';

export default function AccountPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const { session, refreshSession } = useBranch();
  const ar = lang === 'ar';

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const mustChange = !!session?.mustChangePassword;
  const role = ROLES.find((r) => r.key === session?.role);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setDone(false);
    if (next !== confirm) {
      setError(ar ? 'كلمتا المرور الجديدتان غير متطابقتين.' : 'The new passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          data.error === 'wrong_password'
            ? ar ? 'كلمة المرور الحالية غير صحيحة.' : 'The current password is incorrect.'
            : data.error === 'weak_password'
            ? ar ? 'كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف.' : 'The new password must be at least 8 characters.'
            : data.error === 'same_password'
            ? ar ? 'اختر كلمة مرور مختلفة عن الحالية.' : 'Choose a password different from the current one.'
            : ar ? 'تعذر تغيير كلمة المرور.' : 'Could not change the password.'
        );
        return;
      }
      setCurrent('');
      setNext('');
      setConfirm('');
      setDone(true);
      await refreshSession();
      if (mustChange) router.replace('/');
    } catch {
      setError(ar ? 'حدث خطأ في الاتصال.' : 'Connection error.');
    } finally {
      setBusy(false);
    }
  };

  const input = 'w-full border border-gray-300 rounded-lg p-2.5 text-xs font-mono focus:ring-2 focus:ring-blue-500';

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="pb-4 border-b border-gray-200">
        <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
          <KeyRound className="w-6 h-6 text-blue-600" />
          <span>{ar ? 'حسابي' : 'My Account'}</span>
        </h2>
        <p className="text-xs text-gray-500">
          {session?.nameAr} · <span className="font-mono">{session?.username}</span>
          {role && <> · {ar ? role.ar : role.en}</>}
        </p>
      </div>

      {mustChange && (
        <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-3">
          {ar
            ? 'كلمة مرورك مؤقتة. يجب تغييرها قبل متابعة استخدام النظام.'
            : 'Your password is temporary. You must change it before using the system.'}
        </p>
      )}

      <form onSubmit={submit} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4 text-xs">
        <h3 className="font-bold text-sm text-gray-900">{ar ? 'تغيير كلمة المرور' : 'Change password'}</h3>
        <div>
          <label className="block font-semibold text-gray-700 mb-1">{ar ? 'كلمة المرور الحالية' : 'Current password'}</label>
          <input className={input} dir="ltr" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
        </div>
        <div>
          <label className="block font-semibold text-gray-700 mb-1">{ar ? 'كلمة المرور الجديدة (8 أحرف على الأقل)' : 'New password (at least 8 characters)'}</label>
          <input className={input} dir="ltr" type="password" autoComplete="new-password" required minLength={8} value={next} onChange={(e) => setNext(e.target.value)} />
        </div>
        <div>
          <label className="block font-semibold text-gray-700 mb-1">{ar ? 'تأكيد كلمة المرور الجديدة' : 'Confirm new password'}</label>
          <input className={input} dir="ltr" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        {error && <p className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5">{error}</p>}
        {done && !mustChange && (
          <p className="text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
            {ar ? 'تم تغيير كلمة المرور.' : 'Password changed.'}
          </p>
        )}
        <button type="submit" disabled={busy} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow transition disabled:opacity-60">
          {busy ? (ar ? 'جارٍ الحفظ...' : 'Saving...') : ar ? 'حفظ كلمة المرور' : 'Save password'}
        </button>
      </form>

      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-3 text-xs">
        <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>{ar ? 'صلاحياتي' : 'My permissions'}</span>
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {PERMISSIONS.filter((p) => session?.permissions.includes(p.key)).map((p) => (
            <span key={p.key} className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-semibold">
              {ar ? p.ar : p.en}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
