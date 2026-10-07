'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/components/common/LanguageContext';
import { Barcode, Search } from 'lucide-react';

interface SerialResult {
  id: string;
  serialNumber: string;
  status: string;
  warrantyEndDate: string | null;
  inMyWarehouses: boolean;
  branchNameAr: string;
  branchNameEn: string;
  warehouseNameAr: string;
  warehouseNameEn: string;
  item: {
    id: string; sku: string; barcode: string; nameAr: string; nameEn: string;
    category: string; brand: string; model: string; salePrice: number; warrantyMonths: number;
  };
  client: { id: string; nameAr: string; nameEn: string; fileNo: string } | null;
  invoice: { id: string; invoiceNo: string; date: string } | null;
}

/** Serial number lookup popup: shows the product and where the unit is, even when it sits in another warehouse. */
export default function SerialsDialog({ onClose }: { onClose: () => void }) {
  const { lang, t } = useLanguage();
  const ar = lang === 'ar';
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SerialResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  // Look up as the user types (and when a scanner sends Enter)
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults(null);
      return;
    }
    let stale = false;
    setLoading(true);
    const timer = setTimeout(() => {
      fetch(`/api/serials?q=${encodeURIComponent(term)}`)
        .then((r) => r.json())
        .then((d) => { if (!stale) setResults(d.results ?? []); })
        .catch(() => { if (!stale) setResults([]); })
        .finally(() => { if (!stale) setLoading(false); });
    }, 250);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [q]);

  const statusLabel = (s: string) =>
    s === 'in_stock' ? t.serialAvailable : s === 'sold' ? t.serialSold : s === 'trial' ? t.serialTrial : t.serialInRepair;
  const statusCls = (s: string) =>
    s === 'in_stock' ? 'bg-emerald-100 text-emerald-800'
    : s === 'sold' ? 'bg-blue-100 text-blue-800'
    : s === 'trial' ? 'bg-purple-100 text-purple-800'
    : 'bg-amber-100 text-amber-800';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" data-testid="serials-dialog">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b">
          <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
            <Barcode className="w-5 h-5 text-purple-600" />
            {ar ? 'البحث بالرقم التسلسلي' : 'Serial number lookup'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold" aria-label="close">✕</button>
        </div>

        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={ar ? 'اكتب أو امسح الرقم التسلسلي (حرفان على الأقل)...' : 'Type or scan a serial number (2+ characters)...'}
            className="w-full ps-10 pe-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 font-mono"
          />
          <Search className="w-4 h-4 text-gray-400 absolute start-3 top-3.5" />
        </div>

        {loading && <p className="text-xs text-gray-400 text-center">{t.loading}</p>}
        {!loading && results && results.length === 0 && (
          <p className="text-xs text-gray-500 text-center border border-dashed border-gray-300 rounded-xl p-4">
            {ar ? 'لا يوجد رقم تسلسلي مطابق.' : 'No matching serial number.'}
          </p>
        )}
        {!results && !loading && (
          <p className="text-xs text-gray-400 text-center">
            {ar ? 'يظهر المنتج وموقعه حتى لو كانت الوحدة في مستودع آخر.' : 'The product and its location are shown even when the unit is in another warehouse.'}
          </p>
        )}

        <div className="space-y-3">
          {results?.map((r) => (
            <div key={r.id} className="border border-gray-200 rounded-xl p-4 space-y-3 text-xs" data-testid="serial-result">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-mono font-black text-purple-700 text-sm">{r.serialNumber}</span>
                <span className="flex items-center gap-2">
                  {!r.inMyWarehouses && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                      {ar ? 'في مستودع آخر' : 'In another warehouse'}
                    </span>
                  )}
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${statusCls(r.status)}`}>{statusLabel(r.status)}</span>
                </span>
              </div>

              <div>
                <div className="font-bold text-gray-900 text-sm">{ar ? r.item.nameAr : r.item.nameEn}</div>
                <div className="text-[11px] text-gray-500 font-mono">{r.item.sku} · {r.item.barcode}</div>
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-gray-700">
                <div><dt className="inline text-gray-500">{ar ? 'الماركة: ' : 'Brand: '}</dt><dd className="inline font-semibold">{r.item.brand || '-'}</dd></div>
                <div><dt className="inline text-gray-500">{ar ? 'الموديل: ' : 'Model: '}</dt><dd className="inline font-semibold">{r.item.model || '-'}</dd></div>
                <div><dt className="inline text-gray-500">{ar ? 'سعر البيع: ' : 'Price: '}</dt><dd className="inline font-mono font-semibold">{r.item.salePrice}</dd></div>
                <div><dt className="inline text-gray-500">{ar ? 'الضمان (شهر): ' : 'Warranty (months): '}</dt><dd className="inline font-mono font-semibold">{r.item.warrantyMonths}</dd></div>
                <div className="col-span-2">
                  <dt className="inline text-gray-500">{ar ? 'الموقع الحالي: ' : 'Current location: '}</dt>
                  <dd className="inline font-bold text-gray-900">
                    {ar ? r.warehouseNameAr : r.warehouseNameEn} — {ar ? r.branchNameAr : r.branchNameEn}
                  </dd>
                </div>
                {r.warrantyEndDate && (
                  <div className="col-span-2"><dt className="inline text-gray-500">{ar ? 'انتهاء الضمان: ' : 'Warranty ends: '}</dt><dd className="inline font-mono font-semibold">{r.warrantyEndDate}</dd></div>
                )}
                {r.client && (
                  <div>
                    <dt className="inline text-gray-500">{ar ? 'العميل: ' : 'Patient: '}</dt>
                    <dd className="inline"><Link href={`/clients/${r.client.id}`} className="text-blue-600 hover:underline font-semibold">{ar ? r.client.nameAr : r.client.nameEn} ({r.client.fileNo})</Link></dd>
                  </div>
                )}
                {r.invoice && (
                  <div>
                    <dt className="inline text-gray-500">{ar ? 'الفاتورة: ' : 'Invoice: '}</dt>
                    <dd className="inline"><Link href={`/invoices/${r.invoice.id}`} className="text-blue-600 hover:underline font-mono font-semibold">{r.invoice.invoiceNo}</Link></dd>
                  </div>
                )}
              </dl>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
