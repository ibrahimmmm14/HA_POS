'use client';

import React, { useState, useEffect } from 'react';
import TransfersDialog from '@/components/inventory/TransfersDialog';
import SerialsDialog from '@/components/inventory/SerialsDialog';
import { useLanguage } from '@/components/common/LanguageContext';
import { useBranch } from '@/components/common/BranchContext';
import { Item } from '@/types';
import { formatCurrency } from '@/lib/utils';
import {
  Package,
  Search,
  AlertTriangle,
  Barcode,
  ArrowLeftRight,
} from 'lucide-react';

export default function InventoryPage() {
  const { lang, t } = useLanguage();
  const { myWarehouses: warehouses, can } = useBranch();
  const [showTransfers, setShowTransfers] = useState(false);
  const [showSerials, setShowSerials] = useState(false);

  const [items, setItems] = useState<Item[]>([]);
  const [category, setCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchItems = () => {
    fetch('/api/items')
      .then((res) => res.json())
      .then((data) => {
        if (data.items) setItems(data.items);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const filtered = items.filter((item) => {
    const matchCat = category === 'all' || item.category === category;
    const matchSearch =
      !search ||
      item.nameAr.toLowerCase().includes(search.toLowerCase()) ||
      item.nameEn.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase()) ||
      item.barcode.includes(search);
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" />
            <span>{t.inventory}</span>
          </h2>
          <p className="text-xs text-gray-500">
            {lang === 'ar'
              ? 'دليل الأصناف، أرصدة المستودعات المتعددة، وحدود إعادة الطلب'
              : 'Multi-warehouse stock control, catalog, serial tracking, and reorder alerts'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {can('transfers') && (
          <button
            onClick={() => setShowTransfers(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl transition"
          >
            <ArrowLeftRight className="w-4 h-4 text-blue-600" />
            <span>{lang === 'ar' ? 'التحويل المخزني' : 'Stock Transfer'}</span>
          </button>
          )}
          {can('serials') && (
          <button
            onClick={() => setShowSerials(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl transition"
          >
            <Barcode className="w-4 h-4 text-purple-600" />
            <span>{lang === 'ar' ? 'بحث بالرقم التسلسلي' : 'Serial Lookup'}</span>
          </button>
          )}
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
                ? 'بحث باسم الصنف، الباركود، الكود (SKU)...'
                : 'Search by item name, SKU, or barcode...'
            }
            className="w-full pl-10 pr-4 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
          />
          <Search className="w-4 h-4 text-gray-400 absolute start-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto text-xs">
          {[
            { id: 'all', label: lang === 'ar' ? 'الكل' : 'All' },
            { id: 'hearing_aids', label: lang === 'ar' ? 'سماعات طبية' : 'Hearing Aids' },
            { id: 'earmolds', label: lang === 'ar' ? 'قوالب وهياكل' : 'Earmolds' },
            { id: 'batteries', label: lang === 'ar' ? 'بطاريات' : 'Batteries' },
            { id: 'spare_parts', label: lang === 'ar' ? 'قطع وفلاتر' : 'Spare Parts' },
            { id: 'accessories', label: lang === 'ar' ? 'ملحقات وأجهزة' : 'Accessories' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                category === cat.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Items Table with Multi-warehouse stock */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-slate-900 text-white font-semibold">
              <tr>
                <th className="p-3 text-start">{t.sku} / {t.barcode}</th>
                <th className="p-3 text-start">{t.itemName}</th>
                <th className="p-3 text-center">{t.category}</th>
                <th className="p-3 text-center">{t.brand}</th>
                <th className="p-3 text-end">{t.costPrice}</th>
                <th className="p-3 text-end">{t.salePrice}</th>
                {warehouses.map((wh) => (
                  <th key={wh.id} className="p-3 text-center font-mono text-[11px]">
                    {wh.nameAr.split(' - ')[1] || wh.code}
                  </th>
                ))}
                <th className="p-3 text-center">{t.stockQty}</th>
                <th className="p-3 text-center">{t.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((item) => {
                const totalStock = Object.values(item.stockByWarehouse).reduce(
                  (a, b) => a + b,
                  0
                );
                const isLow = totalStock <= item.minStockLevel && item.category !== 'earmolds';

                return (
                  <tr key={item.id} className="hover:bg-blue-50/20 transition">
                    <td className="p-3 font-mono">
                      <div className="font-bold text-blue-700">{item.sku}</div>
                      <div className="text-[10px] text-gray-400">{item.barcode}</div>
                    </td>
                    <td className="p-3 font-bold text-gray-900 max-w-[240px]">
                      {item.nameAr}
                      {item.hasSerials && (
                        <span className="ms-2 text-[9px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-mono">
                          S/N Tracked
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center capitalize text-gray-600">
                      {item.category.replace('_', ' ')}
                    </td>
                    <td className="p-3 text-center font-semibold text-gray-800">
                      {item.brand}
                    </td>
                    <td className="p-3 text-end font-mono text-gray-500">
                      {formatCurrency(item.costPrice)} ر.س
                    </td>
                    <td className="p-3 text-end font-mono font-bold text-blue-900">
                      {formatCurrency(item.salePrice)} ر.س
                    </td>
                    {/* Warehouse columns */}
                    {warehouses.map((wh) => (
                      <td key={wh.id} className="p-3 text-center font-mono font-semibold">
                        {item.stockByWarehouse[wh.id] !== undefined
                          ? item.stockByWarehouse[wh.id]
                          : 0}
                      </td>
                    ))}
                    {/* Total Stock */}
                    <td className="p-3 text-center font-mono font-black text-sm">
                      {totalStock} {item.unit}
                    </td>
                    {/* Status Alert */}
                    <td className="p-3 text-center">
                      {isLow ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                          <AlertTriangle className="w-3 h-3" />
                          <span>منخفض</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          متوفر
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showTransfers && <TransfersDialog onClose={() => setShowTransfers(false)} onChanged={fetchItems} />}
      {showSerials && <SerialsDialog onClose={() => setShowSerials(false)} />}
    </div>
  );
}
