'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Banknote, Download, Printer, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/components/common/LanguageContext';
import { formatCurrency } from '@/lib/utils';

interface FinanceReport {
  range: { from: string; to: string };
  totals: {
    invoiceCount: number;
    grossSales: number;
    discounts: number;
    netSales: number;
    vat: number;
    totalWithVat: number;
    collected: number;
    receivables: number;
    insuranceBilled: number;
    costOfGoods: number;
    grossProfit: number;
    unknownCostLines: number;
  };
  payments: Record<'cash' | 'mada' | 'visa' | 'bank_transfer' | 'insurance' | 'deposit' | 'other', number>;
  excluded: { count: number; total: number };
  repairs: { count: number; charge: number; cost: number; profit: number };
  daily: { date: string; count: number; netSales: number; vat: number; total: number; collected: number; cost: number }[];
  byBranch: { branchId: string; count: number; netSales: number; total: number; collected: number; receivables: number; name: { ar: string; en: string } }[];
  byCategory: { category: string; net: number; cost: number }[];
  branches: { id: string; nameAr: string; nameEn: string }[];
  generatedAt: string;
}

const CATEGORY_LABELS: Record<string, { ar: string; en: string }> = {
  hearing_aids: { ar: 'سماعات طبية', en: 'Hearing aids' },
  earmolds: { ar: 'قوالب وهياكل', en: 'Earmolds' },
  batteries: { ar: 'بطاريات', en: 'Batteries' },
  spare_parts: { ar: 'قطع وفلاتر', en: 'Spare parts' },
  accessories: { ar: 'ملحقات وأجهزة', en: 'Accessories' },
  other: { ar: 'أخرى', en: 'Other' },
};

const PAYMENT_LABELS: Record<string, { ar: string; en: string }> = {
  cash: { ar: 'نقداً', en: 'Cash' },
  mada: { ar: 'مدى', en: 'Mada' },
  visa: { ar: 'فيزا', en: 'Visa' },
  bank_transfer: { ar: 'تحويل بنكي', en: 'Bank transfer' },
  insurance: { ar: 'تأمين', en: 'Insurance' },
  deposit: { ar: 'دفعات مقدمة', en: 'Deposits' },
  other: { ar: 'أخرى', en: 'Other' },
};

// Local calendar date as YYYY-MM-DD (not UTC, so "today" is right late in the evening)
const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function presetRange(id: string): { from: string; to: string } {
  const now = new Date();
  const today = ymd(now);
  switch (id) {
    case 'today':
      return { from: today, to: today };
    case 'week': {
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      return { from: ymd(start), to: today };
    }
    case 'lastMonth': {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: ymd(first), to: ymd(last) };
    }
    case 'year':
      return { from: `${now.getFullYear()}-01-01`, to: today };
    default:
      return { from: ymd(new Date(now.getFullYear(), now.getMonth(), 1)), to: today };
  }
}

