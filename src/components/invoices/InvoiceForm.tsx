'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/common/LanguageContext';
import { useBranch } from '@/components/common/BranchContext';
import {
  Item,
  Client,
  Doctor,
  Hospital,
  InsuranceCompany,
  InvoiceLine,
  PaymentMethod,
  SerialUnit,
} from '@/types';
import { formatCurrency } from '@/lib/utils';
import {
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Calendar,
  Building,
  User,
  Shield,
  CreditCard,
  Printer,
  ChevronRight,
} from 'lucide-react';

export function InvoiceForm() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const { currentBranch, currentWarehouse, currentUser } = useBranch();

  // Master Data
  const [items, setItems] = useState<Item[]>([]);
  const [serials, setSerials] = useState<SerialUnit[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [insuranceCompanies, setInsuranceCompanies] = useState<InsuranceCompany[]>([]);

  // Invoice Header State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryDate, setDeliveryDate] = useState(
    new Date(Date.now() + 86400000 * 2).toISOString().replace('T', ' ').substring(0, 16)
  );
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedHospitalId, setSelectedHospitalId] = useState('');
  const [costCenter, setCostCenter] = useState('CC-RIYADH-01');
  const [workshop, setWorkshop] = useState('الورشة الفنية الداخلية - فرع الرياض');
  const [notes, setNotes] = useState('');

  // Invoice Lines State
  const [lines, setLines] = useState<InvoiceLine[]>([]);

  // Payments & Totals
  const [depositPaid, setDepositPaid] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mada');
  const [splitCash, setSplitCash] = useState<number>(0);
  const [splitMada, setSplitMada] = useState<number>(0);
  const [splitVisa, setSplitVisa] = useState<number>(0);

  // Insurance State
  const [isInsurance, setIsInsurance] = useState(false);
  const [insuranceCompanyId, setInsuranceCompanyId] = useState('');
  const [insuranceApprovalNo, setInsuranceApprovalNo] = useState('');
  const [insuranceCovered, setInsuranceCovered] = useState<number>(0);
  const [patientCopay, setPatientCopay] = useState<number>(0);

  // Status & Submit
  const [saving, setSaving] = useState(false);
  const [createdInvoiceId, setCreatedInvoiceId] = useState<string | null>(null);

  // Fetch initial data
  useEffect(() => {
    fetch('/api/branches')
      .then((res) => res.json())
      .then((data) => {
        if (data.doctors) setDoctors(data.doctors);
        if (data.hospitals) setHospitals(data.hospitals);
        if (data.insuranceCompanies) setInsuranceCompanies(data.insuranceCompanies);
      });

    fetch('/api/items')
      .then((res) => res.json())
      .then((data) => {
        if (data.items) setItems(data.items);
        if (data.serials) setSerials(data.serials);
      });

    fetch('/api/clients')
      .then((res) => res.json())
      .then((data) => {
        if (data.clients) {
          setClients(data.clients);
          if (data.clients.length > 0) {
            setSelectedClientId(data.clients[0].id);
          }
        }
      });
  }, []);

  // When client changes, auto-set their linked doctor and hospital if available
  useEffect(() => {
    const client = clients.find((c) => c.id === selectedClientId);
    if (client) {
      if (client.doctorId) setSelectedDoctorId(client.doctorId);
      if (client.hospitalId) setSelectedHospitalId(client.hospitalId);
      if (client.insuranceId) {
        setIsInsurance(true);
        setInsuranceCompanyId(client.insuranceId);
      }
    }
  }, [selectedClientId, clients]);

  // Add Item to Lines
  const handleAddItem = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const unitPrice = item.salePrice;
    const grossAmount = unitPrice * 1;
    const discountPercent = 0;
    const discountValue = 0;
    const netAmount = grossAmount - discountValue;
    const taxAmount = Number((netAmount * 0.15).toFixed(2));
    const totalAmount = Number((netAmount + taxAmount).toFixed(2));

    const availableSerials = serials
      .filter((s) => s.itemId === item.id && s.status === 'in_stock')
      .map((s) => s.serialNumber);

    const newLine: InvoiceLine = {
      id: `ln-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      itemId: item.id,
      itemCode: item.sku,
      itemNameAr: item.nameAr,
      itemNameEn: item.nameEn,
      unit: item.unit,
      quantity: 1,
      unitPrice,
      grossAmount,
      discountPercent,
      discountValue,
      netAmount,
      taxPercent: 15,
      taxAmount,
      totalAmount,
      warehouseId: currentWarehouse.id,
      serialNumbers: availableSerials.length > 0 ? [availableSerials[0]] : [],
      isDelivered: true,
      isReady: true,
      isTrial: false,
    };

    setLines([...lines, newLine]);
  };

  // Update Line item values
  const updateLine = (id: string, updates: Partial<InvoiceLine>) => {
    setLines(
      lines.map((ln) => {
        if (ln.id !== id) return ln;
        const updated = { ...ln, ...updates };

        const qty = updated.quantity || 1;
        const price = updated.unitPrice || 0;
        const gross = qty * price;
        const discPercent = updated.discountPercent || 0;
        const discValue =
          updates.discountPercent !== undefined
            ? Number(((gross * discPercent) / 100).toFixed(2))
            : updated.discountValue || 0;

        const net = gross - discValue;
        const tax = Number((net * 0.15).toFixed(2));
        const total = Number((net + tax).toFixed(2));

        return {
          ...updated,
          grossAmount: gross,
          discountValue: discValue,
          netAmount: net,
          taxAmount: tax,
          totalAmount: total,
        };
      })
    );
  };

  const removeLine = (id: string) => {
    setLines(lines.filter((ln) => ln.id !== id));
  };

  // Calculate Totals
  const subtotalBeforeTax = Number(
    lines.reduce((acc, ln) => acc + ln.netAmount, 0).toFixed(2)
  );
  const totalDiscount = Number(
    lines.reduce((acc, ln) => acc + ln.discountValue, 0).toFixed(2)
  );
  const taxAmount = Number(
    lines.reduce((acc, ln) => acc + ln.taxAmount, 0).toFixed(2)
  );
  const grandTotal = Number((subtotalBeforeTax + taxAmount).toFixed(2));
  const remainingDue = Math.max(0, Number((grandTotal - depositPaid).toFixed(2)));

  // Auto-sync split amounts
  useEffect(() => {
    if (paymentMethod === 'split') {
      setSplitMada(remainingDue);
    }
  }, [remainingDue, paymentMethod]);

  const handleSubmit = async () => {
    if (lines.length === 0) {
      alert(lang === 'ar' ? 'يرجى إضافة صنف واحد على الأقل للفاتورة' : 'Please add at least one item');
      return;
    }
    if (!selectedClientId) {
      alert(lang === 'ar' ? 'يرجى اختيار العميل / المريض' : 'Please select a client');
      return;
    }

    setSaving(true);
    try {
      const invoicePayload = {
        date,
        deliveryDate,
        branchId: currentBranch.id,
        warehouseId: currentWarehouse.id,
        costCenter,
        workshop,
        clientId: selectedClientId,
        doctorId: selectedDoctorId || undefined,
        hospitalId: selectedHospitalId || undefined,
        sellerName: currentUser.nameAr,
        lines,
        subtotalBeforeTax,
        totalDiscount,
        taxAmount,
        grandTotal,
        depositPaid,
        amountPaid: depositPaid,
        remainingDue,
        paymentMethod,
        paymentDetails:
          paymentMethod === 'split'
            ? {
                cashAmount: splitCash,
                madaAmount: splitMada,
                visaAmount: splitVisa,
                insuranceAmount: 0,
                depositAmount: depositPaid,
              }
            : undefined,
        isInsurance,
        insuranceDetails: isInsurance
          ? {
              companyId: insuranceCompanyId,
              approvalNo: insuranceApprovalNo,
              coveredAmount: insuranceCovered,
              patientCopay,
            }
          : undefined,
        deliveryStatus: lines.some((l) => l.isTrial)
          ? 'trial'
          : lines.every((l) => l.isDelivered)
          ? 'delivered'
          : 'ready',
        notes,
      };

      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoicePayload),
      });

      const data = await res.json();
      if (res.ok) {
        setCreatedInvoiceId(data.invoice.id);
        router.push(`/invoices/${data.invoice.id}`);
      }
    } catch (e) {
      console.error(e);
      alert('Error creating invoice');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h2 className="text-xl font-black text-gray-900">
            {lang === 'ar' ? 'فاتورة مبيعات ومعينات سمعية جديدة' : 'New Hearing Aid Sales Invoice'}
          </h2>
          <p className="text-xs text-gray-500">
            {lang === 'ar'
              ? 'شاشة إصدار الفواتير الطبية والمبيعات النقدية والتأمين بموجب مواصفات النظام المعتمد'
              : 'Clinical hearing aid invoice with doctor referrals, earmolds, serial tracking, and VAT'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/invoices')}
            className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white hover:bg-gray-100 border border-gray-300 rounded-xl transition"
          >
            {t.cancel}
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? t.loading : t.saveInvoice}</span>
          </button>
        </div>
      </div>

      {/* Invoice Header Section (Legacy Layout) */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="text-xs font-bold text-blue-900 uppercase tracking-wider pb-2 border-b border-gray-100 flex items-center gap-2">
          <Building className="w-4 h-4 text-blue-600" />
          <span>{lang === 'ar' ? 'بيانات رأس الفاتورة والعميل' : 'Invoice Header & Client Info'}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          {/* Client Selector */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              {t.clientInfo} <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 font-medium focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">{t.selectClient}</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameAr} ({c.phone}) - {c.fileNo}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">{t.invoiceDate}</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 font-mono focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Delivery Date */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">{t.deliveryDate}</label>
            <input
              type="text"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 font-mono focus:ring-2 focus:ring-blue-500"
              placeholder="YYYY-MM-DD HH:MM"
            />
          </div>

          {/* Seller Rep */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">{t.sellerRep}</label>
            <input
              type="text"
              value={currentUser.nameAr}
              disabled
              className="w-full border border-gray-200 rounded-lg p-2 bg-gray-50 text-gray-600 font-semibold"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs pt-2">
          {/* Referring Doctor */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">{t.referringDoctor}</label>
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">{lang === 'ar' ? 'بدون طبيب محول' : 'No Referring Doctor'}</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nameAr} ({d.commissionPercent}%)
                </option>
              ))}
            </select>
          </div>

          {/* Hospital / Clinic */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">{t.hospital}</label>
            <select
              value={selectedHospitalId}
              onChange={(e) => setSelectedHospitalId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">{lang === 'ar' ? 'اختر المستشفى...' : 'Select Hospital...'}</option>
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.nameAr}
                </option>
              ))}
            </select>
          </div>

          {/* Cost Center */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">{t.costCenter}</label>
            <input
              type="text"
              value={costCenter}
              onChange={(e) => setCostCenter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Workshop / Lab */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">{t.workshopLab}</label>
            <input
              type="text"
              value={workshop}
              onChange={(e) => setWorkshop(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Item Quick-Add Selector */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex-1 w-full flex items-center gap-3">
          <select
            onChange={(e) => {
              if (e.target.value) {
                handleAddItem(e.target.value);
                e.target.value = '';
              }
            }}
            className="w-full border border-gray-300 rounded-xl p-2.5 text-xs font-semibold focus:ring-2 focus:ring-blue-500 bg-white shadow-xs"
          >
            <option value="">{t.itemSearchPlaceholder}</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                [{i.sku}] {i.nameAr} - {formatCurrency(i.salePrice)} ر.س (
                {lang === 'ar' ? 'المخزون:' : 'Stock:'}{' '}
                {i.stockByWarehouse[currentWarehouse.id] || 0})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Line Items Table (Faithful to Screenshot) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-3.5 bg-slate-900 text-white font-bold text-xs flex justify-between items-center">
          <span>{lang === 'ar' ? 'جدول الأصناف والخدمات' : 'Invoice Line Items'}</span>
          <span className="text-slate-400 font-mono text-[11px]">{lines.length} Items</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-center border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-gray-200">
              <tr>
                <th className="p-2.5 text-center w-8">#</th>
                <th className="p-2.5 text-start">{t.itemName}</th>
                <th className="p-2.5 w-16">{t.quantity}</th>
                <th className="p-2.5 w-24">{t.price}</th>
                <th className="p-2.5 w-20">{t.discountPercent}</th>
                <th className="p-2.5 w-24">{t.discountValue}</th>
                <th className="p-2.5 w-24">{t.net}</th>
                <th className="p-2.5 w-20">{t.tax}</th>
                <th className="p-2.5 w-28">{t.finalTotal}</th>
                <th className="p-2.5 w-36">{t.serialNumber}</th>
                <th className="p-2.5 w-44">{t.deliveryFlags}</th>
                <th className="p-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-gray-400 font-medium">
                    {lang === 'ar'
                      ? 'لا توجد أصناف مضافة. اختر صنفاً من القائمة أعلاه لإضافته للفاتورة.'
                      : 'No items added. Select an item above to add to this invoice.'}
                  </td>
                </tr>
              ) : (
                lines.map((line, idx) => {
                  const item = items.find((i) => i.id === line.itemId);
                  const availableSerials = serials.filter(
                    (s) => s.itemId === line.itemId && (s.status === 'in_stock' || line.serialNumbers?.includes(s.serialNumber))
                  );

                  return (
                    <tr key={line.id} className="hover:bg-blue-50/30 transition">
                      <td className="p-2 font-mono text-gray-500">{idx + 1}</td>
                      {/* Name & SKU */}
                      <td className="p-2 text-start">
                        <div className="font-bold text-gray-900">{line.itemNameAr}</div>
                        <div className="text-[10px] text-gray-500 font-mono">{line.itemCode}</div>
                      </td>
                      {/* Qty */}
                      <td className="p-2">
                        <input
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={(e) =>
                            updateLine(line.id, { quantity: Math.max(1, Number(e.target.value)) })
                          }
                          className="w-14 text-center font-mono border border-gray-300 rounded p-1"
                        />
                      </td>
                      {/* Price */}
                      <td className="p-2">
                        <input
                          type="number"
                          value={line.unitPrice}
                          onChange={(e) =>
                            updateLine(line.id, { unitPrice: Number(e.target.value) })
                          }
                          className="w-20 text-center font-mono border border-gray-300 rounded p-1"
                        />
                      </td>
                      {/* Discount % */}
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={line.discountPercent}
                          onChange={(e) =>
                            updateLine(line.id, { discountPercent: Number(e.target.value) })
                          }
                          className="w-16 text-center font-mono border border-gray-300 rounded p-1"
                        />
                      </td>
                      {/* Discount Val */}
                      <td className="p-2 font-mono text-red-600">
                        {formatCurrency(line.discountValue)}
                      </td>
                      {/* Net */}
                      <td className="p-2 font-mono font-semibold text-gray-800">
                        {formatCurrency(line.netAmount)}
                      </td>
                      {/* Tax */}
                      <td className="p-2 font-mono text-gray-600">
                        {formatCurrency(line.taxAmount)}
                      </td>
                      {/* Total */}
                      <td className="p-2 font-mono font-bold text-blue-900">
                        {formatCurrency(line.totalAmount)}
                      </td>
                      {/* Serial Number Picker */}
                      <td className="p-2">
                        {item?.hasSerials ? (
                          <select
                            value={line.serialNumbers?.[0] || ''}
                            onChange={(e) =>
                              updateLine(line.id, { serialNumbers: [e.target.value] })
                            }
                            className="w-full text-[10px] font-mono border border-blue-300 rounded p-1 bg-blue-50 text-blue-900"
                          >
                            <option value="">{lang === 'ar' ? 'اختر الرقم التسلسلي...' : 'Select S/N...'}</option>
                            {availableSerials.map((s) => (
                              <option key={s.id} value={s.serialNumber}>
                                {s.serialNumber}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-gray-400 text-[10px]">-</span>
                        )}
                      </td>
                      {/* Delivery Checkboxes */}
                      <td className="p-2">
                        <div className="flex items-center justify-center gap-2 text-[10px]">
                          <label className="flex items-center gap-1 cursor-pointer" title="تم التسليم">
                            <input
                              type="checkbox"
                              checked={line.isDelivered}
                              onChange={(e) =>
                                updateLine(line.id, { isDelivered: e.target.checked })
                              }
                              className="rounded text-blue-600"
                            />
                            <span>تسليم</span>
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer" title="جاهز للتسليم">
                            <input
                              type="checkbox"
                              checked={line.isReady}
                              onChange={(e) =>
                                updateLine(line.id, { isReady: e.target.checked })
                              }
                              className="rounded text-amber-600"
                            />
                            <span>جاهز</span>
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer text-purple-700 font-bold" title="خطاب تجربة">
                            <input
                              type="checkbox"
                              checked={line.isTrial}
                              onChange={(e) =>
                                updateLine(line.id, { isTrial: e.target.checked })
                              }
                              className="rounded text-purple-600"
                            />
                            <span>تجربة</span>
                          </label>
                        </div>
                      </td>
                      {/* Delete */}
                      <td className="p-2">
                        <button
                          onClick={() => removeLine(line.id)}
                          className="text-gray-400 hover:text-red-600 p-1 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insurance & Payment Details Split */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Insurance & Split payment options */}
        <div className="md:col-span-6 space-y-4">
          {/* Insurance Toggle Box */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs text-gray-800">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>{t.insuranceInvoicing}</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isInsurance}
                  onChange={(e) => setIsInsurance(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {isInsurance && (
              <div className="grid grid-cols-2 gap-3 pt-2 text-xs border-t border-gray-100">
                <div>
                  <label className="block text-gray-600 mb-1">{t.insuranceCompany}</label>
                  <select
                    value={insuranceCompanyId}
                    onChange={(e) => setInsuranceCompanyId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-1.5 bg-white"
                  >
                    <option value="">{lang === 'ar' ? 'اختر شركة التأمين...' : 'Select company...'}</option>
                    {insuranceCompanies.map((ic) => (
                      <option key={ic.id} value={ic.id}>
                        {ic.nameAr} ({ic.defaultCoveragePercent}%)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-600 mb-1">{t.approvalNumber}</label>
                  <input
                    type="text"
                    value={insuranceApprovalNo}
                    onChange={(e) => setInsuranceApprovalNo(e.target.value)}
                    placeholder="APP-8942-X"
                    className="w-full border border-gray-300 rounded-lg p-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 mb-1">{t.coveredAmount}</label>
                  <input
                    type="number"
                    value={insuranceCovered}
                    onChange={(e) => setInsuranceCovered(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg p-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 mb-1">{t.patientCopay}</label>
                  <input
                    type="number"
                    value={patientCopay}
                    onChange={(e) => setPatientCopay(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg p-1.5 font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Payment Method Selector */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
            <div className="font-bold text-xs text-gray-800 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-600" />
              <span>{t.paymentMethod}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              {[
                { id: 'mada', label: t.payMada },
                { id: 'cash', label: t.payCash },
                { id: 'visa', label: t.payVisa },
                { id: 'bank_transfer', label: t.payBank },
                { id: 'insurance', label: t.payInsurance },
                { id: 'split', label: t.paySplit },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                  className={`p-2 rounded-xl border text-center font-bold transition ${
                    paymentMethod === m.id
                      ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Split breakdown inputs */}
            {paymentMethod === 'split' && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="font-bold text-slate-800">{t.paymentSplitBreakdown}</div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500">{t.payCash}</label>
                    <input
                      type="number"
                      value={splitCash}
                      onChange={(e) => setSplitCash(Number(e.target.value))}
                      className="w-full border border-gray-300 rounded p-1 font-mono text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500">{t.payMada}</label>
                    <input
                      type="number"
                      value={splitMada}
                      onChange={(e) => setSplitMada(Number(e.target.value))}
                      className="w-full border border-gray-300 rounded p-1 font-mono text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500">{t.payVisa}</label>
                    <input
                      type="number"
                      value={splitVisa}
                      onChange={(e) => setSplitVisa(Number(e.target.value))}
                      className="w-full border border-gray-300 rounded p-1 font-mono text-center"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Totals & Balance Panel (Legacy Faithful) */}
        <div className="md:col-span-6">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3 text-xs">
            <div className="font-bold text-xs text-gray-900 pb-2 border-b border-gray-100 uppercase tracking-wider">
              {lang === 'ar' ? 'ملخص الحسابات والضرائب' : 'Financial Summary & Due'}
            </div>

            <div className="flex justify-between text-gray-600">
              <span>{t.subtotalBeforeTax}:</span>
              <span className="font-mono font-semibold">{formatCurrency(subtotalBeforeTax)} ر.س</span>
            </div>

            {totalDiscount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>{t.totalDiscount}:</span>
                <span className="font-mono font-semibold">-{formatCurrency(totalDiscount)} ر.س</span>
              </div>
            )}

            <div className="flex justify-between text-gray-600">
              <span>{t.taxAmount}:</span>
              <span className="font-mono font-semibold">{formatCurrency(taxAmount)} ر.س</span>
            </div>

            <div className="flex justify-between text-base font-black text-gray-950 pt-2 border-t border-gray-200">
              <span>{t.grandTotal}:</span>
              <span className="font-mono text-blue-700">{formatCurrency(grandTotal)} ر.س</span>
            </div>

            {/* Deposit Paid Input */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className="font-bold text-emerald-700">{t.depositPaid}:</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  max={grandTotal}
                  value={depositPaid}
                  onChange={(e) => setDepositPaid(Number(e.target.value))}
                  className="w-28 text-end font-mono font-bold text-emerald-800 border border-emerald-300 rounded-lg p-1.5 bg-emerald-50/50"
                />
                <span className="text-gray-500">ر.س</span>
              </div>
            </div>

            {/* Remaining Due */}
            <div className="flex justify-between text-sm font-black pt-2 border-t-2 border-dashed border-gray-200 text-red-600">
              <span>{t.remainingDue}:</span>
              <span className="font-mono">{formatCurrency(remainingDue)} ر.س</span>
            </div>

            {/* Action Bar */}
            <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? t.loading : t.saveInvoice}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
