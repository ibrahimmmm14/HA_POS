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
} from 'lucide-react';

export function Header() {
  const { lang, toggleLang, t } = useLanguage();
  const {
    branches,
    currentBranch,
    setCurrentBranchId,
    currentUser,
    users,
    setCurrentUserId,
  } = useBranch();

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
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {lang === 'ar' ? b.nameAr : b.nameEn}
                </option>
              ))}
            </select>
          </div>

          {/* User & Role Switcher */}
          <div className="relative flex items-center bg-blue-50/70 border border-blue-200 rounded-lg px-2.5 py-1 text-xs">
            <User className="w-4 h-4 text-blue-600 mx-1.5 flex-shrink-0" />
            <select
              value={currentUser.id}
              onChange={(e) => setCurrentUserId(e.target.value)}
              className="bg-transparent text-blue-900 font-semibold focus:outline-none cursor-pointer pr-4"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {lang === 'ar' ? u.nameAr : u.nameEn} (
                  {u.role === 'super_admin'
                    ? t.roleSuperAdmin
                    : u.role === 'branch_manager'
                    ? t.roleBranchManager
                    : u.role === 'cashier'
                    ? t.roleCashier
                    : t.roleAudiologist}
                  )
                </option>
              ))}
            </select>
          </div>

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
