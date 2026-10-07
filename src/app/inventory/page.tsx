'use client';

import React, { useState, useEffect } from 'react';
import TransfersDialog from '@/components/inventory/TransfersDialog';
import SerialsDialog from '@/components/inventory/SerialsDialog';
import { useLanguage } from '@/components/common/LanguageContext';
import { useBranch } from '@/components/common/BranchContext';
import { Item, ItemCategory } from '@/types';
import { formatCurrency } from '@/lib/utils';
import {
  Package,
  PlusCircle,
  Search,
  AlertTriangle,
  Barcode,
  ArrowLeftRight,
  ShieldCheck,
  Layers,
  Pencil,
  Percent,
} from 'lucide-react';

const CATEGORY_OPTIONS = [
  { id: 'hearing_aids', ar: 'سماعات طبية', en: 'Hearing Aids' },
  { id: 'earmolds', ar: 'قوالب وهياكل', en: 'Earmolds' },
  { id: 'batteries', ar: 'بطاريات', en: 'Batteries' },
  { id: 'spare_parts', ar: 'قطع وفلاتر', en: 'Spare Parts' },
  { id: 'accessories', ar: 'ملحقات وأجهزة', en: 'Accessories' },
];

const roundMoney = (n: number) => Math.round(n * 100) / 100;

