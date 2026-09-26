'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/components/common/LanguageContext';
import { useBranch } from '@/components/common/BranchContext';
import { Item, Invoice, Client } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { ThermalReceiptPrint } from './ThermalReceiptPrint';
import {
  Zap,
  Search,
  ShoppingCart,
  Trash2,
  CheckCircle2,
  Printer,
  Plus,
  Minus,
  CreditCard,
  Coins,
} from 'lucide-react';

export function FastPosTerminal() {
  const { lang, t } = useLanguage();
  const { currentBranch, currentWarehouse, currentUser } = useBranch();

  const [items, setItems] = useState<Item[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');

  // Cart: itemId -> { item, qty }
  const [cart, setCart] = useState<{ item: Item; qty: number }[]>([]);
  const [completedInvoice, setCompletedInvoice] = useState<Invoice | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/items')
      .then((res) => res.json())
      .then((data) => {
        if (data.items) setItems(data.items);
      });

    fetch('/api/clients')
      .then((res) => res.json())
      .then((data) => {
        if (data.clients) {
          setClients(data.clients);
          if (data.clients.length > 0) setSelectedClientId(data.clients[0].id);
        }
      });
  }, []);

  // Quick Barcode Scanning handler
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const matched = items.find(
      (i) =>
        i.barcode === barcodeInput.trim() ||
        i.sku.toLowerCase() === barcodeInput.trim().toLowerCase()
    );

    if (matched) {
      addToCart(matched);
      setBarcodeInput('');
    } else {
      alert(lang === 'ar' ? 'لم يتم العثور على صنف بهذا الباركود' : 'Barcode not found');
    }
  };

  const addToCart = (item: Item) => {
    setCart((prev) => {
      const existing = prev.find((p) => p.item.id === item.id);
      if (existing) {
        return prev.map((p) =>
          p.item.id === item.id ? { ...p, qty: p.qty + 1 } : p
        );
      }
      return [...prev, { item, qty: 1 }];
    });
  };

  const updateQty = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((p) => (p.item.id === itemId ? { ...p, qty: p.qty + delta } : p))
        .filter((p) => p.qty > 0)
    );
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((p) => p.item.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Cart Calculations
  const grossTotal = cart.reduce((acc, p) => acc + p.item.salePrice * p.qty, 0);
  const taxAmount = Number((grossTotal * 0.15).toFixed(2));
  const grandTotal = Number((grossTotal + taxAmount).toFixed(2));

  // Quick Checkout
  const handleCheckout = async (paymentMethod: 'cash' | 'mada') => {
    if (cart.length === 0) return;
    setSubmitting(true);

    try {
      const lines = cart.map((p) => {
        const gross = p.item.salePrice * p.qty;
        const tax = Number((gross * 0.15).toFixed(2));
        const total = Number((gross + tax).toFixed(2));
        return {
          id: `ln-${Date.now()}-${p.item.id}`,
          itemId: p.item.id,
          itemCode: p.item.sku,
          itemNameAr: p.item.nameAr,
          itemNameEn: p.item.nameEn,
          unit: p.item.unit,
          quantity: p.qty,
          unitPrice: p.item.salePrice,
          grossAmount: gross,
          discountPercent: 0,
          discountValue: 0,
          netAmount: gross,
          taxPercent: 15,
          taxAmount: tax,
          totalAmount: total,
          warehouseId: currentWarehouse.id,
          isDelivered: true,
          isReady: true,
          isTrial: false,
        };
      });

      const invoicePayload = {
        date: new Date().toISOString().split('T')[0],
        deliveryDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
        branchId: currentBranch.id,
        warehouseId: currentWarehouse.id,
        costCenter: 'CC-OTC-01',
        workshop: 'مبيعات الكاشير المباشرة',
        clientId: selectedClientId || clients[0]?.id || 'cl-walkin',
        sellerName: currentUser.nameAr,
        lines,
        subtotalBeforeTax: grossTotal,
        totalDiscount: 0,
        taxAmount,
        grandTotal,
        depositPaid: 0,
        amountPaid: grandTotal,
        remainingDue: 0,
        paymentMethod,
        isInsurance: false,
        deliveryStatus: 'delivered',
        notes: 'مبيعات فورية OTC عبر نقطة البيع السريعة',
      };

      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoicePayload),
      });

      const data = await res.json();
      if (res.ok) {
        setCompletedInvoice(data.invoice);
        setCart([]);
      }
    } catch (e) {
      console.error(e);
      alert('Checkout error');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered items
  const filteredItems = items.filter((item) => {
    const matchCategory =
      selectedCategory === 'all' || item.category === selectedCategory;
    const matchSearch =
      !searchQuery ||
      item.nameAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.barcode.includes(searchQuery);
    return matchCategory && matchSearch;
  });

  return (
    <div className="space-y-4">
      {/* If completed, show receipt preview modal */}
      {completedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-2 text-emerald-600 font-bold">
                <CheckCircle2 className="w-5 h-5" />
                <span>{lang === 'ar' ? 'تمت عملية البيع بنجاح!' : 'Sale Completed!'}</span>
              </div>
              <button
                onClick={() => setCompletedInvoice(null)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <ThermalReceiptPrint
              invoice={completedInvoice}
              client={clients.find((c) => c.id === completedInvoice.clientId)}
              branch={currentBranch}
            />

            <button
              onClick={() => setCompletedInvoice(null)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl"
            >
              {lang === 'ar' ? 'بدء عملية جديدة' : 'Start Next Sale'}
            </button>
          </div>
        </div>
      )}

      {/* POS Top Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Barcode scanner box */}
        <div className="md:col-span-6">
          <form onSubmit={handleBarcodeSubmit} className="relative">
            <input
              ref={barcodeInputRef}
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder={t.barcodeScan}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-blue-500/80 bg-white font-mono text-xs focus:ring-4 focus:ring-blue-100 focus:outline-none shadow-sm"
              autoFocus
            />
            <Zap className="w-4 h-4 text-blue-600 absolute start-3 top-3.5" />
          </form>
        </div>

        {/* Client quick select */}
        <div className="md:col-span-4">
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="w-full border border-gray-300 rounded-xl p-2.5 text-xs bg-white focus:ring-2 focus:ring-blue-500"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameAr} ({c.phone})
              </option>
            ))}
          </select>
        </div>

        {/* Category filter tabs */}
        <div className="md:col-span-2 text-end text-xs font-semibold text-gray-500">
          {currentWarehouse.nameAr}
        </div>
      </div>

      {/* Main POS Interface: Left Product Grid, Right Cart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Product Catalog Grid (8 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            {[
              { id: 'all', label: lang === 'ar' ? 'الكل' : 'All' },
              { id: 'batteries', label: lang === 'ar' ? 'البطاريات' : 'Batteries' },
              { id: 'spare_parts', label: lang === 'ar' ? 'الفلاتر والقطع' : 'Spare Parts' },
              { id: 'accessories', label: lang === 'ar' ? 'الملحقات والشواحن' : 'Accessories' },
              { id: 'earmolds', label: lang === 'ar' ? 'القوالب' : 'Earmolds' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Product Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredItems.map((item) => {
              const stock = item.stockByWarehouse[currentWarehouse.id] || 0;
              return (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="p-3 bg-white hover:bg-blue-50/50 border border-gray-200 hover:border-blue-300 rounded-xl text-start shadow-xs transition group flex flex-col justify-between h-32"
                >
                  <div>
                    <div className="flex justify-between items-start gap-1">
                      <span className="text-[10px] font-mono text-gray-400">
                        {item.sku}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          stock > item.minStockLevel
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {stock} {item.unit}
                      </span>
                    </div>
                    <div className="font-bold text-xs text-gray-900 line-clamp-2 mt-1 group-hover:text-blue-600 transition">
                      {item.nameAr}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-gray-100">
                    <span className="text-xs font-mono font-black text-blue-700">
                      {formatCurrency(item.salePrice)} ر.س
                    </span>
                    <span className="w-6 h-6 rounded-lg bg-blue-50 group-hover:bg-blue-600 text-blue-600 group-hover:text-white flex items-center justify-center transition">
                      <Plus className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Cart & Instant Checkout (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col justify-between min-h-[500px]">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2 font-bold text-sm text-gray-900">
                <ShoppingCart className="w-4 h-4 text-blue-600" />
                <span>{t.cartItems}</span>
                <span className="text-xs text-gray-400 font-mono">
                  ({cart.reduce((acc, c) => acc + c.qty, 0)})
                </span>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  {t.clearCart}
                </button>
              )}
            </div>

            {/* Cart Items List */}
            <div className="space-y-2 max-h-[280px] overflow-y-auto pe-1">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-xs">
                  {lang === 'ar'
                    ? 'السلة فارغة. انقر على أي منتج أو امسح الباركود للبدء.'
                    : 'Cart is empty. Click an item or scan barcode to add.'}
                </div>
              ) : (
                cart.map(({ item, qty }) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl border border-gray-100 bg-slate-50/50 flex items-center justify-between text-xs"
                  >
                    <div className="flex-1 me-2">
                      <div className="font-bold text-gray-900 leading-tight">
                        {item.nameAr}
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                        {formatCurrency(item.salePrice)} ر.س × {qty}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-gray-300 rounded-lg bg-white overflow-hidden">
                        <button
                          onClick={() => updateQty(item.id, -1)}
                          className="px-2 py-1 text-gray-600 hover:bg-gray-100"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 font-mono font-bold text-gray-900">
                          {qty}
                        </span>
                        <button
                          onClick={() => updateQty(item.id, 1)}
                          className="px-2 py-1 text-gray-600 hover:bg-gray-100"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="font-mono font-bold text-blue-900 w-16 text-end">
                        {formatCurrency(item.salePrice * qty)}
                      </div>

                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-gray-400 hover:text-red-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Cart Bottom: Calculations & Fast Checkout Buttons */}
          <div className="pt-4 border-t border-gray-100 space-y-3">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>المجموع:</span>
                <span className="font-mono font-semibold">{formatCurrency(grossTotal)} ر.س</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>الضريبة (15%):</span>
                <span className="font-mono font-semibold">{formatCurrency(taxAmount)} ر.س</span>
              </div>
              <div className="flex justify-between text-base font-black text-gray-900 pt-1 border-t border-gray-200">
                <span>المطلوب سداده:</span>
                <span className="font-mono text-blue-700">{formatCurrency(grandTotal)} ر.س</span>
              </div>
            </div>

            {/* Quick 1-Click Payment Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => handleCheckout('mada')}
                disabled={cart.length === 0 || submitting}
                className="flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50"
              >
                <CreditCard className="w-4 h-4" />
                <span>{t.quickMada}</span>
              </button>

              <button
                onClick={() => handleCheckout('cash')}
                disabled={cart.length === 0 || submitting}
                className="flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50"
              >
                <Coins className="w-4 h-4" />
                <span>{t.quickCash}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
