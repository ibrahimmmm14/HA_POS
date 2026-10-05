'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useLanguage } from '@/components/common/LanguageContext';
import { formatCurrency } from '@/lib/utils';
import {
  REPAIR_STATUS_LABELS,
  REPAIR_STATUS_COLORS,
  REPAIR_TRANSITIONS,
  isRepairOverdue,
} from '@/lib/repairs';
import type { Client, RepairTicket, RepairStatus } from '@/types';
import { ArrowLeft, Wrench, ShieldCheck, AlertTriangle, History, Send } from 'lucide-react';

type DeviceHistoryRow = Pick<RepairTicket, 'id' | 'ticketNo' | 'receivedAt' | 'issue' | 'status'>;

export default function RepairDetailPage() {
  const params = useParams();
  const { lang, t } = useLanguage();

  const [ticket, setTicket] = useState<RepairTicket | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [deviceHistory, setDeviceHistory] = useState<DeviceHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [note, setNote] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [error, setError] = useState('');

  const fetchTicket = () => {
    if (!params.id) return;
    fetch(`/api/repairs/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.ticket) {
          setTicket(data.ticket);
          setDiagnosis(data.ticket.diagnosis || '');
        }
        if (data.client) setClient(data.client);
        if (data.deviceHistory) setDeviceHistory(data.deviceHistory);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTicket();
  }, [params.id]);

  const update = async (payload: Record<string, unknown>) => {
    if (!ticket) return;
    setUpdating(true);
    setError('');
    try {
      const res = await fetch(`/api/repairs/${ticket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Error');
        return;
      }
      setNote('');
      fetchTicket();
    } finally {
      setUpdating(false);
    }
  };

  const label = (s?: string | null) =>
    s ? REPAIR_STATUS_LABELS[s as RepairStatus]?.[lang === 'ar' ? 'ar' : 'en'] || s : '';

  if (loading) {
    return <div className="py-12 text-center text-gray-400 text-sm">{t.loading}</div>;
  }
  if (!ticket) {
    return <div className="py-12 text-center text-gray-400 text-sm">{t.noData}</div>;
  }

  const nextStatuses = REPAIR_TRANSITIONS[ticket.status] || [];
  const overdue = isRepairOverdue(ticket);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Link href="/repairs" className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition">
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          </Link>
          <div>
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <Wrench className="w-6 h-6 text-orange-600" />
              <span className="font-mono">{ticket.ticketNo}</span>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${REPAIR_STATUS_COLORS[ticket.status]}`}>
                {label(ticket.status)}
              </span>
            </h2>
            {client && (
              <Link href={`/clients/${client.id}`} className="text-xs text-blue-600 hover:underline">
                {client.fileNo} · {lang === 'ar' ? client.nameAr : client.nameEn} · {client.phone}
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket details & actions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <Info label={lang === 'ar' ? 'الجهاز' : 'Device'} value={`${ticket.deviceBrand} ${ticket.deviceModel}`} />
            <Info label={lang === 'ar' ? 'الرقم التسلسلي' : 'Serial number'} value={ticket.serialNumber || '—'} mono />
            <Info
              label={t.earSide}
              value={ticket.ear === 'both' ? t.earBoth : ticket.ear === 'left' ? t.earLeft : t.earRight}
            />
            <Info label={lang === 'ar' ? 'تاريخ الاستلام' : 'Received'} value={ticket.receivedAt} mono />
            <Info
              label={lang === 'ar' ? 'موعد التسليم المتوقع' : 'Expected ready'}
              value={ticket.expectedDate || '—'}
              mono
              warn={overdue}
            />
            <Info label={lang === 'ar' ? 'تاريخ التسليم' : 'Delivered'} value={ticket.completedAt || '—'} mono />
            <Info
              label={lang === 'ar' ? 'جهة الإصلاح' : 'Repaired by'}
              value={
                ticket.repairedBy === 'manufacturer'
                  ? lang === 'ar' ? 'الوكيل / المصنع' : 'Manufacturer / agent'
                  : lang === 'ar' ? 'ورشة المركز' : 'In-house workshop'
              }
            />
            <div className="space-y-1">
              <div className="text-gray-500 font-bold">{lang === 'ar' ? 'الضمان' : 'Warranty'}</div>
              {ticket.underWarranty ? (
                <div className="flex items-center gap-1 font-bold text-emerald-700">
                  <ShieldCheck className="w-4 h-4" />
                  {lang === 'ar' ? 'داخل الضمان' : 'Under warranty'}
                </div>
              ) : (
                <div className="font-bold text-gray-900">{lang === 'ar' ? 'خارج الضمان' : 'Out of warranty'}</div>
              )}
            </div>
            <Info
              label={lang === 'ar' ? 'رسوم الإصلاح' : 'Repair charge'}
              value={`${formatCurrency(ticket.charge)} ر.س`}
              mono
            />
            <div className="col-span-2 md:col-span-3 space-y-1">
              <div className="text-gray-500 font-bold">{lang === 'ar' ? 'العطل المبلغ عنه' : 'Reported fault'}</div>
              <div className="text-gray-900">{ticket.issue}</div>
            </div>
          </div>

          {/* Diagnosis */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3 text-xs">
            <div className="font-bold text-gray-900">{lang === 'ar' ? 'التشخيص الفني' : 'Technician diagnosis'}</div>
            <textarea
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              rows={3}
              disabled={nextStatuses.length === 0}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
            />
            {nextStatuses.length > 0 && (
              <button
                onClick={() => update({ diagnosis })}
                disabled={updating || diagnosis === (ticket.diagnosis || '')}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-700 disabled:opacity-40 text-white font-bold rounded-xl"
              >
                {t.save}
              </button>
            )}
          </div>

          {/* Status change */}
          {nextStatuses.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3 text-xs">
              <div className="font-bold text-gray-900">
                {lang === 'ar' ? 'تحديث الحالة أو إضافة ملاحظة' : 'Move status or add a note'}
              </div>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={lang === 'ar' ? 'ملاحظة تُحفظ في سجل التذكرة (اختياري)' : 'Note saved to ticket history (optional)'}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
              />
              <div className="flex flex-wrap gap-2">
                {nextStatuses.map((s) => (
                  <button
                    key={s}
                    onClick={() => update({ status: s, note })}
                    disabled={updating}
                    className={`px-3 py-2 rounded-xl font-bold transition disabled:opacity-40 ${REPAIR_STATUS_COLORS[s]} hover:brightness-95`}
                  >
                    → {label(s)}
                  </button>
                ))}
                <button
                  onClick={() => update({ note })}
                  disabled={updating || !note.trim()}
                  className="px-3 py-2 rounded-xl font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 inline-flex items-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  {lang === 'ar' ? 'حفظ الملاحظة فقط' : 'Add note only'}
                </button>
              </div>
              {ticket.status !== 'ready' && nextStatuses.includes('ready') && (
                <p className="text-[11px] text-gray-500">
                  {lang === 'ar'
                    ? 'عند التحويل إلى "جاهز للاستلام" تُرسل رسالة واتساب للمريض تلقائياً.'
                    : 'Moving to "Ready for Pickup" sends the patient a WhatsApp notice automatically.'}
                </p>
              )}
              {error && <p className="text-red-600 font-bold">{error}</p>}
            </div>
          )}
        </div>

        {/* History */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs text-xs">
            <div className="font-bold text-gray-900 flex items-center gap-2 mb-4">
              <History className="w-4 h-4 text-orange-600" />
              {lang === 'ar' ? 'سجل التذكرة' : 'Ticket history'}
            </div>
            <ol className="space-y-4 border-s-2 border-orange-100 ps-4">
              {(ticket.events || []).map((ev, i) => (
                <li key={ev.id} className="relative">
                  <span className="absolute -start-[21px] top-1 w-2.5 h-2.5 rounded-full bg-orange-500" />
                  <div className="font-mono text-[10px] text-gray-500">
                    {ev.timestamp} · {ev.userName}
                  </div>
                  <div className="font-bold text-gray-900">
                    {ev.fromStatus
                      ? `${label(ev.fromStatus)} → ${label(ev.toStatus)}`
                      : i === 0
                      ? label(ev.toStatus)
                      : lang === 'ar' ? 'ملاحظة' : 'Note'}
                  </div>
                  {ev.note && <div className="text-gray-600">{ev.note}</div>}
                </li>
              ))}
            </ol>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs text-xs">
            <div className="font-bold text-gray-900 flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              {lang === 'ar' ? 'إصلاحات سابقة لنفس الجهاز' : 'Earlier repairs of this device'}
            </div>
            {deviceHistory.length === 0 ? (
              <div className="text-gray-400">{t.noData}</div>
            ) : (
              <ul className="space-y-2">
                {deviceHistory.map((h) => (
                  <li key={h.id}>
                    <Link href={`/repairs/${h.id}`} className="font-mono font-bold text-orange-700 hover:underline">
                      {h.ticketNo}
                    </Link>{' '}
                    <span className="text-gray-500 font-mono">{h.receivedAt}</span>
                    <div className="text-gray-600 truncate">{h.issue}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, mono, warn }: { label: string; value: string; mono?: boolean; warn?: boolean }) {
  return (
    <div className="space-y-1">
      <div className="text-gray-500 font-bold">{label}</div>
      <div className={`font-bold ${warn ? 'text-red-600' : 'text-gray-900'} ${mono ? 'font-mono' : ''}`}>
        {warn && <AlertTriangle className="w-3 h-3 inline me-1" />}
        {value}
      </div>
    </div>
  );
}
