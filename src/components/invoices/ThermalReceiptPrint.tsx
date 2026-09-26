'use client';

import React from 'react';
import { Invoice, Client, Branch } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Printer } from 'lucide-react';

interface ThermalReceiptPrintProps {
  invoice: Invoice;
  client?: Client;
  branch?: Branch;
}

export function ThermalReceiptPrint({
  invoice,
  client,
  branch,
}: ThermalReceiptPrintProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end print:hidden">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow transition"
        >
          <Printer className="w-4 h-4" />
          <span>طباعة الإيصال الحراري (80mm) / Thermal Receipt</span>
        </button>
      </div>

      <div className="bg-white p-5 rounded-xl border border-gray-300 shadow-sm print:shadow-none print:border-none w-[320px] mx-auto text-xs font-mono text-gray-900 leading-tight">
        {/* Header */}
        <div className="text-center border-b border-dashed border-gray-400 pb-3 mb-3">
          <div className="font-bold text-sm">شركة المعينات السمعية</div>
          <div className="text-[11px] text-gray-600">
            {branch?.nameAr || 'الفرع الرئيسي'}
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">
            الرقم الضريبي: {branch?.taxNumber || '300123456700003'}
          </div>
          <div className="text-[10px] mt-1 font-bold">فاتورة ضريبية مبسطة</div>
        </div>

        {/* Meta Info */}
        <div className="space-y-1 pb-2 border-b border-dashed border-gray-300 text-[11px]">
          <div className="flex justify-between">
            <span>رقم الفاتورة:</span>
            <span className="font-bold">{invoice.invoiceNo}</span>
          </div>
          <div className="flex justify-between">
            <span>التاريخ:</span>
            <span>{invoice.date}</span>
          </div>
          <div className="flex justify-between">
            <span>العميل:</span>
            <span>{client?.nameAr || invoice.clientId}</span>
          </div>
          <div className="flex justify-between">
            <span>الكاشير:</span>
            <span>{invoice.sellerName}</span>
          </div>
        </div>

        {/* Line Items */}
        <div className="py-2 border-b border-dashed border-gray-400 space-y-2">
          {invoice.lines.map((line) => (
            <div key={line.id} className="text-[11px]">
              <div className="font-bold">{line.itemNameAr}</div>
              <div className="flex justify-between text-gray-600">
                <span>
                  {line.quantity} × {formatCurrency(line.unitPrice)}
                </span>
                <span className="font-bold text-gray-900">
                  {formatCurrency(line.totalAmount)} ر.س
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="py-2 border-b border-dashed border-gray-400 space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span>المجموع قبل الضريبة:</span>
            <span>{formatCurrency(invoice.subtotalBeforeTax)} ر.س</span>
          </div>
          {invoice.totalDiscount > 0 && (
            <div className="flex justify-between text-red-600">
              <span>الخصم:</span>
              <span>-{formatCurrency(invoice.totalDiscount)} ر.س</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>الضريبة (15%):</span>
            <span>{formatCurrency(invoice.taxAmount)} ر.س</span>
          </div>
          <div className="flex justify-between text-sm font-black pt-1 border-t border-gray-400">
            <span>الإجمالي:</span>
            <span>{formatCurrency(invoice.grandTotal)} ر.س</span>
          </div>
          <div className="flex justify-between font-bold text-emerald-700">
            <span>المدفوع:</span>
            <span>{formatCurrency(invoice.amountPaid)} ر.س</span>
          </div>
          {invoice.remainingDue > 0 && (
            <div className="flex justify-between font-bold text-red-600">
              <span>المتبقي:</span>
              <span>{formatCurrency(invoice.remainingDue)} ر.س</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center pt-3 text-[10px] text-gray-500 space-y-1">
          <div>شكراً لزيارتكم ونتمنى لكم دوام الصحة</div>
          <div className="font-bold">يرجى الاحتفاظ بالإيصال لأغراض الضمان</div>
        </div>
      </div>
    </div>
  );
}
