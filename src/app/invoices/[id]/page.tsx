'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/components/common/LanguageContext';
import { A4InvoicePrint } from '@/components/invoices/A4InvoicePrint';
import { ThermalReceiptPrint } from '@/components/invoices/ThermalReceiptPrint';
import { Invoice, Client, Doctor, Hospital, Branch, InsuranceCompany } from '@/types';
import {
  ArrowLeft,
  Printer,
  Receipt,
  MessageSquare,
  Share2,
  CheckCircle2,
} from 'lucide-react';

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { lang, t } = useLanguage();

  const [data, setData] = useState<{
    invoice: Invoice;
    client?: Client;
    doctor?: Doctor;
    hospital?: Hospital;
    branch?: Branch;
    insuranceCompany?: InsuranceCompany;
  } | null>(null);

  const [printMode, setPrintMode] = useState<'a4' | 'thermal'>('a4');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetch(`/api/invoices/${params.id}`)
        .then((res) => res.json())
        .then((resData) => {
          if (resData.invoice) setData(resData);
        })
        .finally(() => setLoading(false));
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="text-center py-20 text-gray-500 font-bold text-sm">
        {t.loading}
      </div>
    );
  }

  if (!data || !data.invoice) {
    return (
      <div className="text-center py-20 text-red-500 font-bold text-sm">
        {lang === 'ar' ? 'لم يتم العثور على الفاتورة المطلوبة' : 'Invoice not found'}
      </div>
    );
  }

  const { invoice, client, doctor, hospital, branch } = data;

  // Direct WhatsApp link
  const clientPhone = client?.phone?.replace(/\D/g, '') || '';
  const saudiPhone = clientPhone.startsWith('05') ? `966${clientPhone.substring(1)}` : clientPhone;
  const whatsappMsg = encodeURIComponent(
    `مرحباً عزيزنا العميل ${client?.nameAr || ''}، نرسل لكم نسخة من فاتورتكم رقم (${invoice.invoiceNo}) بمبلغ إجمالي ${invoice.grandTotal} ر.س. شكراً لزيارتكم.`
  );
  const whatsappUrl = `https://wa.me/${saudiPhone}?text=${whatsappMsg}`;

  return (
    <div className="space-y-6">
      {/* Top Header Controls (Hidden on Print) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/invoices"
            className="p-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 transition"
          >
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </Link>
          <div>
            <h2 className="text-xl font-black text-gray-900 font-mono">
              {invoice.invoiceNo}
            </h2>
            <p className="text-xs text-gray-500">
              {lang === 'ar'
                ? `فاتورة مبيعات للمريض: ${client?.nameAr || invoice.clientId}`
                : `Invoice for patient: ${client?.nameEn || invoice.clientId}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Format Toggle Buttons */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setPrintMode('a4')}
              className={`px-3 py-1.5 rounded-lg transition ${
                printMode === 'a4'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t.a4TaxInvoice}
            </button>
            <button
              onClick={() => setPrintMode('thermal')}
              className={`px-3 py-1.5 rounded-lg transition ${
                printMode === 'thermal'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t.thermalReceipt}
            </button>
          </div>

          {/* WhatsApp Action */}
          {saudiPhone && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              <MessageSquare className="w-4 h-4" />
              <span>{t.sendWhatsapp}</span>
            </a>
          )}
        </div>
      </div>

      {/* Render Selected Printable Layout */}
      {printMode === 'a4' ? (
        <A4InvoicePrint
          invoice={invoice}
          client={client}
          doctor={doctor}
          hospital={hospital}
          branch={branch}
        />
      ) : (
        <ThermalReceiptPrint
          invoice={invoice}
          client={client}
          branch={branch}
        />
      )}
    </div>
  );
}
