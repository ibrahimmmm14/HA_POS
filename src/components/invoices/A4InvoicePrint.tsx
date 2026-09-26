'use client';

import React from 'react';
import { Invoice, Client, Doctor, Hospital, Branch } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { generateZatcaTlvBase64 } from '@/lib/zatcaQr';
import { Printer, Volume2 } from 'lucide-react';

interface A4InvoicePrintProps {
  invoice: Invoice;
  client?: Client;
  doctor?: Doctor;
  hospital?: Hospital;
  branch?: Branch;
}

export function A4InvoicePrint({
  invoice,
  client,
  doctor,
  hospital,
  branch,
}: A4InvoicePrintProps) {
  const handlePrint = () => {
    window.print();
  };

  const sellerName = branch?.nameAr || 'مركز المعينات السمعية المتطور';
  const vatNumber = branch?.taxNumber || '300123456700003';
  const qrBase64 = generateZatcaTlvBase64(
    sellerName,
    vatNumber,
    invoice.date,
    invoice.grandTotal.toString(),
    invoice.taxAmount.toString()
  );

  return (
    <div className="space-y-4">
      {/* Print Action Button */}
      <div className="flex justify-end print:hidden">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md transition"
        >
          <Printer className="w-4 h-4" />
          <span>طباعة الفاتورة الضريبية الرسمية (A4) / Print Tax Invoice</span>
        </button>
      </div>

      {/* A4 Document Container */}
      <div className="bg-white p-8 rounded-2xl border border-gray-300 shadow-sm print:shadow-none print:border-none max-w-[850px] mx-auto text-gray-900 print:p-0">
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-gray-900 pb-5 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
              <Volume2 className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-950">
                شركة المعينات السمعية المتقدمة
              </h1>
              <p className="text-xs font-semibold text-gray-600">
                Advanced Hearing Aids & Audiology Medical Co.
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                الرقم الضريبي (VAT No): <span className="font-mono font-bold text-gray-900">{vatNumber}</span>
              </p>
            </div>
          </div>

          <div className="text-end">
            <div className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-bold rounded-md uppercase tracking-wider mb-1">
              فاتورة ضريبية / TAX INVOICE
            </div>
            <div className="font-mono text-base font-black text-blue-700">
              {invoice.invoiceNo}
            </div>
            <div className="text-xs text-gray-600">
              التاريخ: <span className="font-mono">{invoice.date}</span>
            </div>
          </div>
        </div>

        {/* Info Grid: Branch & Client Information */}
        <div className="grid grid-cols-2 gap-4 text-xs mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
          {/* Client Details */}
          <div className="space-y-1 border-e border-slate-200 pe-4">
            <div className="font-bold text-slate-900 text-sm mb-1 pb-1 border-b border-slate-200">
              بيانات المريض / Client Details
            </div>
            <div>
              <span className="text-gray-500">الاسم / Name: </span>
              <span className="font-bold text-gray-900">{client?.nameAr || invoice.clientId}</span>
            </div>
            <div>
              <span className="text-gray-500">رقم الملف / File #: </span>
              <span className="font-mono font-semibold">{client?.fileNo || '-'}</span>
            </div>
            <div>
              <span className="text-gray-500">الهوية الوطنية / ID: </span>
              <span className="font-mono">{client?.nationalId || '-'}</span>
            </div>
            <div>
              <span className="text-gray-500">الجوال / Mobile: </span>
              <span className="font-mono">{client?.phone || '-'}</span>
            </div>
          </div>

          {/* Operation & Branch Details */}
          <div className="space-y-1 ps-2">
            <div className="font-bold text-slate-900 text-sm mb-1 pb-1 border-b border-slate-200">
              تفاصيل العملية / Operation Info
            </div>
            <div>
              <span className="text-gray-500">الفرع / Branch: </span>
              <span className="font-semibold">{branch?.nameAr || 'الفرع الرئيسي'}</span>
            </div>
            <div>
              <span className="text-gray-500">البائع / Seller: </span>
              <span>{invoice.sellerName}</span>
            </div>
            <div>
              <span className="text-gray-500">الطبيب المعالج / Doctor: </span>
              <span className="font-semibold">{doctor?.nameAr || '-'}</span>
            </div>
            <div>
              <span className="text-gray-500">المستشفى / Hospital: </span>
              <span>{hospital?.nameAr || '-'}</span>
            </div>
            <div>
              <span className="text-gray-500">موعد التسليم / Delivery: </span>
              <span className="font-mono">{invoice.deliveryDate || '-'}</span>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="border border-gray-300 rounded-xl overflow-hidden mb-6">
          <table className="w-full text-xs text-start">
            <thead className="bg-slate-900 text-white font-bold">
              <tr>
                <th className="p-2.5 text-center w-8">#</th>
                <th className="p-2.5 text-start">الصنف / Item</th>
                <th className="p-2.5 text-center">الكمية</th>
                <th className="p-2.5 text-center">السعر</th>
                <th className="p-2.5 text-center">خصم</th>
                <th className="p-2.5 text-center">الصافي</th>
                <th className="p-2.5 text-center">الضريبة 15%</th>
                <th className="p-2.5 text-end">الإجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoice.lines.map((line, idx) => (
                <tr key={line.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <td className="p-2.5 text-center font-mono text-gray-500">{idx + 1}</td>
                  <td className="p-2.5">
                    <div className="font-bold text-gray-900">{line.itemNameAr}</div>
                    <div className="text-[10px] text-gray-500 font-mono">
                      {line.itemCode}
                      {line.serialNumbers && line.serialNumbers.length > 0 && (
                        <span className="text-blue-600 font-bold ms-2">
                          [S/N: {line.serialNumbers.join(', ')}]
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-2.5 text-center font-mono font-semibold">{line.quantity}</td>
                  <td className="p-2.5 text-center font-mono">{formatCurrency(line.unitPrice)}</td>
                  <td className="p-2.5 text-center font-mono text-red-600">
                    {line.discountValue > 0 ? formatCurrency(line.discountValue) : '0.00'}
                  </td>
                  <td className="p-2.5 text-center font-mono">{formatCurrency(line.netAmount)}</td>
                  <td className="p-2.5 text-center font-mono">{formatCurrency(line.taxAmount)}</td>
                  <td className="p-2.5 text-end font-mono font-bold text-gray-950">
                    {formatCurrency(line.totalAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bottom Section: Delivery Flags, ZATCA QR, Totals Panel */}
        <div className="grid grid-cols-12 gap-6 items-start mb-6">
          {/* Delivery Status & QR Code */}
          <div className="col-span-6 space-y-4">
            {/* Delivery Checkboxes (Faithful to legacy screenshot) */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="font-bold text-slate-800">حالة التسليم والضمان / Delivery & Status</div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-1.5 cursor-default">
                  <input
                    type="checkbox"
                    checked={invoice.deliveryStatus === 'delivered'}
                    readOnly
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span className="font-semibold text-gray-800">تم التسليم (Delivered)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-default">
                  <input
                    type="checkbox"
                    checked={invoice.deliveryStatus === 'ready'}
                    readOnly
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span className="font-semibold text-gray-800">جاهز للتسليم</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-default">
                  <input
                    type="checkbox"
                    checked={invoice.deliveryStatus === 'trial'}
                    readOnly
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span className="font-semibold text-gray-800">خطاب تجربة</span>
                </label>
              </div>
            </div>

            {/* ZATCA QR Code placeholder graphic */}
            <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl">
              <div className="w-24 h-24 bg-slate-900 p-1.5 rounded-lg flex flex-col justify-between">
                <div className="grid grid-cols-5 gap-1 w-full h-full bg-white p-1">
                  <div className="bg-black col-span-2 row-span-2"></div>
                  <div className="bg-black"></div>
                  <div className="bg-black col-span-2 row-span-2"></div>
                  <div className="bg-black"></div>
                  <div className="bg-black"></div>
                  <div className="bg-black"></div>
                  <div className="bg-black col-span-2 row-span-2"></div>
                  <div className="bg-black"></div>
                  <div className="bg-black"></div>
                </div>
              </div>
              <div className="text-[11px] text-gray-600">
                <div className="font-bold text-gray-900 mb-0.5">رمز التحقق الإلكتروني (ZATCA QR)</div>
                <div>مشفر وفق معايير هيئة الزكاة والضريبة والجمارك</div>
                <div className="font-mono text-[9px] text-gray-400 truncate max-w-[200px]">
                  TLV: {qrBase64.substring(0, 28)}...
                </div>
              </div>
            </div>
          </div>

          {/* Totals Panel */}
          <div className="col-span-6 bg-slate-50 border border-slate-300 rounded-xl p-4 text-xs space-y-2">
            <div className="flex justify-between text-gray-700">
              <span>المجموع قبل الضريبة / Subtotal:</span>
              <span className="font-mono font-semibold">{formatCurrency(invoice.subtotalBeforeTax)} ر.س</span>
            </div>
            {invoice.totalDiscount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>إجمالي الخصم / Total Discount:</span>
                <span className="font-mono font-semibold">-{formatCurrency(invoice.totalDiscount)} ر.س</span>
              </div>
            )}
            <div className="flex justify-between text-gray-700">
              <span>ضريبة القيمة المضافة (15%) / VAT:</span>
              <span className="font-mono font-semibold">{formatCurrency(invoice.taxAmount)} ر.س</span>
            </div>
            <div className="flex justify-between text-base font-black text-slate-950 pt-2 border-t-2 border-slate-300">
              <span>الإجمالي المستحق / Grand Total:</span>
              <span className="font-mono text-blue-700">{formatCurrency(invoice.grandTotal)} ر.س</span>
            </div>

            {/* Payments breakdown */}
            <div className="pt-2 border-t border-slate-200 space-y-1">
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>الدفعة المقدمة / Deposit Paid:</span>
                <span className="font-mono">{formatCurrency(invoice.depositPaid)} ر.س</span>
              </div>
              <div className="flex justify-between text-emerald-800 font-bold">
                <span>المدفوع / Paid Now:</span>
                <span className="font-mono">{formatCurrency(invoice.amountPaid)} ر.س</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-red-700 pt-1 border-t border-dashed border-slate-300">
                <span>المتبقي / Remaining Balance:</span>
                <span className="font-mono">{formatCurrency(invoice.remainingDue)} ر.س</span>
              </div>
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8 text-xs pt-8 border-t border-gray-300 text-center">
          <div>
            <div className="font-bold text-gray-800 mb-10">توقيع البائع / Sales Signature</div>
            <div className="border-t border-gray-400 w-48 mx-auto"></div>
          </div>
          <div>
            <div className="font-bold text-gray-800 mb-10">
              إقرار واستلام العميل / Client Acceptance
            </div>
            <div className="border-t border-gray-400 w-48 mx-auto"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
