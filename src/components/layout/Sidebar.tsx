'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/components/common/LanguageContext';
import {
  LayoutDashboard,
  Zap,
  Receipt,
  Scissors,
  Users,
  Package,
  ArrowLeftRight,
  Barcode,
  MessageSquare,
  FileSpreadsheet,
  BarChart3,
  Settings,
  Activity,
  Wrench,
  Database,
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const navItems = [
    {
      href: '/',
      label: t.dashboard,
      icon: LayoutDashboard,
      active: pathname === '/',
    },
    {
      href: '/pos',
      label: t.pos,
      icon: Zap,
      active: pathname === '/pos',
      badge: 'OTC',
      badgeColor: 'bg-amber-100 text-amber-800',
    },
    {
      href: '/invoices',
      label: t.invoices,
      icon: Receipt,
      active: pathname.startsWith('/invoices'),
    },
    {
      href: '/earmolds',
      label: t.earmolds,
      icon: Scissors,
      active: pathname.startsWith('/earmolds'),
    },
    {
      href: '/repairs',
      label: t.repairs,
      icon: Wrench,
      active: pathname.startsWith('/repairs'),
    },
    {
      href: '/clients',
      label: t.clients,
      icon: Users,
      active: pathname.startsWith('/clients'),
    },
    {
      href: '/inventory',
      label: t.inventory,
      icon: Package,
      active: pathname === '/inventory',
    },
    {
      href: '/inventory/transfers',
      label: t.transfers,
      icon: ArrowLeftRight,
      active: pathname.startsWith('/inventory/transfers'),
    },
    {
      href: '/inventory/serials',
      label: t.serials,
      icon: Barcode,
      active: pathname.startsWith('/inventory/serials'),
    },
    {
      href: '/messaging',
      label: t.messaging,
      icon: MessageSquare,
      active: pathname.startsWith('/messaging'),
    },
    {
      href: '/migration',
      label: t.migration,
      icon: FileSpreadsheet,
      active: pathname.startsWith('/migration'),
    },
    {
      href: '/reports',
      label: t.reports,
      icon: BarChart3,
      active: pathname.startsWith('/reports'),
    },
    {
      href: '/records',
      label: t.records,
      icon: Database,
      active: pathname.startsWith('/records'),
    },
    {
      href: '/settings',
      label: t.settings,
      icon: Settings,
      active: pathname.startsWith('/settings'),
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 min-h-screen border-r border-slate-800 print:hidden">
      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                item.active
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'hover:bg-slate-800/80 hover:text-white text-slate-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${item.active ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* System Status Footer */}
      <div className="p-4 m-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-xs">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            System Online
          </span>
          <span className="font-mono text-[10px]">v1.0-KSA</span>
        </div>
        <div className="text-slate-400 text-[11px]">
          VAT 15% Standard | ZATCA Ready
        </div>
      </div>
    </aside>
  );
}
