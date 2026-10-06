'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Volume2, LogIn, ShieldCheck, Globe } from 'lucide-react';
import { useLanguage } from '@/components/common/LanguageContext';
import { useBranch } from '@/components/common/BranchContext';
import { safeNext } from '@/lib/nav';

export default function LoginPage() {
  const router = useRouter();
  const { lang, toggleLang } = useLanguage();
  const { refreshSession } = useBranch();
  const ar = lang === 'ar';

  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [needsCode, setNeedsCode] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [setupCode, setSetupCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/auth/setup')
      .then((r) => r.json())
      .then((d) => {
        setNeedsSetup(!!d.needsSetup);
        setNeedsCode(!!d.needsCode);
      })
      .catch(() => setNeedsSetup(false));
  }, []);

  const errorText = (code: string, minutes?: number, message?: string) => {
    switch (code) {
      case 'invalid_credentials':
        return ar ? 'اسم المستخدم أو كلمة المرور غير صحيحة.' : 'Incorrect username or password.';
      case 'locked':
        return ar
          ? `تم إيقاف المحاولات مؤقتاً بسبب كثرة المحاولات الخاطئة. حاول بعد ${minutes ?? 15} دقيقة أو اطلب من المدير إعادة تعيين كلمة المرور.`
          : `Too many failed attempts. Try again in ${minutes ?? 15} minutes or ask an administrator to reset your password.`;
      case 'weak_password':
        return ar ? 'كلمة المرور يجب ألا تقل عن 8 أحرف.' : message || 'Password must be at least 8 characters.';
      case 'invalid_setup_code':
        return ar ? 'رمز الإعداد غير صحيح.' : 'Incorrect setup code.';
      case 'setup_closed':
        return ar ? 'تم الإعداد مسبقاً. سجّل الدخول بحسابك.' : 'Setup is already done. Sign in with your account.';
      default:
        return ar ? 'حدث خطأ. حاول مرة أخرى.' : 'Something went wrong. Please try again.';
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (needsSetup && password !== confirm) {
      setError(ar ? 'كلمتا المرور غير متطابقتين.' : 'The passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(needsSetup ? '/api/auth/setup' : '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(needsSetup ? { password, setupCode } : { username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(errorText(data.error, data.minutes, data.message));
        if (data.error === 'setup_closed') setNeedsSetup(false);
        return;
      }
      await refreshSession();
      router.replace(safeNext(window.location.search));
    } catch {
      setError(errorText('server_error'));
    } finally {
      setBusy(false);
    }
  };

  const input = 'w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <button
        onClick={toggleLang}
        className="absolute top-4 end-4 flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition"
      >
        <Globe className="w-4 h-4" />
        <span>{ar ? 'English' : 'عربي'}</span>
      </button>

      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-blue-700 to-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Volume2 className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-black text-gray-900">{ar ? 'معينات السمع POS' : 'Hearing Aid POS'}</h1>
          <p className="text-xs text-gray-500">
            {needsSetup
              ? ar ? 'الإعداد الأول: أنشئ كلمة مرور لمدير النظام' : 'First-time setup: create the administrator password'
              : ar ? 'سجّل الدخول للمتابعة' : 'Sign in to continue'}
          </p>
        </div>

        {needsSetup === null ? (
          <p className="text-center text-xs text-gray-400">{ar ? 'جارٍ التحميل...' : 'Loading...'}</p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {needsSetup ? (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3 text-[11px] leading-relaxed">
                <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  {ar
                    ? 'سيصبح هذا الحساب (admin) مدير النظام. اختر كلمة مرور قوية الآن، فهذه الصفحة تُغلق نهائياً بعد الإعداد.'
                    : 'This becomes the administrator account (admin). Choose a strong password now: this page closes for good after setup.'}
                </span>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">{ar ? 'اسم المستخدم' : 'Username'}</label>
                <input
                  className={input}
                  dir="ltr"
                  autoComplete="username"
                  autoFocus
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">{ar ? 'كلمة المرور' : 'Password'}</label>
              <input
                className={input}
                dir="ltr"
                type="password"
                autoComplete={needsSetup ? 'new-password' : 'current-password'}
                required
                minLength={needsSetup ? 8 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {needsSetup && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">{ar ? 'تأكيد كلمة المرور' : 'Confirm password'}</label>
                  <input
                    className={input}
                    dir="ltr"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </div>
                {needsCode && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">{ar ? 'رمز الإعداد' : 'Setup code'}</label>
                    <input className={input} dir="ltr" required value={setupCode} onChange={(e) => setSetupCode(e.target.value)} />
                  </div>
                )}
              </>
            )}

            {error && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md transition disabled:opacity-60"
            >
              <LogIn className="w-4 h-4" />
              <span>
                {busy
                  ? ar ? 'جارٍ الدخول...' : 'Please wait...'
                  : needsSetup
                  ? ar ? 'حفظ والدخول' : 'Save and sign in'
                  : ar ? 'تسجيل الدخول' : 'Sign in'}
              </span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
