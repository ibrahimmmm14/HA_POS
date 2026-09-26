'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/components/common/LanguageContext';
import { SerialUnit, Item } from '@/types';
import {
  Barcode,
  Search,
  ShieldCheck,
  Building,
  User,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';

export default function SerialsPage() {
  const { lang, t } = useLanguage();
  const [serials, setSerials] = useState<SerialUnit[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/items')
      .then((res) => res.json())
      .then((data) => {
        if (data.serials) setSerials(data.serials);
        if (data.items) setItems(data.items);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = serials.filter((s) => {
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchSearch =
      !search ||
      s.serialNumber.toLowerCase().includes(search.toLowerCase()) ||
      s.itemId.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Barcode className="w-6 h-6 text-purple-600" />
            <span>{t.serialTracking}</span>
          </h2>
          <p className="text-xs text-gray-500">
            {lang === 'ar'
              ? 'تتبع الأرقام التسلسلية الفردية للمعينات السمعية، فترات الضمان، وتاريخ الصرف'
              : 'Individual hearing aid serial/IMEI tracking, patient warranty lifecycle, and trial loaners'}
          </p>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              lang === 'ar'
                ? 'بحث بالرقم التسلسلي (Serial Number)...'
                : 'Search by serial number...'
            }
            className="w-full pl-10 pr-4 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 font-mono"
          />
          <Search className="w-4 h-4 text-gray-400 absolute start-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2 text-xs">
          {[
            { id: 'all', label: lang === 'ar' ? 'الكل' : 'All' },
            { id: 'in_stock', label: t.serialAvailable },
            { id: 'sold', label: t.serialSold },
            { id: 'trial', label: t.serialTrial },
            { id: 'in_repair', label: t.serialInRepair },
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

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-slate-900 text-white font-semibold">
              <tr>
                <th className="p-3 text-start">{t.serialNumber}</th>
                <th className="p-3 text-start">{t.itemName}</th>
                <th className="p-3 text-center">{t.status}</th>
                <th className="p-3 text-center">المستودع الحالي</th>
                <th className="p-3 text-center">العميل المرتبط</th>
                <th className="p-3 text-center">الفاتورة</th>
                <th className="p-3 text-center">تاريخ انتهاء الضمان</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((sn) => {
                const item = items.find((i) => i.id === sn.itemId);
                return (
                  <tr key={sn.id} className="hover:bg-purple-50/20 transition">
                    <td className="p-3 font-mono font-bold text-purple-700 text-sm">
                      {sn.serialNumber}
                    </td>
                    <td className="p-3 font-medium text-gray-900">
                      {item?.nameAr || sn.itemId}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          sn.status === 'in_stock'
                            ? 'bg-emerald-100 text-emerald-800'
                            : sn.status === 'sold'
                            ? 'bg-blue-100 text-blue-800'
                            : sn.status === 'trial'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {sn.status === 'in_stock'
                          ? t.serialAvailable
                          : sn.status === 'sold'
                          ? t.serialSold
                          : sn.status === 'trial'
                          ? t.serialTrial
                          : t.serialInRepair}
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono text-gray-600">
                      {sn.warehouseId}
                    </td>
                    <td className="p-3 text-center font-mono">
                      {sn.clientId ? (
                        <Link href={`/clients/${sn.clientId}`} className="text-blue-600 hover:underline">
                          {sn.clientId}
                        </Link>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="p-3 text-center font-mono">
                      {sn.invoiceId ? (
                        <Link href={`/invoices/${sn.invoiceId}`} className="text-blue-600 hover:underline">
                          {sn.invoiceId}
                        </Link>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-gray-800">
                      {sn.warrantyEndDate || (sn.status === 'in_stock' ? '24 شهر من البيع' : '-')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