export default function InventoryPage() {
  const { lang, t } = useLanguage();
  const { myWarehouses: warehouses, currentWarehouse, can } = useBranch();
  const [showTransfers, setShowTransfers] = useState(false);
  const [showSerials, setShowSerials] = useState(false);
  const canAddItems = can('items_add');
  const canEditPrices = can('inventory_prices');

  const [items, setItems] = useState<Item[]>([]);
  const [category, setCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Add Item Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSku, setNewSku] = useState('');
  const [newBarcode, setNewBarcode] = useState('');
  const [newNameAr, setNewNameAr] = useState('');
  const [newCategory, setNewCategory] = useState<ItemCategory>('hearing_aids');
  const [newBrand, setNewBrand] = useState('Oticon');
  const [newModel, setNewModel] = useState('');
  const [newUnit, setNewUnit] = useState('قطعة');
  const [newCost, setNewCost] = useState<number>(0);
  const [newPrice, setNewPrice] = useState<number>(0);
  const [newHasSerials, setNewHasSerials] = useState(false);
  const [newWarranty, setNewWarranty] = useState<number>(24);
  const [newMinStock, setNewMinStock] = useState<number>(3);
  const [newStockWh1, setNewStockWh1] = useState<number>(5);

  // Edit item prices
  const [priceItem, setPriceItem] = useState<Item | null>(null);
  const [editCost, setEditCost] = useState<number>(0);
  const [editSale, setEditSale] = useState<number>(0);

  // Bulk price change by category
  const [showBulk, setShowBulk] = useState(false);
  const [bulkCategory, setBulkCategory] = useState<string>('hearing_aids');
  const [bulkPercent, setBulkPercent] = useState<number>(10);
  const [bulkTarget, setBulkTarget] = useState<'salePrice' | 'costPrice' | 'both'>('salePrice');

  const [priceSaving, setPriceSaving] = useState(false);
  const [priceError, setPriceError] = useState('');

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

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSku || !newNameAr) return;

    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'item',
          data: {
            sku: newSku,
            barcode: newBarcode || `628${Math.floor(100000000 + Math.random() * 900000000)}`,
            nameAr: newNameAr,
            nameEn: newNameAr,
            category: newCategory,
            brand: newBrand,
            model: newModel || newNameAr,
            unit: newUnit,
            costPrice: Number(newCost),
            salePrice: Number(newPrice),
            taxRate: 0.15,
            hasSerials: newHasSerials,
            warrantyMonths: Number(newWarranty),
            minStockLevel: Number(newMinStock),
            stockByWarehouse: {
              'wh-01': Number(newStockWh1),
              'wh-02': 0,
              'wh-03': 0,
            },
          },
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        fetchItems();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openPriceEdit = (item: Item) => {
    setPriceItem(item);
    setEditCost(item.costPrice);
    setEditSale(item.salePrice);
    setPriceError('');
  };

  const handleSavePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceItem) return;
    setPriceSaving(true);
    setPriceError('');
    try {
      const res = await fetch(`/api/items/${priceItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ costPrice: editCost, salePrice: editSale }),
      });
      if (!res.ok) {
        setPriceError(lang === 'ar' ? 'تعذر حفظ السعر.' : 'Could not save the price.');
        return;
      }
      setPriceItem(null);
      fetchItems();
    } catch (err) {
      console.error(err);
      setPriceError(lang === 'ar' ? 'حدث خطأ في الاتصال.' : 'Connection error.');
    } finally {
      setPriceSaving(false);
    }
  };

  const openBulk = () => {
    if (category !== 'all') setBulkCategory(category);
    setPriceError('');
    setShowBulk(true);
  };

  const bulkItems = items.filter((i) => i.category === bulkCategory);
  const bulkFactor = 1 + (Number(bulkPercent) || 0) / 100;

  const handleBulkSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPriceSaving(true);
    setPriceError('');
    try {
      const res = await fetch('/api/items/bulk-price', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: bulkCategory, percent: Number(bulkPercent), target: bulkTarget }),
      });
      if (!res.ok) {
        setPriceError(
          lang === 'ar'
            ? 'تعذر تعديل الأسعار. النسبة يجب أن تكون بين -90 و 500 وليست صفراً.'
            : 'Could not update prices. The percentage must be between -90 and 500, and not 0.'
        );
        return;
      }
      setShowBulk(false);
      fetchItems();
    } catch (err) {
      console.error(err);
      setPriceError(lang === 'ar' ? 'حدث خطأ في الاتصال.' : 'Connection error.');
    } finally {
      setPriceSaving(false);
    }
  };

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
          {canEditPrices && (
          <button
            onClick={openBulk}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl transition"
          >
            <Percent className="w-4 h-4 text-amber-600" />
            <span>{lang === 'ar' ? 'تعديل أسعار فئة' : 'Edit Category Prices'}</span>
          </button>
          )}
          {canAddItems && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{lang === 'ar' ? 'إضافة صنف جديد' : 'Add Item'}</span>
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
                {canEditPrices && <th className="p-3 text-center w-16">{lang === 'ar' ? 'تعديل' : 'Edit'}</th>}
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
                    {canEditPrices && (
                    <td className="p-3 text-center">
                      <button
                        onClick={() => openPriceEdit(item)}
                        className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition inline-flex"
                        title={lang === 'ar' ? 'تعديل السعر' : 'Edit price'}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Item Price Modal */}
      {priceItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-bold text-base text-gray-900">
                {lang === 'ar' ? 'تعديل سعر الصنف' : 'Edit Item Price'}
              </h3>
              <button onClick={() => setPriceItem(null)} className="text-gray-400 hover:text-gray-600 font-bold">
                ✕
              </button>
            </div>

            <div className="text-xs">
              <div className="font-bold text-gray-900">{priceItem.nameAr}</div>
              <div className="font-mono text-gray-500">{priceItem.sku}</div>
            </div>

            <form onSubmit={handleSavePrice} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">{t.costPrice}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={editCost}
                    onChange={(e) => setEditCost(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">{t.salePrice}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={editSale}
                    onChange={(e) => setEditSale(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg p-2 font-mono font-bold"
                  />
                </div>
              </div>

              {editCost > 0 && (
                <p className={`font-mono ${editSale < editCost ? 'text-red-600' : 'text-gray-500'}`}>
                  {lang === 'ar' ? 'هامش الربح' : 'Margin'}:{' '}
                  {(((editSale - editCost) / editCost) * 100).toFixed(1)}%
                  {editSale < editCost && (lang === 'ar' ? ' — سعر البيع أقل من التكلفة' : ' — sale price is below cost')}
                </p>
              )}
              <p className="text-gray-500">
                {lang === 'ar'
                  ? 'التعديل يسري على الفواتير الجديدة فقط، ولا يغيّر الفواتير الصادرة.'
                  : 'Applies to new invoices only; issued invoices are not changed.'}
              </p>

              {priceError && <p className="text-red-600 bg-red-50 p-2 rounded-lg">{priceError}</p>}

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setPriceItem(null)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={priceSaving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow transition disabled:opacity-60"
                >
                  {priceSaving ? t.loading : t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Price Change by Category Modal */}
      {showBulk && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-bold text-base text-gray-900">
                {lang === 'ar' ? 'تعديل أسعار فئة كاملة' : 'Change Prices for a Category'}
              </h3>
              <button onClick={() => setShowBulk(false)} className="text-gray-400 hover:text-gray-600 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleBulkSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">{t.category}</label>
                <select
                  value={bulkCategory}
                  onChange={(e) => setBulkCategory(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {lang === 'ar' ? c.ar : c.en}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    {lang === 'ar' ? 'النسبة % (سالب للتخفيض)' : 'Percent % (negative to lower)'}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="-90"
                    max="500"
                    required
                    value={bulkPercent}
                    onChange={(e) => setBulkPercent(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    {lang === 'ar' ? 'يطبق على' : 'Apply to'}
                  </label>
                  <select
                    value={bulkTarget}
                    onChange={(e) => setBulkTarget(e.target.value as 'salePrice' | 'costPrice' | 'both')}
                    className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                  >
                    <option value="salePrice">{t.salePrice}</option>
                    <option value="costPrice">{t.costPrice}</option>
                    <option value="both">{lang === 'ar' ? 'الاثنين' : 'Both'}</option>
                  </select>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-1">
                <div className="font-bold text-gray-800">
                  {lang === 'ar'
                    ? `سيتم تعديل ${bulkItems.length} صنف`
                    : `${bulkItems.length} item(s) will change`}
                </div>
                {bulkItems.slice(0, 4).map((i) => (
                  <div key={i.id} className="flex items-center justify-between gap-2 font-mono text-[11px] text-gray-600">
                    <span className="truncate">{i.sku}</span>
                    <span className="whitespace-nowrap">
                      {bulkTarget !== 'costPrice' && (
                        <>
                          {formatCurrency(i.salePrice)} ← <b>{formatCurrency(roundMoney(i.salePrice * bulkFactor))}</b>
                        </>
                      )}
                      {bulkTarget === 'both' && ' | '}
                      {bulkTarget !== 'salePrice' && (
                        <>
                          {formatCurrency(i.costPrice)} ← <b>{formatCurrency(roundMoney(i.costPrice * bulkFactor))}</b>
                        </>
                      )}
                    </span>
                  </div>
                ))}
                {bulkItems.length > 4 && <div className="text-gray-400">…</div>}
              </div>
              <p className="text-gray-500">
                {lang === 'ar'
                  ? 'التعديل يسري على الفواتير الجديدة فقط، ولا يغيّر الفواتير الصادرة.'
                  : 'Applies to new invoices only; issued invoices are not changed.'}
              </p>

              {priceError && <p className="text-red-600 bg-red-50 p-2 rounded-lg">{priceError}</p>}

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowBulk(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={priceSaving || bulkItems.length === 0 || !Number(bulkPercent)}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow transition disabled:opacity-60"
                >
                  {priceSaving ? t.loading : lang === 'ar' ? 'تطبيق التعديل' : 'Apply Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-bold text-base text-gray-900">
                {lang === 'ar' ? 'إضافة صنف جديد في الكتالوج' : 'Add New Catalog Item'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    {t.sku} (الكود) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                    placeholder="HA-PH-XX"
                    className="w-full border border-gray-300 rounded-lg p-2 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">{t.barcode}</label>
                  <input
                    type="text"
                    value={newBarcode}
                    onChange={(e) => setNewBarcode(e.target.value)}
                    placeholder="628XXXXXXXXX"
                    className="w-full border border-gray-300 rounded-lg p-2 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  {t.itemName} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newNameAr}
                  onChange={(e) => setNewNameAr(e.target.value)}
                  placeholder="اسم المعينة السمعية أو الملحق..."
                  className="w-full border border-gray-300 rounded-lg p-2"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">{t.category}</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                  >
                    <option value="hearing_aids">Hearing Aids (سماعات)</option>
                    <option value="batteries">Batteries (بطاريات)</option>
                    <option value="earmolds">Earmolds (قوالب)</option>
                    <option value="spare_parts">Spare Parts (فلاتر وقطع)</option>
                    <option value="accessories">Accessories (ملحقات)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">{t.brand}</label>
                  <input
                    type="text"
                    value={newBrand}
                    onChange={(e) => setNewBrand(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">{t.unit}</label>
                  <input
                    type="text"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">{t.costPrice}</label>
                  <input
                    type="number"
                    value={newCost}
                    onChange={(e) => setNewCost(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg p-2 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">{t.salePrice}</label>
                  <input
                    type="number"
                    value={newPrice}
                    onChange={(e) => setNewPrice(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg p-2 font-mono font-bold text-blue-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">رصيد البداية</label>
                  <input
                    type="number"
                    value={newStockWh1}
                    onChange={(e) => setNewStockWh1(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">{t.minStock}</label>
                  <input
                    type="number"
                    value={newMinStock}
                    onChange={(e) => setNewMinStock(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">شهور الضمان</label>
                  <input
                    type="number"
                    value={newWarranty}
                    onChange={(e) => setNewWarranty(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg p-2 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="serialsToggle"
                  checked={newHasSerials}
                  onChange={(e) => setNewHasSerials(e.target.checked)}
                  className="rounded text-purple-600"
                />
                <label htmlFor="serialsToggle" className="font-semibold text-gray-800">
                  تتبع الأرقام التسلسلية الفردية (Serial Numbers) لهذه الوحدة
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow transition"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTransfers && <TransfersDialog onClose={() => setShowTransfers(false)} onChanged={fetchItems} />}
      {showSerials && <SerialsDialog onClose={() => setShowSerials(false)} />}
    </div>
  );
}