export default function FinancePage() {
  const { lang } = useLanguage();
  const ar = lang === 'ar';

  const initial = presetRange('month');
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [branchId, setBranchId] = useState('all');
  const [report, setReport] = useState<FinanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(
    async (range?: { from: string; to: string }) => {
      const f = range?.from ?? from;
      const t = range?.to ?? to;
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/finance?from=${f}&to=${t}&branchId=${branchId}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(
            data.error === 'invalid_range'
              ? ar ? 'الفترة غير صحيحة: تاريخ البداية يجب ألا يتجاوز تاريخ النهاية.' : 'Invalid period: the start date must not be after the end date.'
              : data.error === 'range_too_long'
              ? ar ? 'الفترة طويلة جداً (الحد الأقصى سنتان).' : 'The period is too long (maximum two years).'
              : ar ? 'تعذر تحميل التقرير.' : 'Could not load the report.'
          );
          return;
        }
        setReport(data);
      } catch {
        setError(ar ? 'حدث خطأ في الاتصال.' : 'Connection error.');
      } finally {
        setLoading(false);
      }
    },
    [from, to, branchId, ar]
  );

  useEffect(() => {
    load();
    // Load once on open and whenever the branch changes; dates are applied with the button or a preset
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  const applyPreset = (id: string) => {
    const r = presetRange(id);
    setFrom(r.from);
    setTo(r.to);
    load(r);
  };

  const money = (n: number) => `${formatCurrency(n)} ${ar ? 'ر.س' : 'SAR'}`;
  const margin = report && report.totals.netSales > 0 ? (report.totals.grossProfit / report.totals.netSales) * 100 : 0;

  const exportCsv = () => {
    if (!report) return;
    const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const rows = [
      ['Date', 'Invoices', 'Net sales', 'VAT', 'Total', 'Collected', 'Est. cost'],
      ...report.daily.map((d) => [d.date, d.count, d.netSales, d.vat, d.total, d.collected, d.cost]),
      ['TOTAL', report.totals.invoiceCount, report.totals.netSales, report.totals.vat, report.totals.totalWithVat, report.totals.collected, report.totals.costOfGoods],
    ];
    const csv = '﻿' + rows.map((r) => r.map(q).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-${report.range.from}_${report.range.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const card = 'bg-white rounded-2xl border border-gray-200 shadow-xs p-4';
  const th = 'p-3 text-start';
  const field = 'border border-gray-300 rounded-lg p-2 text-xs';

  const stat = (title: string, value: string, tone = 'text-gray-900', hint?: string) => (
    <div className={card}>
      <div className="text-[11px] font-semibold text-gray-500">{title}</div>
      <div className={`mt-1 text-lg font-black font-mono ${tone}`}>{value}</div>
      {hint && <div className="mt-0.5 text-[10px] text-gray-400">{hint}</div>}
    </div>
  );

  const paymentTotal = report ? Object.values(report.payments).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Banknote className="w-6 h-6 text-emerald-600" />
            <span>{ar ? 'التقرير المالي' : 'Finance Report'}</span>
          </h2>
          <p className="text-xs text-gray-500">
            {ar ? 'المبيعات والضريبة والتحصيل والذمم والأرباح خلال فترة محددة' : 'Sales, VAT, collections, receivables and profit for a chosen period'}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button onClick={exportCsv} disabled={!report} className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl transition disabled:opacity-50">
            <Download className="w-4 h-4 text-emerald-600" />
            <span>{ar ? 'تصدير Excel' : 'Export CSV'}</span>
          </button>
          <button onClick={() => window.print()} disabled={!report} className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl transition disabled:opacity-50">
            <Printer className="w-4 h-4 text-blue-600" />
            <span>{ar ? 'طباعة' : 'Print'}</span>
          </button>
        </div>
      </div>

      {/* Period */}
      <div className={`${card} space-y-3 print:hidden`}>
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            ['today', ar ? 'اليوم' : 'Today'],
            ['week', ar ? 'آخر 7 أيام' : 'Last 7 days'],
            ['month', ar ? 'هذا الشهر' : 'This month'],
            ['lastMonth', ar ? 'الشهر الماضي' : 'Last month'],
            ['year', ar ? 'هذه السنة' : 'This year'],
          ].map(([id, text]) => (
            <button key={id} onClick={() => applyPreset(id)} className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition">
              {text}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">{ar ? 'من تاريخ' : 'From'}</label>
            <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className={field} />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-1">{ar ? 'إلى تاريخ' : 'To'}</label>
            <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className={field} />
          </div>
          {report && report.branches.length > 1 && (
            <div>
              <label className="block font-semibold text-gray-700 mb-1">{ar ? 'الفرع' : 'Branch'}</label>
              <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={`${field} bg-white`}>
                <option value="all">{ar ? 'كل الفروع' : 'All branches'}</option>
                {report.branches.map((b) => (
                  <option key={b.id} value={b.id}>{ar ? b.nameAr : b.nameEn}</option>
                ))}
              </select>
            </div>
          )}
          <button onClick={() => load()} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{ar ? 'عرض التقرير' : 'Show report'}</span>
          </button>
        </div>
        {error && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5">{error}</p>}
      </div>

      {report && (
        <div className="space-y-6">
          <div className="text-xs text-gray-500 font-mono">
            {ar ? 'الفترة' : 'Period'}: <span dir="ltr" className="inline-block">{report.range.from} → {report.range.to}</span> · {report.totals.invoiceCount} {ar ? 'فاتورة' : 'invoices'}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stat(ar ? 'صافي المبيعات (قبل الضريبة)' : 'Net sales (before VAT)', money(report.totals.netSales), 'text-blue-900', ar ? `الإجمالي قبل الخصم ${money(report.totals.grossSales)}` : `Before discounts ${money(report.totals.grossSales)}`)}
            {stat(ar ? 'ضريبة القيمة المضافة' : 'VAT', money(report.totals.vat), 'text-gray-900')}
            {stat(ar ? 'الإجمالي شامل الضريبة' : 'Total incl. VAT', money(report.totals.totalWithVat), 'text-gray-900')}
            {stat(ar ? 'إجمالي الخصومات' : 'Discounts given', money(report.totals.discounts), 'text-amber-700')}
            {stat(ar ? 'المحصّل فعلياً' : 'Collected', money(report.totals.collected), 'text-emerald-700')}
            {stat(ar ? 'المتبقي على العملاء (ذمم)' : 'Outstanding receivables', money(report.totals.receivables), report.totals.receivables > 0 ? 'text-red-700' : 'text-gray-900')}
            {stat(ar ? 'تكلفة البضاعة (تقديرية)' : 'Cost of goods (estimate)', money(report.totals.costOfGoods), 'text-gray-700', ar ? 'حسب سعر التكلفة الحالي للأصناف' : 'Based on current item cost prices')}
            {stat(ar ? 'مجمل الربح' : 'Gross profit', money(report.totals.grossProfit), report.totals.grossProfit >= 0 ? 'text-emerald-700' : 'text-red-700', `${margin.toFixed(1)}% ${ar ? 'هامش' : 'margin'}`)}
          </div>

          {(report.excluded.count > 0 || report.totals.unknownCostLines > 0 || report.totals.insuranceBilled > 0) && (
            <div className="text-[11px] text-gray-600 bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-1">
              {report.excluded.count > 0 && (
                <div>
                  {ar
                    ? `استُبعدت ${report.excluded.count} فاتورة ملغاة/مرتجعة بقيمة ${money(report.excluded.total)} من الأرقام أعلاه.`
                    : `${report.excluded.count} voided/returned invoice(s) worth ${money(report.excluded.total)} are excluded from the figures above.`}
                </div>
              )}
              {report.totals.insuranceBilled > 0 && (
                <div>{ar ? `مطالبات التأمين في الفترة: ${money(report.totals.insuranceBilled)}` : `Insurance claims in the period: ${money(report.totals.insuranceBilled)}`}</div>
              )}
              {report.totals.unknownCostLines > 0 && (
                <div>
                  {ar
                    ? `${report.totals.unknownCostLines} بند بلا تكلفة معروفة، لذا قد يكون الربح أعلى من الواقع.`
                    : `${report.totals.unknownCostLines} line(s) have no known cost, so profit may be overstated.`}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payments */}
            <div className={card}>
              <h3 className="font-bold text-sm text-gray-900 mb-3">{ar ? 'التحصيل حسب طريقة الدفع' : 'Collections by payment method'}</h3>
              <div className="space-y-2 text-xs">
                {Object.entries(report.payments)
                  .filter(([, v]) => v > 0)
                  .map(([k, v]) => (
                    <div key={k}>
                      <div className="flex justify-between mb-0.5">
                        <span className="font-semibold text-gray-700">{PAYMENT_LABELS[k] ? (ar ? PAYMENT_LABELS[k].ar : PAYMENT_LABELS[k].en) : k}</span>
                        <span className="font-mono font-bold">{money(v)}</span>
                      </div>
                      <div className="h-1.5 rounded bg-gray-100 overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${paymentTotal > 0 ? (v / paymentTotal) * 100 : 0}%` }} />
                      </div>
                    </div>
                  ))}
                {paymentTotal === 0 && <p className="text-gray-400">{ar ? 'لا توجد مدفوعات' : 'No payments'}</p>}
              </div>
            </div>

            {/* Repairs */}
            <div className={card}>
              <h3 className="font-bold text-sm text-gray-900 mb-1">{ar ? 'صيانة الأجهزة (تذاكر سُلّمت في الفترة)' : 'Device repairs (tickets delivered in the period)'}</h3>
              <p className="text-[10px] text-gray-400 mb-3">{ar ? 'تُعرض منفصلة ولا تدخل في أرقام الفواتير أعلاه.' : 'Shown separately; not included in the invoice figures above.'}</p>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div><div className="text-gray-500">{ar ? 'الإيراد' : 'Charged'}</div><div className="font-mono font-bold">{money(report.repairs.charge)}</div></div>
                <div><div className="text-gray-500">{ar ? 'التكلفة' : 'Cost'}</div><div className="font-mono font-bold">{money(report.repairs.cost)}</div></div>
                <div><div className="text-gray-500">{ar ? 'الربح' : 'Profit'}</div><div className={`font-mono font-bold ${report.repairs.profit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{money(report.repairs.profit)}</div></div>
              </div>
              <div className="mt-2 text-[11px] text-gray-500">{report.repairs.count} {ar ? 'تذكرة' : 'tickets'}</div>
            </div>
          </div>

          {/* By category & branch */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="p-3 font-bold text-sm text-gray-900 border-b">{ar ? 'حسب فئة الصنف' : 'By item category'}</div>
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-900 text-white font-semibold">
                  <tr>
                    <th className={th}>{ar ? 'الفئة' : 'Category'}</th>
                    <th className={`${th} text-end`}>{ar ? 'صافي المبيعات' : 'Net sales'}</th>
                    <th className={`${th} text-end`}>{ar ? 'التكلفة' : 'Cost'}</th>
                    <th className={`${th} text-end`}>{ar ? 'الربح' : 'Profit'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {report.byCategory.map((c) => (
                    <tr key={c.category}>
                      <td className="p-3 font-semibold text-gray-800">{CATEGORY_LABELS[c.category] ? (ar ? CATEGORY_LABELS[c.category].ar : CATEGORY_LABELS[c.category].en) : c.category}</td>
                      <td className="p-3 text-end font-mono">{formatCurrency(c.net)}</td>
                      <td className="p-3 text-end font-mono text-gray-500">{formatCurrency(c.cost)}</td>
                      <td className="p-3 text-end font-mono font-bold">{formatCurrency(c.net - c.cost)}</td>
                    </tr>
                  ))}
                  {report.byCategory.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-gray-400">—</td></tr>}
                </tbody>
              </table>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="p-3 font-bold text-sm text-gray-900 border-b">{ar ? 'حسب الفرع' : 'By branch'}</div>
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-900 text-white font-semibold">
                  <tr>
                    <th className={th}>{ar ? 'الفرع' : 'Branch'}</th>
                    <th className={`${th} text-center`}>{ar ? 'فواتير' : 'Invoices'}</th>
                    <th className={`${th} text-end`}>{ar ? 'الإجمالي' : 'Total'}</th>
                    <th className={`${th} text-end`}>{ar ? 'المحصّل' : 'Collected'}</th>
                    <th className={`${th} text-end`}>{ar ? 'ذمم' : 'Due'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {report.byBranch.map((b) => (
                    <tr key={b.branchId}>
                      <td className="p-3 font-semibold text-gray-800">{ar ? b.name.ar : b.name.en}</td>
                      <td className="p-3 text-center font-mono">{b.count}</td>
                      <td className="p-3 text-end font-mono">{formatCurrency(b.total)}</td>
                      <td className="p-3 text-end font-mono text-emerald-700">{formatCurrency(b.collected)}</td>
                      <td className="p-3 text-end font-mono text-red-700">{formatCurrency(b.receivables)}</td>
                    </tr>
                  ))}
                  {report.byBranch.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-gray-400">—</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Daily */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="p-3 font-bold text-sm text-gray-900 border-b">{ar ? 'التفصيل اليومي' : 'Daily breakdown'}</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-900 text-white font-semibold">
                  <tr>
                    <th className={th}>{ar ? 'التاريخ' : 'Date'}</th>
                    <th className={`${th} text-center`}>{ar ? 'فواتير' : 'Invoices'}</th>
                    <th className={`${th} text-end`}>{ar ? 'صافي المبيعات' : 'Net sales'}</th>
                    <th className={`${th} text-end`}>{ar ? 'الضريبة' : 'VAT'}</th>
                    <th className={`${th} text-end`}>{ar ? 'الإجمالي' : 'Total'}</th>
                    <th className={`${th} text-end`}>{ar ? 'المحصّل' : 'Collected'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {report.daily.map((d) => (
                    <tr key={d.date} className="hover:bg-slate-50">
                      <td className="p-3 font-mono text-gray-700">{d.date}</td>
                      <td className="p-3 text-center font-mono">{d.count}</td>
                      <td className="p-3 text-end font-mono">{formatCurrency(d.netSales)}</td>
                      <td className="p-3 text-end font-mono text-gray-500">{formatCurrency(d.vat)}</td>
                      <td className="p-3 text-end font-mono">{formatCurrency(d.total)}</td>
                      <td className="p-3 text-end font-mono text-emerald-700">{formatCurrency(d.collected)}</td>
                    </tr>
                  ))}
                  {report.daily.length === 0 && (
                    <tr><td colSpan={6} className="py-8 text-center text-gray-400">{ar ? 'لا توجد فواتير في هذه الفترة' : 'No invoices in this period'}</td></tr>
                  )}
                </tbody>
                {report.daily.length > 0 && (
                  <tfoot className="bg-slate-100 font-black">
                    <tr>
                      <td className="p-3">{ar ? 'الإجمالي' : 'Total'}</td>
                      <td className="p-3 text-center font-mono">{report.totals.invoiceCount}</td>
                      <td className="p-3 text-end font-mono">{formatCurrency(report.totals.netSales)}</td>
                      <td className="p-3 text-end font-mono">{formatCurrency(report.totals.vat)}</td>
                      <td className="p-3 text-end font-mono">{formatCurrency(report.totals.totalWithVat)}</td>
                      <td className="p-3 text-end font-mono">{formatCurrency(report.totals.collected)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          <p className="text-[10px] text-gray-400">
            {ar ? 'أُنشئ' : 'Generated'}: {new Date(report.generatedAt).toLocaleString(ar ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB', { timeZone: 'Asia/Riyadh' })}
          </p>
        </div>
      )}
    </div>
  );
}
