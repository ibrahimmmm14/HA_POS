'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/components/common/LanguageContext';
import { formatCurrency } from '@/lib/utils';
import {
  Scissors,
  PlusCircle,
  Search,
  Eye,
  CheckCircle,
  Clock,
  ArrowRight,
  Printer,
  Pencil,
} from 'lucide-react';

export default function EarmoldsListPage() {
  const { lang, t } = useLanguage();
  const [orders, setOrders] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/earmolds')
      .then((res) => res.json())
      .then((data) => {
        if (data.orders) setOrders(data.orders);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = orders.filter((o) => {
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    const matchSearch =
      !search ||
      o.orderNo.toLowerCase().includes(search.toLowerCase()) ||
      o.clientNameAr?.toLowerCase().includes(search.toLowerCase()) ||
      o.clientPhone?.includes(search);
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Scissors className="w-6 h-6 text-purple-600" />
            <span>{t.earmoldOrders}</span>
          </h2>
          <p className="text-xs text-gray-500">
            {lang === 'ar'
              ? 'متابعة مراحل تصنيع القوالب، كشوف تشغيل المعامل، والإشعار بجاهزية الاستلام'
              : 'Lab work orders pipeline: impression specs, production status, and 1-click invoice conversion'}
          </p>
        </div>

        <Link
          href="/earmolds/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t.newEarmold}</span>
        </Link>
      </div>

      {/* Filter Chips & Search */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              lang === 'ar'
                ? 'بحث برقم طلب المعمل، اسم المريض، أو الجوال...'
                : 'Search by lab order #, patient name, or phone...'
            }
            className="w-full pl-10 pr-4 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
          />
          <Search className="w-4 h-4 text-gray-400 absolute start-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto text-xs">
          {[
            { id: 'all', label: lang === 'ar' ? 'الكل' : 'All' },
            { id: 'pending', label: t.statusPending },
            { id: 'in_production', label: t.statusInProduction },
            { id: 'ready', label: t.statusReady },
            { id: 'delivered', label: t.statusDelivered },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id)}
              className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                statusFilter === s.id
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-slate-900 text-white font-semibold">
              <tr>
                <th className="p-3 text-start">{t.earmoldOrderNo}</th>
                <th className="p-3 text-start">{t.clientInfo}</th>
                <th className="p-3 text-center">{t.earSide}</th>
                <th className="p-3 text-start">{t.shellType}</th>
                <th className="p-3 text-start">{t.workshopLab}</th>
                <th className="p-3 text-center">{t.expectedDelivery}</th>
                <th className="p-3 text-end">{t.price}</th>
                <th className="p-3 text-center">{t.status}</th>
                <th className="p-3 text-center w-24">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    {loading ? t.loading : t.noData}
                  </td>
                </tr>
              ) : (
                filtered.map((order) => (
                  <tr key={order.id} className="hover:bg-purple-50/20 transition">
                    <td className="p-3 font-mono font-bold text-purple-700">
                      <Link href={`/earmolds/${order.id}`} className="hover:underline">
                        {order.orderNo}
                      </Link>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-gray-900">{order.clientNameAr}</div>
                      <div className="text-[10px] text-gray-500 font-mono">
                        {order.clientPhone}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span className="font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                        {order.ear === 'both' ? 'L & R' : order.ear === 'left' ? 'L' : 'R'}
                      </span>
                    </td>
                    <td className="p-3 capitalize text-gray-800">
                      {order.shellType.replace('_', ' ')}
                    </td>
                    <td className="p-3 text-gray-600 truncate max-w-[150px]">
                      {order.workshop}
                    </td>
                    <td className="p-3 text-center font-mono text-gray-500">
                      {order.expectedDate}
                    </td>
                    <td className="p-3 text-end font-mono font-bold text-gray-900">
                      {formatCurrency(order.price)} ر.س
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          order.status === 'ready'
                            ? 'bg-emerald-100 text-emerald-800'
                            : order.status === 'in_production'
                            ? 'bg-blue-100 text-blue-800'
                            : order.status === 'delivered'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {order.status === 'ready'
                          ? t.statusReady
                          : order.status === 'in_production'
                          ? t.statusInProduction
                          : order.status === 'delivered'
                          ? t.statusDelivered
                          : t.statusPending}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          href={`/earmolds/${order.id}`}
                          className="p-1.5 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 transition inline-flex"
                          title="عرض طلب المعمل"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/earmolds/${order.id}/edit`}
                          className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition inline-flex"
                          title={lang === 'ar' ? 'تعديل الطلب' : 'Edit order'}
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
