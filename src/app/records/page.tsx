'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/components/common/LanguageContext';
import { formatCurrency } from '@/lib/utils';
import { Database, Search, Clock } from 'lucide-react';

type Row = Record<string, any>;

interface Column {
  ar: string;
  en: string;
  value: (r: Row, lang: string) => React.ReactNode;
  mono?: boolean;
}

const clientName = (r: Row, lang: string) =>
  r.client ? (lang === 'ar' ? r.client.nameAr : r.client.nameEn) : r.clientName || r.clientId;

// What each table shows: label, link to the record's own screen, and columns
const TABLES: Record<
  string,
  { ar: string; en: string; link?: (r: Row) => string; columns: Column[] }
> = {
  clients: {
    ar: 'المرضى والعملاء',
    en: 'Clients / Patients',
    link: (r) => `/clients/${r.id}`,
    columns: [
      { ar: 'رقم الملف', en: 'File #', value: (r) => r.fileNo, mono: true },
      { ar: 'الاسم', en: 'Name', value: (r, l) => (l === 'ar' ? r.nameAr : r.nameEn) },
      { ar: 'الهوية', en: 'National ID', value: (r) => r.nationalId, mono: true },
      { ar: 'الجوال', en: 'Phone', value: (r) => r.phone, mono: true },
      { ar: 'المدينة', en: 'City', value: (r, l) => (l === 'ar' ? r.cityAr : r.cityEn) },
      { ar: 'تاريخ الإضافة', en: 'Added', value: (r) => r.createdAt?.slice(0, 10), mono: true },
    ],
  },
  items: {
    ar: 'الأصناف',
    en: 'Items',
    columns: [
      { ar: 'الرمز', en: 'SKU', value: (r) => r.sku, mono: true },
      { ar: 'الاسم', en: 'Name', value: (r, l) => (l === 'ar' ? r.nameAr : r.nameEn) },
      { ar: 'الفئة', en: 'Category', value: (r) => r.category },
      { ar: 'الماركة', en: 'Brand', value: (r) => `${r.brand} ${r.model}` },
      { ar: 'سعر البيع', en: 'Sale price', value: (r) => formatCurrency(r.salePrice), mono: true },
      {
        ar: 'المخزون',
        en: 'Stock',
        value: (r) => {
          try {
            const s = JSON.parse(r.stockByWarehouse || '{}');
            return Object.values(s).reduce((a: number, b) => a + Number(b), 0);
          } catch {
            return '—';
          }
        },
        mono: true,
      },
    ],
  },
  serialUnits: {
    ar: 'الأرقام التسلسلية',
    en: 'Serial Numbers',
    columns: [
      { ar: 'الرقم التسلسلي', en: 'Serial #', value: (r) => r.serialNumber, mono: true },
      { ar: 'الصنف', en: 'Item', value: (r, l) => (l === 'ar' ? r.item?.nameAr : r.item?.nameEn) },
      { ar: 'الحالة', en: 'Status', value: (r) => r.status },
      { ar: 'المريض', en: 'Client', value: (r) => r.clientId || '—', mono: true },
      { ar: 'نهاية الضمان', en: 'Warranty end', value: (r) => r.warrantyEndDate || '—', mono: true },
    ],
  },
  invoices: {
    ar: 'الفواتير',
    en: 'Invoices',
    link: (r) => `/invoices/${r.id}`,
    columns: [
      { ar: 'رقم الفاتورة', en: 'Invoice #', value: (r) => r.invoiceNo, mono: true },
      { ar: 'التاريخ', en: 'Date', value: (r) => r.date, mono: true },
      { ar: 'المريض', en: 'Client', value: clientName },
      { ar: 'الإجمالي', en: 'Total', value: (r) => formatCurrency(r.grandTotal), mono: true },
      { ar: 'المتبقي', en: 'Due', value: (r) => formatCurrency(r.remainingDue), mono: true },
      { ar: 'الحالة', en: 'Status', value: (r) => r.status },
    ],
  },
  earmoldOrders: {
    ar: 'طلبات القوالب',
    en: 'Earmold Orders',
    link: (r) => `/earmolds/${r.id}`,
    columns: [
      { ar: 'رقم الطلب', en: 'Order #', value: (r) => r.orderNo, mono: true },
      { ar: 'المريض', en: 'Client', value: clientName },
      { ar: 'النوع', en: 'Shell', value: (r) => r.shellType },
      { ar: 'المتوقع', en: 'Expected', value: (r) => r.expectedDate, mono: true },
      { ar: 'الحالة', en: 'Status', value: (r) => r.status },
    ],
  },
  repairTickets: {
    ar: 'تذاكر الصيانة',
    en: 'Repair Tickets',
    link: (r) => `/repairs/${r.id}`,
    columns: [
      { ar: 'رقم التذكرة', en: 'Ticket #', value: (r) => r.ticketNo, mono: true },
      { ar: 'المريض', en: 'Client', value: clientName },
      { ar: 'الجهاز', en: 'Device', value: (r) => `${r.deviceBrand} ${r.deviceModel}` },
      { ar: 'الرقم التسلسلي', en: 'Serial #', value: (r) => r.serialNumber || '—', mono: true },
      { ar: 'الاستلام', en: 'Received', value: (r) => r.receivedAt, mono: true },
      { ar: 'الحالة', en: 'Status', value: (r) => r.status },
    ],
  },
  audiograms: {
    ar: 'تخطيط السمع',
    en: 'Audiograms',
    link: (r) => `/clients/${r.clientId}`,
    columns: [
      { ar: 'التاريخ', en: 'Date', value: (r) => r.date, mono: true },
      { ar: 'المريض', en: 'Client', value: clientName },
      { ar: 'الأخصائي', en: 'Audiologist', value: (r) => r.audiologistName },
      { ar: 'PTA يمين', en: 'PTA right', value: (r) => r.ptaRight, mono: true },
      { ar: 'PTA يسار', en: 'PTA left', value: (r) => r.ptaLeft, mono: true },
    ],
  },
  stockTransfers: {
    ar: 'التحويلات بين الفروع',
    en: 'Stock Transfers',
    columns: [
      { ar: 'رقم التحويل', en: 'Transfer #', value: (r) => r.transferNo, mono: true },
      { ar: 'من', en: 'From', value: (r) => r.fromBranchId, mono: true },
      { ar: 'إلى', en: 'To', value: (r) => r.toBranchId, mono: true },
      { ar: 'الحالة', en: 'Status', value: (r) => r.status },
      { ar: 'التاريخ', en: 'Created', value: (r) => r.createdAt?.slice(0, 10), mono: true },
    ],
  },
  messageLogs: {
    ar: 'الرسائل المرسلة',
    en: 'Messages Sent',
    columns: [
      { ar: 'الوقت', en: 'Sent', value: (r) => r.sentAt, mono: true },
      { ar: 'المريض', en: 'Client', value: (r) => r.clientName },
      { ar: 'القناة', en: 'Channel', value: (r) => r.channel },
      { ar: 'السبب', en: 'Trigger', value: (r) => r.trigger },
      { ar: 'النص', en: 'Content', value: (r) => <span className="line-clamp-1 max-w-[320px] inline-block">{r.content}</span> },
    ],
  },
};

