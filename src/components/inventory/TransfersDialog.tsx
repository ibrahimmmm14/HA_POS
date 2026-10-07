'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/components/common/LanguageContext';
import { useBranch } from '@/components/common/BranchContext';
import { Item } from '@/types';
import { ArrowLeftRight, PlusCircle, ScanBarcode, Trash2 } from 'lucide-react';

interface Props {
  onClose: () => void;
  /** Called after a transfer changed stock levels, so the inventory table can reload */
  onChanged: () => void;
}

const ERRORS: Record<string, { ar: string; en: string }> = {
  same_warehouse: { ar: 'يجب اختيار مستودعين مختلفين.', en: 'Source and destination warehouses must differ.' },
  forbidden_warehouse: { ar: 'ليس لديك صلاحية على هذا المستودع.', en: 'You do not work with that warehouse.' },
  insufficient_stock: { ar: 'الكمية غير متوفرة في المستودع المرسل.', en: 'Not enough stock in the sending warehouse.' },
  warehouse_not_found: { ar: 'المستودع غير موجود.', en: 'Warehouse not found.' },
};

/** Stock transfers between warehouses, shown as a popup inside the inventory screen. */
export default function TransfersDialog({ onClose, onChanged }: Props) {
  const { lang, t } = useLanguage();
  const { warehouses, myWarehouses, branches, currentWarehouse, session } = useBranch();
  const ar = lang === 'ar';

  const isAdmin = session?.role === 'super_admin';
  const mayActFor = (whId: string) => isAdmin || myWarehouses.some((w) => w.id === whId);
  const whName = (id: string) => {
    const w = warehouses.find((x) => x.id === id);
    return w ? (ar ? w.nameAr : w.nameEn) : id;
  };
  const brName = (id: string) => {
    const b = branches.find((x) => x.id === id);
    return b ? (ar ? b.nameAr : b.nameEn) : '';
  };

  const [view, setView] = useState<'list' | 'new'>('list');
  const [transfers, setTransfers] = useState<any[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [fromWhId, setFromWhId] = useState('');
  const [toWhId, setToWhId] = useState('');
  const [lines, setLines] = useState<{ item: Item; quantity: number }[]>([]);
  const [scanInput, setScanInput] = useState('');
  const [scanMessage, setScanMessage] = useState('');
  const scanRef = useRef<HTMLInputElement>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () =>
    Promise.all([
      fetch('/api/transfers').then((r) => r.json()),
      fetch('/api/items').then((r) => r.json()),
    ])
      .then(([tr, it]) => {
        if (tr.transfers) setTransfers(tr.transfers);
        if (it.items) setItems(it.items);
      })
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  // Send from the user's own warehouse; receive in any other one
  useEffect(() => {
    setFromWhId((prev) => (myWarehouses.some((w) => w.id === prev) ? prev : currentWarehouse?.id ?? ''));
  }, [myWarehouses, currentWarehouse]);
  useEffect(() => {
    setToWhId((prev) =>
      prev && prev !== fromWhId && warehouses.some((w) => w.id === prev)
        ? prev
        : warehouses.find((w) => w.id !== fromWhId)?.id ?? ''
    );
  }, [fromWhId, warehouses]);

  useEffect(() => {
    if (view === 'new') setTimeout(() => scanRef.current?.focus(), 50);
  }, [view]);

  const stockOf = (item: Item) => item.stockByWarehouse[fromWhId] || 0;

  const addLine = (item: Item) =>
    setLines((prev) => {
      const existing = prev.find((l) => l.item.id === item.id);
      if (existing) return prev.map((l) => (l.item.id === item.id ? { ...l, quantity: l.quantity + 1 } : l));
      return [...prev, { item, quantity: 1 }];
    });
  const setLineQty = (itemId: string, quantity: number) =>
    setLines((prev) => prev.map((l) => (l.item.id === itemId ? { ...l, quantity: Math.max(1, quantity || 1) } : l)));
  const removeLine = (itemId: string) => setLines((prev) => prev.filter((l) => l.item.id !== itemId));

  const query = scanInput.trim().toLowerCase();
  const searchResults = query
    ? items
        .filter(
          (i) =>
            i.barcode.toLowerCase().includes(query) ||
            i.sku.toLowerCase().includes(query) ||
            i.nameAr.toLowerCase().includes(query) ||
            i.nameEn.toLowerCase().includes(query)
        )
        .slice(0, 8)
    : [];

  // Barcode scanners type the code and press Enter
  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    const exact = items.find((i) => i.barcode.toLowerCase() === query || i.sku.toLowerCase() === query);
    const match = exact || (searchResults.length === 1 ? searchResults[0] : undefined);
    if (match) {
      addLine(match);
      setScanMessage(`✓ ${ar ? match.nameAr : match.nameEn}`);
      setScanInput('');
    } else {
      setScanMessage(
        searchResults.length > 1
          ? ar ? 'اختر الصنف من النتائج أدناه' : 'Pick the item from the results below'
          : ar ? 'لم يتم العثور على صنف بهذا الباركود' : 'No item found for this barcode'
      );
    }
    scanRef.current?.focus();
  };

  const showError = (code?: string) => {
    const known = code ? ERRORS[code] : undefined;
    setError(known ? (ar ? known.ar : known.en) : ar ? 'تعذر تنفيذ العملية.' : 'The operation failed.');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!fromWhId || !toWhId || fromWhId === toWhId) return showError('same_warehouse');
    if (lines.length === 0) return setScanMessage(ar ? 'أضف صنفاً واحداً على الأقل' : 'Add at least one item');
    if (lines.some((l) => l.quantity > stockOf(l.item))) return showError('insufficient_stock');

    setSubmitting(true);
    try {
      const res = await fetch('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromWarehouseId: fromWhId,
          toWarehouseId: toWhId,
          items: lines.map((l) => ({
            itemId: l.item.id,
            itemCode: l.item.sku,
            itemNameAr: l.item.nameAr,
            itemNameEn: l.item.nameEn,
            quantity: l.quantity,
          })),
          notes,
        }),
      });
      if (res.ok) {
        setLines([]);
        setNotes('');
        setScanInput('');
        setScanMessage('');
        setView('list');
        await load();
      } else {
        showError((await res.json().catch(() => ({}))).error);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatus = async (id: string, status: string) => {
    setError('');
    const res = await fetch('/api/transfers', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      await load();
      if (status === 'completed') onChanged();
    } else {
      showError((await res.json().catch(() => ({}))).error);
    }
  };

  const statusBadge = (s: string) =>
    s === 'completed'
      ? { cls: 'bg-emerald-100 text-emerald-800', label: t.statusCompleted }
      : s === 'in_transit'
      ? { cls: 'bg-blue-100 text-blue-800', label: t.statusInTransit }
      : s === 'cancelled'
      ? { cls: 'bg-gray-200 text-gray-700', label: ar ? 'ملغي' : 'Cancelled' }
      : { cls: 'bg-amber-100 text-amber-800', label: t.statusPending };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" data-testid="transfers-dialog">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b">
          <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-blue-600" />
            {view === 'new'
              ? ar ? 'طلب تحويل مخزني جديد بين المستودعات' : 'New warehouse transfer'
              : ar ? 'التحويل المخزني بين المستودعات' : 'Stock transfers between warehouses'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold" aria-label="close">✕</button>
        </div>

        {error && <p className="text-red-600 bg-red-50 p-2 rounded-lg text-xs">{error}</p>}

        {view === 'list' ? (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button
                onClick={() => { setError(''); setView('new'); }}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{ar ? 'طلب تحويل مخزني جديد' : 'New Transfer Order'}</span>
              </button>
            </div>

            <div className="border border-gray-200 rounded-xl overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-900 text-white font-semibold">
                  <tr>
                    <th className="p-3 text-start">{t.transferNo}</th>
                    <th className="p-3 text-start">{ar ? 'من مستودع' : 'From warehouse'}</th>
                    <th className="p-3 text-start">{ar ? 'إلى مستودع' : 'To warehouse'}</th>
                    <th className="p-3 text-start">{ar ? 'الأصناف المحولة' : 'Items'}</th>
                    <th className="p-3 text-center">{t.date}</th>
                    <th className="p-3 text-center">{t.status}</th>
                    <th className="p-3 text-center w-36">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading && (
                    <tr><td colSpan={7} className="p-6 text-center text-gray-400">{t.loading}</td></tr>
                  )}
                  {!loading && transfers.length === 0 && (
                    <tr><td colSpan={7} className="p-6 text-center text-gray-400">{ar ? 'لا توجد تحويلات' : 'No transfers yet'}</td></tr>
                  )}
                  {transfers.map((tr) => {
                    const badge = statusBadge(tr.status);
                    return (
                      <tr key={tr.id} className="hover:bg-blue-50/20 transition">
                        <td className="p-3 font-mono font-bold text-blue-700">{tr.transferNo}</td>
                        <td className="p-3">
                          <div className="font-bold text-gray-900">{whName(tr.fromWarehouseId)}</div>
                          <div className="text-[10px] text-gray-500">{brName(tr.fromBranchId)}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-gray-900">{whName(tr.toWarehouseId)}</div>
                          <div className="text-[10px] text-gray-500">{brName(tr.toBranchId)}</div>
                        </td>
                        <td className="p-3">
                          {tr.items?.map((item: any, idx: number) => (
                            <div key={idx} className="font-semibold text-gray-800">
                              {ar ? item.itemNameAr : item.itemNameEn || item.itemNameAr} ({item.quantity})
                            </div>
                          ))}
                        </td>
                        <td className="p-3 text-center font-mono text-gray-500">{tr.createdAt?.substring(0, 10)}</td>
                        <td className="p-3 text-center">
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                        </td>
                        <td className="p-3 text-center space-x-1 space-x-reverse">
                          {tr.status === 'pending' && mayActFor(tr.fromWarehouseId) && (
                            <button
                              onClick={() => handleStatus(tr.id, 'in_transit')}
                              className="px-2.5 py-1 text-[11px] bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition"
                            >
                              {ar ? 'إرسال وشحن' : 'Send'}
                            </button>
                          )}
                          {tr.status === 'in_transit' && mayActFor(tr.toWarehouseId) && (
                            <button
                              onClick={() => handleStatus(tr.id, 'completed')}
                              className="px-2.5 py-1 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition"
                            >
                              {ar ? 'استلام ومطابقة' : 'Receive'}
                            </button>
                          )}
                          {(tr.status === 'pending' || tr.status === 'in_transit') && mayActFor(tr.fromWarehouseId) && (
                            <button
                              onClick={() => handleStatus(tr.id, 'cancelled')}
                              className="px-2.5 py-1 text-[11px] border border-red-300 text-red-600 hover:bg-red-50 font-bold rounded-lg transition"
                            >
                              {ar ? 'إلغاء' : 'Cancel'}
                            </button>
                          )}
                          {tr.status === 'completed' && <span className="text-gray-400 font-bold text-[11px]">{ar ? 'مكتمل ✓' : 'Done ✓'}</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4 text-xs max-w-xl mx-auto">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">{ar ? 'من مستودع' : 'From warehouse'}</label>
                <select
                  value={fromWhId}
                  onChange={(e) => { setFromWhId(e.target.value); setLines([]); }}
                  className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                  data-testid="transfer-from"
                >
                  {myWarehouses.map((w) => (
                    <option key={w.id} value={w.id}>{ar ? w.nameAr : w.nameEn} — {brName(w.branchId)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">{ar ? 'إلى مستودع' : 'To warehouse'}</label>
                <select
                  value={toWhId}
                  onChange={(e) => setToWhId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                  data-testid="transfer-to"
                >
                  {warehouses.filter((w) => w.id !== fromWhId).map((w) => (
                    <option key={w.id} value={w.id}>{ar ? w.nameAr : w.nameEn} — {brName(w.branchId)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                {ar ? 'مسح الباركود أو البحث عن صنف' : 'Scan barcode or search item'} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  ref={scanRef}
                  type="text"
                  value={scanInput}
                  onChange={(e) => { setScanInput(e.target.value); setScanMessage(''); }}
                  onKeyDown={(e) => {
                    // Enter must not submit the whole transfer form while scanning
                    if (e.key === 'Enter') handleScanSubmit(e as unknown as React.FormEvent);
                  }}
                  placeholder={ar ? 'امسح الباركود أو اكتب الاسم / الرمز ثم Enter' : 'Scan a barcode or type name / SKU, then Enter'}
                  className="w-full border border-gray-300 rounded-lg p-2 ps-9 font-mono focus:ring-2 focus:ring-blue-500"
                />
                <ScanBarcode className="w-4 h-4 text-gray-400 absolute start-3 top-2.5" />
              </div>
              {scanMessage && <p className="mt-1 text-[11px] text-gray-600">{scanMessage}</p>}

              {searchResults.length > 0 && (
                <ul className="mt-2 border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-44 overflow-y-auto">
                  {searchResults.map((i) => (
                    <li key={i.id}>
                      <button
                        type="button"
                        onClick={() => {
                          addLine(i);
                          setScanInput('');
                          setScanMessage(`✓ ${ar ? i.nameAr : i.nameEn}`);
                          scanRef.current?.focus();
                        }}
                        className="w-full text-start p-2 hover:bg-blue-50 flex items-center justify-between gap-2"
                      >
                        <span>
                          <span className="font-semibold text-gray-900">{ar ? i.nameAr : i.nameEn}</span>
                          <span className="block text-[10px] text-gray-500 font-mono">{i.sku} · {i.barcode}</span>
                        </span>
                        <span className="text-[10px] text-gray-500 shrink-0">{ar ? 'المتاح' : 'In stock'}: <b className="font-mono">{stockOf(i)}</b></span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                {ar ? 'الأصناف المراد تحويلها' : 'Items to transfer'} ({lines.length})
              </label>
              {lines.length === 0 ? (
                <p className="text-gray-400 border border-dashed border-gray-300 rounded-lg p-3 text-center">
                  {ar ? 'لم تتم إضافة أصناف بعد' : 'No items added yet'}
                </p>
              ) : (
                <ul className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                  {lines.map((l) => (
                    <li key={l.item.id} className="p-2 flex items-center gap-2">
                      <span className="flex-1 min-w-0">
                        <span className="block font-semibold text-gray-900 truncate">{ar ? l.item.nameAr : l.item.nameEn}</span>
                        <span className="block text-[10px] text-gray-500 font-mono">
                          {l.item.sku} · {ar ? 'المتاح' : 'In stock'}: {stockOf(l.item)}
                        </span>
                      </span>
                      <input
                        type="number"
                        min="1"
                        max={stockOf(l.item)}
                        value={l.quantity}
                        onChange={(e) => setLineQty(l.item.id, Number(e.target.value))}
                        className={`w-16 border rounded-lg p-1.5 font-mono text-center ${l.quantity > stockOf(l.item) ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                      />
                      <button type="button" onClick={() => removeLine(l.item.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title={ar ? 'حذف' : 'Remove'}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">{t.notes}</label>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2" />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button type="button" onClick={() => setView('list')} className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700">
                {t.cancel}
              </button>
              <button type="submit" disabled={submitting} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow transition disabled:opacity-60">
                {submitting ? t.loading : ar ? 'إنشاء أمر التحويل' : 'Create transfer'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
