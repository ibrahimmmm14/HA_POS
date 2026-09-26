'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';

export default function TransfersPage() {
  const { lang, t } = useLanguage();
  const { branches, warehouses, currentUser } = useBranch();

  const [transfers, setTransfers] = useState<any[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  // New Transfer Modal
  const [showModal, setShowModal] = useState(false);
  const [fromBranchId, setFromBranchId] = useState('br-01');
  const [toBranchId, setToBranchId] = useState('br-02');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [transferQty, setTransferQty] = useState<number>(1);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
        if (data.items) {
          setItems(data.items);
          if (data.items.length > 0) setSelectedItemId(data.items[0].id);
        }
      });
  }, []);

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fromBranchId === toBranchId) {
      alert(lang === 'ar' ? 'يجب اختيار فرعين مختلفين للتحويل' : 'Source and destination must differ');
      return;
    }

    const item = items.find((i) => i.id === selectedItemId);
    if (!item) return;

    const fromWh = warehouses.find((w) => w.branchId === fromBranchId) || warehouses[0];
    const toWh = warehouses.find((w) => w.branchId === toBranchId) || warehouses[1];

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
          items: [
            {
              itemId: item.id,
              itemCode: item.sku,
              itemNameAr: item.nameAr,
              itemNameEn: item.nameEn,
              quantity: Number(transferQty),
            },
          ],
          notes,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        setNotes('');
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
                    {tr.status === 'pending' && (
                      <button
                        onClick={() => handleUpdateStatus(tr.id, 'in_transit')}
                        className="px-2.5 py-1 text-[11px] bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition"
                      >
                        إرسال وشحن
                      </button>
                    )}
                    {tr.status === 'in_transit' && (
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
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4">
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
                    {branches.map((b) => (
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
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nameAr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  الصنف المراد تحويله <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                >
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      [{i.sku}] {i.nameAr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">{t.quantity}</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={transferQty}
                  onChange={(e) => setTransferQty(Math.max(1, Number(e.target.value)))}
                  className="w-full border border-gray-300 rounded-lg p-2 font-mono"
                />
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
