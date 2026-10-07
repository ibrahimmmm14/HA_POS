'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { useBranch } from '@/components/common/BranchContext';
import { useLanguage } from '@/components/common/LanguageContext';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { pageRequirement, satisfies } from '@/lib/permissions';
import { safeNext } from '@/lib/nav';

// First page (in menu order) a user is allowed to open; used when they land on a page they cannot see
const LANDING_ORDER = ['/', '/pos', '/invoices', '/clients', '/earmolds', '/repairs', '/inventory', '/finance', '/reports', '/users', '/account'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { lang } = useLanguage();
  const { authStatus, session, permissions } = useBranch();

  const isLogin = pathname === '/login';
  const allowed = satisfies(permissions, pageRequirement(pathname));
  const mustChange = !!session?.mustChangePassword;

  useEffect(() => {
    if (authStatus === 'signedOut' && !isLogin) {
      const next = pathname && pathname !== '/' ? `?next=${encodeURIComponent(pathname)}` : '';
      router.replace(`/login${next}`);
    } else if (authStatus === 'signedIn' && isLogin && !mustChange) {
      router.replace(safeNext(window.location.search));
    } else if (authStatus === 'signedIn' && mustChange && pathname !== '/account') {
      router.replace('/account');
    } else if (authStatus === 'signedIn' && !allowed && pathname === '/') {
      const landing = LANDING_ORDER.find((p) => satisfies(permissions, pageRequirement(p)));
      if (landing && landing !== '/') router.replace(landing);
    }
  }, [authStatus, isLogin, mustChange, allowed, pathname, permissions, router]);

  // The sign-in page is shown without the menus
  if (isLogin) return <main className="flex-1">{children}</main>;

  if (authStatus !== 'signedIn') {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-gray-500 min-h-screen">
        {lang === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 overflow-x-hidden p-6">
          {allowed ? (
            children
          ) : (
            <div className="max-w-md mx-auto mt-16 bg-white border border-gray-200 rounded-2xl p-8 text-center space-y-3 shadow-sm">
              <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto" />
              <h2 className="text-lg font-black text-gray-900">
                {lang === 'ar' ? 'ليست لديك صلاحية لهذه الصفحة' : 'You do not have access to this page'}
              </h2>
              <p className="text-xs text-gray-500">
                {lang === 'ar'
                  ? 'تواصل مع مدير النظام إذا كنت تحتاج هذه الصلاحية.'
                  : 'Ask your system administrator if you need this permission.'}
              </p>
              <Link href="/account" className="inline-block text-xs font-bold text-blue-600 hover:underline">
                {lang === 'ar' ? 'حسابي' : 'My account'}
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
