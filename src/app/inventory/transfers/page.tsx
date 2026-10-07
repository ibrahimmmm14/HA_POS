'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/components/common/LanguageContext';
import { useBranch } from '@/components/common/BranchContext';
import { StockTransfer, Item } from '@/types';
import {
  ArrowLeftRight,
  PlusCircle,
  CheckCircle2,
  Clock,
  Truck,
  ArrowRight,
  Building,
  Package,
  ScanBarcode,
  Trash2,
} from 'lucide-react';

export default function TransfersPage() {
  const { lang, t } = useLanguage();
  const { branches, selectableBranches, currentBranch, session, warehouses, currentUser } = useBranch();

  // Dispatching is done by the sending branch and receiving by the receiving branch (administrators: either)
  const mayActFor = (branchId: string) => session?.role === 'super_admin' || !!session?.branchIds.includes(branchId);

  const [transfers, setTransfers] = useState<any[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  // New Transfer Modal
  const [showModal, setShowModal] = useState(false);
  const [fromBranchId, setFromBranchId] = useState('');
  const [toBranchId, setToBranchId] = useState('');
  const [lines, setLines] = useState<{ item: Item; quantity: number }[]>([]);
  const [scanInput, setScanInput] = useState('');
  const [scanMessage, setScanMessage] = useState('');
  const scanRef = useRef<HTMLInputElement>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Start from the branch selected in the header, towards the first other branch
  useEffect(() => {
    if (!currentBranch) return;
    setFromBranchId((prev) => (selectableBranches.some((b) => b.id === prev) ? prev : currentBranch.id));
  }, [currentBranch, selectableBranches]);

  useEffect(() => {
    setToBranchId((prev) =>
      prev && prev !== fromBranchId && branches.some((b) => b.id === prev)
        ? prev
        : branches.find((b) => b.id !== fromBranchId)?.id ?? ''
    );
  }, [fromBranchId, branches]);

  const fetchTransfers = () => {
    fetch('/api/transfers')
      .then((res) => res.json())
      .then((data) => {
        if (data.transfers) setTransfers(data.transfers);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTransfers();
    fetch('/api/items')
      .then((res) => res.json())
      .then((data) => {
        if (data.items) setItems(data.items);
      });
  }, []);

  // Keep the scan box focused while the dialog is open so a scanner can be used right away
  useEffect(() => {
    if (showModal) setTimeout(() => scanRef.current?.focus(), 50);
  }, [showModal]);

  const addLine = (item: Item) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.item.id === item.id);
      if (existing) {
        return prev.map((l) => (l.item.id === item.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const setLineQty = (itemId: string, quantity: number) =>
    setLines((prev) =>
      prev.map((l) => (l.item.id === itemId ? { ...l, quantity: Math.max(1, quantity || 1) } : l))
    );

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

  // Barcode scanners type the code and press Enter: an exact barcode/SKU match is added straight away;
  // otherwise Enter adds the only search result, if there is exactly one.
  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;

    const exact = items.find((i) => i.barcode.toLowerCase() === query || i.sku.toLowerCase() === query);
    const match = exact || (searchResults.length === 1 ? searchResults[0] : undefined);

    if (match) {
      addLine(match);
      setScanMessage(`✓ ${lang === 'ar' ? match.nameAr : match.nameEn}`);
      setScanInput('');
    } else {
      setScanMessage(
        searchResults.length > 1
          ? lang === 'ar' ? 'اختر الصنف من النتائج أدناه' : 'Pick the item from the results below'
          : lang === 'ar' ? 'لم يتم العثور على صنف بهذا الباركود' : 'No item found for this barcode'
      );
    }
    scanRef.current?.focus();
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fromBranchId === toBranchId) {
      alert(lang === 'ar' ? 'يجب اختيار فرعين مختلفين للتحويل' : 'Source and destination must differ');
      return;
    }

    if (lines.length === 0) {
      setScanMessage(lang === 'ar' ? 'أضف صنفاً واحداً على الأقل' : 'Add at least one item');
      return;
    }

    const fromWh = warehouses.find((w) => w.branchId === fromBranchId);
    const toWh = warehouses.find((w) => w.branchId === toBranchId);
    if (!fromWh || !toWh) {
      alert(lang === 'ar' ? 'لا يوجد مستودع لأحد الفرعين' : 'A selected branch has no warehouse');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromBranchId,
          fromWarehouseId: fromWh.id,
          toBranchId,
          toWarehouseId: toWh.id,
          requestedBy: currentUser.nameAr,
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
        setShowModal(false);
        setNotes('');
        setLines([]);
        setScanInput('');
        setScanMessage('');
        fetchTransfers();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch('/api/transfers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        fetchTransfers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-blue-600" />
            <span>{t.interBranchTransfer}</span>
          </h2>
          <p className="text-xs text-gray-500">
            {lang === 'ar'
              ? 'إدارة أوامر المناقلة والتحويل بين مستودعات الفروع مع التتبع الكامل والاعتماد'
              : 'Inter-branch stock transfer documents, approval workflow, and real-time inventory relocation'}
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{lang === 'ar' ? 'طلب تحويل مخزني جديد' : 'New Transfer Order'}</span>
        </button>
      </div>

      {/* Transfers Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-slate-900 text-white font-semibold">
              <tr>
                <th className="p-3 text-start">{t.transferNo}</th>
                <th className="p-3 text-start">{t.fromBranch}</th>
                <th className="p-3 text-start">{t.toBranch}</th>
                <th className="p-3 text-start">الأصناف المحولة</th>
                <th className="p-3 text-center">{t.date}</th>
                <th className="p-3 text-center">{t.status}</th>
                <th className="p-3 text-center w-36">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transfers.map((tr) => (
                <tr key={tr.id} className="hover:bg-blue-50/20 transition">
                  <td className="p-3 font-mono font-bold text-blue-700">
                    {tr.transferNo}
                  </td>
                  <td className="p-3">
                    <div className="font-bold text-gray-900">{tr.fromBranchNameAr}</div>
                    <div className="text-[10px] text-gray-500">{tr.fromWhNameAr}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-bold text-gray-900">{tr.toBranchNameAr}</div>
                    <div className="text-[10px] text-gray-500">{tr.toWhNameAr}</div>
                  </td>
                  <td className="p-3">
                    {tr.items?.map((item: any, idx: number) => (
                      <div key={idx} className="font-semibold text-gray-800">
                        {item.itemNameAr} ({item.quantity} حبة)
                      </div>
                    ))}
                  </td>
                  <td className="p-3 text-center font-mono text-gray-500">
                    {tr.createdAt?.substring(0, 10)}
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        tr.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : tr.status === 'in_transit'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {tr.status === 'completed'
                        ? t.statusCompleted
                        : tr.status === 'in_transit'
                        ? t.statusInTransit
                        : t.statusPending}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    {tr.status === 'pending' && mayActFor(tr.fromBranchId) && (
                      <button
                        onClick={() => handleUpdateStatus(tr.id, 'in_transit')}
                        className="px-2.5 py-1 text-[11px] bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition"
                      >
                        إرسال وشحن
                      </button>
                    )}
                    {tr.status === 'in_transit' && mayActFor(tr.toBranchId) && (
                      <button
                        onClick={() => handleUpdateStatus(tr.id, 'completed')}
                        className="px-2.5 py-1 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition"
                      >
                        استلام ومطابقة
                      </button>
                    )}
                    {tr.status === 'completed' && (
                      <span className="text-gray-400 font-bold text-[11px]">مكتمل ✓</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Transfer Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-bold text-base text-gray-900">
                {lang === 'ar' ? 'طلب تحويل مخزني جديد بين الفروع' : 'Create Stock Transfer Order'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">{t.fromBranch}</label>
                  <select
                    value={fromBranchId}
                    onChange={(e) => setFromBranchId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                  >
                    {selectableBranches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nameAr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">{t.toBranch}</label>
                  <select
                    value={toBranchId}
                    onChange={(e) => setToBranchId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                  >
                    {branches.filter((b) => b.id !== fromBranchId).map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nameAr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  {lang === 'ar' ? 'مسح الباركود أو البحث عن صنف' : 'Scan barcode or search item'}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    ref={scanRef}
                    type="text"
                    value={scanInput}
                    onChange={(e) => {
                      setScanInput(e.target.value);
                      setScanMessage('');
                    }}
                    onKeyDown={(e) => {
                      // Enter must not submit the whole transfer form while scanning
                      if (e.key === 'Enter') handleScanSubmit(e as unknown as React.FormEvent);
                    }}
                    placeholder={
                      lang === 'ar'
                        ? 'امسح الباركود أو اكتب الاسم / الرمز ثم Enter'
                        : 'Scan a barcode or type name / SKU, then Enter'
                    }
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
                            setScanMessage(`✓ ${lang === 'ar' ? i.nameAr : i.nameEn}`);
                            scanRef.current?.focus();
                          }}
                          className="w-full text-start p-2 hover:bg-blue-50 flex items-center justify-between gap-2"
                        >
                          <span>
                            <span className="font-semibold text-gray-900">{lang === 'ar' ? i.nameAr : i.nameEn}</span>
                            <span className="block text-[10px] text-gray-500 font-mono">
                              {i.sku} · {i.barcode}
                            </span>
                          </span>
                          <PlusCircle className="w-4 h-4 text-blue-600 shrink-0" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  {lang === 'ar' ? 'الأصناف المراد تحويلها' : 'Items to transfer'} ({lines.length})
                </label>
                {lines.length === 0 ? (
                  <p className="text-gray-400 border border-dashed border-gray-300 rounded-lg p-3 text-center">
                    {lang === 'ar' ? 'لم تتم إضافة أصناف بعد' : 'No items added yet'}
                  </p>
                ) : (
                  <ul className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {lines.map((l) => (
                      <li key={l.item.id} className="p-2 flex items-center gap-2">
                        <span className="flex-1 min-w-0">
                          <span className="block font-semibold text-gray-900 truncate">
                            {lang === 'ar' ? l.item.nameAr : l.item.nameEn}
                          </span>
                          <span className="block text-[10px] text-gray-500 font-mono">{l.item.sku}</span>
                        </span>
                        <input
                          type="number"
                          min="1"
                          value={l.quantity}
                          onChange={(e) => setLineQty(l.item.id, Number(e.target.value))}
                          className="w-16 border border-gray-300 rounded-lg p-1.5 font-mono text-center"
                        />
                        <button
                          type="button"
                          onClick={() => removeLine(l.item.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                          title={lang === 'ar' ? 'حذف' : 'Remove'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">{t.notes}</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="سبب التحويل أو رقم إرسالية الشحن..."
                  className="w-full border border-gray-300 rounded-lg p-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow transition"
                >
                  {submitting ? t.loading : 'إنشاء أمر التحويل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
