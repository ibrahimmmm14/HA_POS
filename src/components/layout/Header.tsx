'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/components/common/LanguageContext';
import { useBranch } from '@/components/common/BranchContext';
import {
  Building2,
  User,
  Globe,
  PlusCircle,
  Zap,
  Volume2,
  Bell,
  LogOut,
} from 'lucide-react';
import { ROLES } from '@/lib/permissions';

export function Header() {
  const { lang, toggleLang, t } = useLanguage();
  const {
    selectableBranches,
    currentBranch,
    setCurrentBranchId,
    currentUser,
    logout,
  } = useBranch();
  const role = ROLES.find((r) => r.key === currentUser.role);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm print:hidden">
      <div className="flex items-center justify-between px-4 py-2.5">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Volume2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight text-gray-900 leading-tight">
                {lang === 'ar' ? 'معينات السمع POS' : 'Hearing Aid POS'}
              </div>
              <div className="text-xs text-blue-600 font-medium">
                {lang === 'ar' ? 'إدارة المبيعات والمخزون والمعمل' : 'Clinical POS & Lab Management'}
              </div>
            </div>
          </Link>
        </div>

        {/* Action Shortcuts */}
        <div className="hidden md:flex items-center gap-2">
          <Link
            href="/invoices/new"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t.newInvoice}</span>
          </Link>
          <Link
            href="/pos"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition"
          >
            <Zap className="w-4 h-4 text-amber-600" />
            <span>{t.pos}</span>
          </Link>
        </div>

        {/* Center / Controls: Branch Selector, User Switcher, Language Toggle */}
        <div className="flex items-center gap-3">
          {/* Branch Switcher */}
          <div className="relative flex items-center bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs">
            <Building2 className="w-4 h-4 text-gray-500 mx-1.5 flex-shrink-0" />
            <select
              value={currentBranch.id}
              onChange={(e) => setCurrentBranchId(e.target.value)}
              className="bg-transparent text-gray-800 font-semibold focus:outline-none cursor-pointer pr-4"
            >
              {selectableBranches.map((b) => (
                <option key={b.id} value={b.id}>
                  {lang === 'ar' ? b.nameAr : b.nameEn}
                </option>
              ))}
            </select>
          </div>

          {/* Signed-in user */}
          <Link
            href="/account"
            className="flex items-center bg-blue-50/70 border border-blue-200 rounded-lg px-2.5 py-1.5 text-xs hover:bg-blue-100/70 transition"
            title={lang === 'ar' ? 'حسابي وتغيير كلمة المرور' : 'My account & password'}
          >
            <User className="w-4 h-4 text-blue-600 mx-1.5 flex-shrink-0" />
            <span className="text-blue-900 font-semibold">
              {lang === 'ar' ? currentUser.nameAr : currentUser.nameEn || currentUser.nameAr}
              {role && <span className="text-blue-600 font-normal"> ({lang === 'ar' ? role.ar : role.en})</span>}
            </span>
          </Link>

          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition"
            title={lang === 'ar' ? 'تسجيل الخروج' : 'Sign out'}
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden lg:inline">{lang === 'ar' ? 'خروج' : 'Sign out'}</span>
          </button>

          {/* Language Toggle Button */}
          <button
            onClick={toggleLang}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 hover:text-blue-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            title={lang === 'ar' ? 'Switch to English' : 'التحويل للغة العربية'}
          >
            <Globe className="w-4 h-4 text-blue-600" />
            <span>{lang === 'ar' ? 'English' : 'عربي'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