export default function RecordsPage() {
  const { lang, t } = useLanguage();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [recent, setRecent] = useState<Row[]>([]);
  const [table, setTable] = useState('clients');
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/records')
      .then((res) => res.json())
      .then((data) => {
        if (data.counts) setCounts(data.counts);
        if (data.recentAdditions) setRecent(data.recentAdditions);
      });
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/records?table=${table}`)
      .then((res) => res.json())
      .then((data) => setRows(data.rows || []))
      .finally(() => setLoading(false));
  }, [table]);

  const config = TABLES[table];
  const q = search.trim().toLowerCase();
  const filtered = q
    ? rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q))
    : rows;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-gray-200">
        <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
          <Database className="w-6 h-6 text-teal-600" />
          <span>{t.records}</span>
        </h2>
        <p className="text-xs text-gray-500">
          {lang === 'ar'
            ? 'كل ما تم حفظه في قاعدة البيانات: عدد السجلات في كل جدول، آخر الإضافات، وعرض محتوى أي جدول (للقراءة فقط)'
            : 'Everything saved in the database: record count per table, latest additions, and the contents of each table (read-only)'}
        </p>
      </div>

      {/* Table cards with counts */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Object.entries(TABLES).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => {
              setTable(key);
              setSearch('');
            }}
            className={`p-3 rounded-2xl border text-start transition ${
              table === key
                ? 'bg-teal-600 border-teal-600 text-white shadow-md'
                : 'bg-white border-gray-200 hover:border-teal-400'
            }`}
          >
            <div className={`text-[11px] font-bold ${table === key ? 'text-teal-50' : 'text-gray-500'}`}>
              {lang === 'ar' ? cfg.ar : cfg.en}
            </div>
            <div className="text-2xl font-black font-mono">{counts[key] ?? '…'}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Selected table contents */}
        <div className="xl:col-span-3 bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-4 flex flex-col sm:flex-row gap-3 items-center justify-between border-b border-gray-100">
            <div className="font-bold text-sm text-gray-900">
              {lang === 'ar' ? config.ar : config.en}{' '}
              <span className="text-xs text-gray-500 font-normal">
                ({filtered.length}
                {rows.length >= 200 ? (lang === 'ar' ? ' من أحدث 200' : ' of newest 200') : ''})
              </span>
            </div>
            <div className="relative w-full sm:w-72">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.search}
                className="w-full ps-9 pe-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500"
              />
              <Search className="w-4 h-4 text-gray-400 absolute start-3 top-2.5" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-900 text-white font-semibold">
                <tr>
                  {config.columns.map((c) => (
                    <th key={c.en} className="p-3 text-start whitespace-nowrap">
                      {lang === 'ar' ? c.ar : c.en}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={config.columns.length} className="py-12 text-center text-gray-400">
                      {loading ? t.loading : t.noData}
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-teal-50/30">
                      {config.columns.map((c, i) => (
                        <td key={c.en} className={`p-3 ${c.mono ? 'font-mono' : ''}`}>
                          {i === 0 && config.link ? (
                            <Link href={config.link(r)} className="font-bold text-teal-700 hover:underline">
                              {c.value(r, lang)}
                            </Link>
                          ) : (
                            c.value(r, lang) ?? '—'
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Latest additions feed */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs text-xs">
          <div className="font-bold text-gray-900 flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-teal-600" />
            {lang === 'ar' ? 'آخر الإضافات' : 'Latest additions'}
          </div>
          {recent.length === 0 ? (
            <div className="text-gray-400">{t.noData}</div>
          ) : (
            <ul className="space-y-3">
              {recent.map((log) => (
                <li key={log.id} className="border-b border-gray-100 pb-2 last:border-0">
                  <div className="font-mono text-[10px] text-gray-500">
                    {log.timestamp} · {log.userName}
                  </div>
                  <div className="text-gray-800">{log.details}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
