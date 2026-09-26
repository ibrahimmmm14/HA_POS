'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/components/common/LanguageContext';
import { useBranch } from '@/components/common/BranchContext';
import { formatCurrency } from '@/lib/utils';
import {
  Receipt,
  PlusCircle,
  Search,
  Printer,
  Eye,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export default function InvoicesListPage() {
  const { lang, t } = useLanguage();
  const { currentBranch } = useBranch();

  const [invoices, setInvoices] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/invoices')
      .then((res) => res.json())
      .then((data) => {
        if (data.invoices) setInvoices(data.invoices);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = invoices.filter((inv) => {
    const matchStatus =
      filterStatus === 'all' || inv.deliveryStatus === filterStatus;
    const matchSearch =
      !search ||
      inv.invoiceNo.toLowerCase().includes(search.toLowerCase()) ||
      inv.clientNameAr.toLowerCase().includes(search.toLowerCase()) ||
      inv.clientPhone.includes(search);
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-blue-600" />
            <span>{t.invoices}</span>
          </h2>
          <p className="text-xs text-gray-500">
            {lang === 'ar'
              ? 'سجل المبيعات، الفواتير الضريبية، الدفعات النقدية والمجزأة وعمليات التأمين'
              : 'Sales registry, official tax invoices, split payments, and insurance claims'}
          </p>
        </div>

        <Link
          href="/invoices/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t.newInvoice}</span>
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              lang === 'ar'
                ? 'بحث برقم الفاتورة، اسم المريض، أو الجوال...'
                : 'Search by invoice #, client name, or phone...'
            }
            className="w-full pl-10 pr-4 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
          />
          <Search className="w-4 h-4 text-gray-400 absolute start-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto text-xs">
          <span className="text-gray-500 font-medium">{t.status}:</span>
          {[
            { id: 'all', label: lang === 'ar' ? 'الكل' : 'All' },
            { id: 'delivered', label: t.flagDelivered },
            { id: 'ready', label: t.flagReadyForDelivery },
            { id: 'trial', label: t.flagTrialLetter },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setFilterStatus(s.id)}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                filterStatus === s.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-slate-900 text-white font-semibold">
              <tr>
                <th className="p-3 text-start">{t.invoiceNo}</th>
                <th className="p-3 text-start">{t.clientInfo}</th>
                <th className="p-3 text-start">{t.branch}</th>
                <th className="p-3 text-center">{t.date}</th>
                <th className="p-3 text-center">{t.paymentMethod}</th>
                <th className="p-3 text-end">{t.grandTotal}</th>
                <th className="p-3 text-end">{t.remainingDue}</th>
                <th className="p-3 text-center">{t.deliveryFlags}</th>
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
                filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-blue-50/20 transition">
                    <td className="p-3 font-mono font-bold text-blue-700">
                      <Link href={`/invoices/${inv.id}`} className="hover:underline">
                        {inv.invoiceNo}
                      </Link>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-gray-900">{inv.clientNameAr}</div>
                      <div className="text-[10px] text-gray-500 font-mono">
                        {inv.clientPhone}
                      </div>
                    </td>
                    <td className="p-3 text-gray-600">{inv.branchNameAr}</td>
                    <td className="p-3 text-center font-mono text-gray-500">{inv.date}</td>
                    <td className="p-3 text-center">
                      <span className="capitalize font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                        {inv.paymentMethod}
                      </span>
                    </td>
                    <td className="p-3 text-end font-mono font-bold text-gray-950">
                      {formatCurrency(inv.grandTotal)} ر.س
                    </td>
                    <td className="p-3 text-end font-mono font-bold">
                      {inv.remainingDue > 0 ? (
                        <span className="text-red-600">{formatCurrency(inv.remainingDue)} ر.س</span>
                      ) : (
                        <span className="text-emerald-600">0.00</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          inv.deliveryStatus === 'delivered'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inv.deliveryStatus === 'trial'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {inv.deliveryStatus === 'delivered'
                          ? t.flagDelivered
                          : inv.deliveryStatus === 'trial'
                          ? t.flagTrialLetter
                          : t.flagReadyForDelivery}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                          title="عرض وطباعة"
                        >
                          <Eye className="w-4 h-4" />
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
