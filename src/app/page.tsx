'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/components/common/LanguageContext';
import { useBranch } from '@/components/common/BranchContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Scissors,
  AlertTriangle,
  Receipt,
  PlusCircle,
  Zap,
  ArrowUpRight,
  Users,
  Package,
  Activity,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export default function DashboardPage() {
  const { lang, t } = useLanguage();
  const { currentBranch } = useBranch();

  const [stats, setStats] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [earmolds, setEarmolds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/reports').then((res) => res.json()),
      fetch('/api/invoices').then((res) => res.json()),
      fetch('/api/earmolds').then((res) => res.json()),
    ])
      .then(([repData, invData, earData]) => {
        setStats(repData);
        if (invData.invoices) setInvoices(invData.invoices.slice(0, 5));
        if (earData.orders) setEarmolds(earData.orders.slice(0, 5));
      })
      .finally(() => setLoading(false));
  }, []);

  const kpis = stats?.kpis || {
    salesToday: 0,
    salesMonth: 29244.5,
    totalReceivables: 11858,
    activeOrdersCount: 2,
    lowStockCount: 1,
    totalInvoicesCount: 2,
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 rounded-3xl p-6 text-white shadow-lg shadow-blue-900/10">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-300 bg-blue-800/60 px-3 py-1 rounded-full">
            {lang === 'ar' ? currentBranch.nameAr : currentBranch.nameEn}
          </span>
          <h1 className="text-2xl font-black mt-2">
            {lang === 'ar' ? 'لوحة المتابعة والمؤشرات الحيوية' : 'Executive Overview & Clinical KPIs'}
          </h1>
          <p className="text-xs text-blue-200 mt-1 max-w-xl">
            {lang === 'ar'
              ? 'متابعة حركة المبيعات اليومية، طلبات المعمل المخصصة، مستويات المخزون، ومطالبات التأمين عبر جميع الفروع'
              : 'Real-time sales, custom lab manufacturing pipelines, multi-branch stock levels, and insurance claims'}
          </p>
        </div>

        {/* Quick Buttons */}
        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/invoices/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold rounded-xl shadow-md transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t.newInvoice}</span>
          </Link>
          <Link
            href="/pos"
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-md transition"
          >
            <Zap className="w-4 h-4" />
            <span>{t.pos}</span>
          </Link>
          <Link
            href="/earmolds/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-md transition"
          >
            <Scissors className="w-4 h-4" />
            <span>{t.newEarmold}</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Sales Today */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-gray-500">{t.salesToday}</div>
            <div className="text-lg font-black text-gray-900 font-mono mt-1">
              {formatCurrency(kpis.salesToday)} ر.س
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Sales This Month */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-gray-500">{t.salesMonth}</div>
            <div className="text-lg font-black text-blue-700 font-mono mt-1">
              {formatCurrency(kpis.salesMonth)} ر.س
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Receivables / Due */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-gray-500">{t.unpaidBalance}</div>
            <div className="text-lg font-black text-red-600 font-mono mt-1">
              {formatCurrency(kpis.totalReceivables)} ر.س
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        {/* Active Lab Orders */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-gray-500">{t.activeOrders}</div>
            <div className="text-lg font-black text-purple-700 font-mono mt-1">
              {kpis.activeOrdersCount} {lang === 'ar' ? 'طلبات' : 'Orders'}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Scissors className="w-5 h-5" />
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-gray-500">{t.lowStockCount}</div>
            <div className="text-lg font-black text-amber-600 font-mono mt-1">
              {kpis.lowStockCount} {lang === 'ar' ? 'أصناف' : 'Items'}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Middle Grid: Branch Sales Breakdown + Quick Navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Branch Performance Comparison (7 Cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <span>{t.branchPerformance}</span>
            </h3>
            <span className="text-xs text-gray-400 font-mono">
              {stats?.branchStats?.length || 3} Branches
            </span>
          </div>

          <div className="space-y-3">
            {(stats?.branchStats || []).map((b: any) => {
              const maxVal = 35000;
              const pct = Math.min(100, Math.round((b.totalSales / maxVal) * 100));
              return (
                <div key={b.branchId} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-gray-800">{lang === 'ar' ? b.nameAr : b.nameEn}</span>
                    <span className="font-mono text-blue-700">
                      {formatCurrency(b.totalSales)} ر.س ({b.invoiceCount} فواتير)
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500"
                      style={{ width: `${Math.max(5, pct)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Doctor & Hospital Referrals Widget (5 Cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>{t.doctorReferrals}</span>
            </h3>
            <Link href="/reports" className="text-xs text-blue-600 hover:underline">
              {lang === 'ar' ? 'المزيد' : 'View all'}
            </Link>
          </div>

          <div className="space-y-2.5">
            {(stats?.doctorStats || []).slice(0, 3).map((d: any) => (
              <div
                key={d.doctorId}
                className="p-3 bg-slate-50/60 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-gray-900">{d.doctorNameAr}</div>
                  <div className="text-[10px] text-gray-500">{d.hospitalNameAr}</div>
                </div>
                <div className="text-end">
                  <div className="font-mono font-bold text-emerald-700">
                    {formatCurrency(d.commissionEarned)} ر.س
                  </div>
                  <div className="text-[10px] text-gray-500">
                    {d.referralsCount} إحالات ({d.commissionPercent}%)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Two Tables Grid: Recent Invoices & Recent Lab Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices Table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-blue-600" />
              <span>{lang === 'ar' ? 'أحدث الفواتير الصادرة' : 'Recent Invoices'}</span>
            </h3>
            <Link href="/invoices" className="text-xs text-blue-600 hover:underline">
              {lang === 'ar' ? 'عرض الكل' : 'View all'}
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-50 text-gray-600 font-semibold border-b border-gray-200">
                <tr>
                  <th className="p-3 text-start">{t.invoiceNo}</th>
                  <th className="p-3 text-start">{t.clientInfo}</th>
                  <th className="p-3 text-center">{t.date}</th>
                  <th className="p-3 text-end">{t.grandTotal}</th>
                  <th className="p-3 text-center">{t.status}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3 font-mono font-bold text-blue-700">
                      <Link href={`/invoices/${inv.id}`}>{inv.invoiceNo}</Link>
                    </td>
                    <td className="p-3 font-medium text-gray-900">
                      {inv.clientNameAr}
                    </td>
                    <td className="p-3 text-center font-mono text-gray-500">{inv.date}</td>
                    <td className="p-3 text-end font-mono font-bold text-gray-900">
                      {formatCurrency(inv.grandTotal)} ر.س
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          inv.deliveryStatus === 'delivered'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inv.deliveryStatus === 'trial'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {inv.deliveryStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Custom Earmold Orders */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Scissors className="w-4 h-4 text-purple-600" />
              <span>{lang === 'ar' ? 'طلبات قوالب المعمل الجارية' : 'Active Earmold Orders'}</span>
            </h3>
            <Link href="/earmolds" className="text-xs text-purple-600 hover:underline">
              {lang === 'ar' ? 'عرض المعمل' : 'View all'}
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-50 text-gray-600 font-semibold border-b border-gray-200">
                <tr>
                  <th className="p-3 text-start">{t.earmoldOrderNo}</th>
                  <th className="p-3 text-start">{t.clientInfo}</th>
                  <th className="p-3 text-center">{t.earSide}</th>
                  <th className="p-3 text-center">{t.status}</th>
                  <th className="p-3 text-end">{t.price}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {earmolds.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3 font-mono font-bold text-purple-700">
                      <Link href={`/earmolds/${order.id}`}>{order.orderNo}</Link>
                    </td>
                    <td className="p-3 font-medium text-gray-900">
                      {order.clientNameAr}
                    </td>
                    <td className="p-3 text-center">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded">
                        {order.ear === 'both' ? 'L & R' : order.ear === 'left' ? 'L' : 'R'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          order.status === 'ready'
                            ? 'bg-emerald-100 text-emerald-800'
                            : order.status === 'in_production'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="p-3 text-end font-mono font-bold text-gray-900">
                      {formatCurrency(order.price)} ر.س
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
