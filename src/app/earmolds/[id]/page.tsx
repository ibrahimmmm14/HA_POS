'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/components/common/LanguageContext';
import { LabOrderPrint } from '@/components/earmolds/LabOrderPrint';
import { EarmoldOrder, Client } from '@/types';
import { formatCurrency } from '@/lib/utils';
import {
  ArrowLeft,
  Scissors,
  Receipt,
  MessageSquare,
  CheckCircle2,
  Clock,
  Send,
  Printer,
  Pencil,
} from 'lucide-react';

export default function EarmoldDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { lang, t } = useLanguage();

  const [order, setOrder] = useState<EarmoldOrder | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const fetchOrder = () => {
    if (params.id) {
      fetch(`/api/earmolds/${params.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.order) setOrder(data.order);
          if (data.client) setClient(data.client);
        })
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [params.id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!order) return;
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/earmolds/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchOrder();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleConvertToInvoice = async () => {
    if (!order) return;
    setConverting(true);
    try {
      const res = await fetch(`/api/earmolds/${order.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok && data.invoice) {
        router.push(`/invoices/${data.invoice.id}`);
      }
    } catch (e) {
      console.error(e);
      alert('Error converting order to invoice');
    } finally {
      setConverting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20 text-gray-500 font-bold text-sm">
        {t.loading}
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-20 text-red-500 font-bold text-sm">
        {lang === 'ar' ? 'طلب المعمل غير موجود' : 'Order not found'}
      </div>
    );
  }

  // Direct WhatsApp link
  const clientPhone = client?.phone?.replace(/\D/g, '') || '';
  const saudiPhone = clientPhone.startsWith('05') ? `966${clientPhone.substring(1)}` : clientPhone;
  const whatsappMsg = encodeURIComponent(
    `مرحباً عزيزنا العميل ${client?.nameAr || ''}، نود إبلاغكم بأن طلبكم رقم (${order.orderNo}) الخاص بالقالب/السماعة أصبح جاهزاً للاستلام والتجربة. نتشرف بزيارتكم.`
  );
  const whatsappUrl = `https://wa.me/${saudiPhone}?text=${whatsappMsg}`;

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/earmolds"
            className="p-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 transition"
          >
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </Link>
          <div>
            <h2 className="text-xl font-black text-gray-900 font-mono">
              {order.orderNo}
            </h2>
            <p className="text-xs text-gray-500">
              {lang === 'ar'
                ? `طلب تصنيع للمريض: ${client?.nameAr || order.clientId}`
                : `Lab order for patient: ${client?.nameEn || order.clientId}`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href={`/earmolds/${order.id}/edit`}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 text-xs font-bold rounded-xl shadow-xs transition"
          >
            <Pencil className="w-4 h-4" />
            <span>{lang === 'ar' ? 'تعديل الطلب' : 'Edit Order'}</span>
          </Link>

          {/* Status Dropdown */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-300 rounded-xl px-2.5 py-1.5 text-xs font-semibold">
            <span className="text-gray-500">{t.status}:</span>
            <select
              value={order.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={statusUpdating}
              className="bg-transparent font-bold text-purple-900 focus:outline-none cursor-pointer"
            >
              <option value="pending">{t.statusPending}</option>
              <option value="sent_to_lab">{t.statusSentToLab}</option>
              <option value="in_production">{t.statusInProduction}</option>
              <option value="ready">{t.statusReady}</option>
              <option value="delivered">{t.statusDelivered}</option>
            </select>
          </div>

          {/* WhatsApp Direct Notification */}
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

          {/* Convert to Invoice Button */}
          {order.invoiceId ? (
            <Link
              href={`/invoices/${order.invoiceId}`}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold rounded-xl shadow-xs transition"
            >
              <Receipt className="w-4 h-4" />
              <span>{lang === 'ar' ? 'عرض الفاتورة المرتبطة' : 'View Linked Invoice'}</span>
            </Link>
          ) : (
            <button
              onClick={handleConvertToInvoice}
              disabled={converting}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50"
            >
              <Receipt className="w-4 h-4" />
              <span>{converting ? t.loading : t.convertOrderToInvoice}</span>
            </button>
          )}
        </div>
      </div>

      {/* Printable Lab Order Slip */}
      <LabOrderPrint order={order} client={client || undefined} />
    </div>
  );
}
