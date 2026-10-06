'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/components/common/LanguageContext';
import { formatCurrency } from '@/lib/utils';
import {
  REPAIR_STATUSES,
  REPAIR_STATUS_LABELS,
  REPAIR_STATUS_COLORS,
  isRepairOverdue,
} from '@/lib/repairs';
import type { Client, RepairStatus } from '@/types';
import { Wrench, PlusCircle, Search, Eye, ShieldCheck, AlertTriangle, X } from 'lucide-react';

const emptyForm = {
  clientId: '',
  serialNumber: '',
  deviceBrand: '',
  deviceModel: '',
  ear: 'both',
  issue: '',
  repairedBy: 'in_house',
  expectedDate: '',
  charge: '',
  notes: '',
};

export default function RepairsListPage() {
  // useSearchParams needs a Suspense boundary for Next.js static rendering
  return (
    <Suspense>
      <RepairsList />
    </Suspense>
  );
}

function RepairsList() {
  const { lang, t } = useLanguage();
  const searchParams = useSearchParams();
  const [tickets, setTickets] = useState<any[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [statusFilter, setStatusFilter] = useState('open');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm, clientId: searchParams.get('clientId') || '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchTickets = () => {
    fetch('/api/repairs')
      .then((res) => res.json())
      .then((data) => {
        if (data.tickets) setTickets(data.tickets);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTickets();
    fetch('/api/clients')
      .then((res) => res.json())
      .then((data) => {
        if (data.clients) setClients(data.clients);
      });
    if (searchParams.get('clientId')) setShowForm(true);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.clientId || !form.issue.trim()) {
      setError(lang === 'ar' ? 'اختر المريض واكتب وصف العطل' : 'Select a patient and describe the fault');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/repairs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error');
        return;
      }
      setForm({ ...emptyForm });
      setShowForm(false);
      fetchTickets();
    } finally {
      setSaving(false);
    }
  };

  const filtered = tickets.filter((r) => {
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'open' && !['delivered', 'cancelled'].includes(r.status)) ||
      (statusFilter === 'overdue' && isRepairOverdue(r)) ||
      r.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      r.ticketNo.toLowerCase().includes(q) ||
      r.serialNumber?.toLowerCase().includes(q) ||
      r.clientNameAr?.toLowerCase().includes(q) ||
      r.clientNameEn?.toLowerCase().includes(q) ||
      r.clientPhone?.includes(search);
    return matchStatus && matchSearch;
  });

  const label = (s: RepairStatus) => REPAIR_STATUS_LABELS[s]?.[lang === 'ar' ? 'ar' : 'en'] || s;
  const inputCls = 'w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Wrench className="w-6 h-6 text-orange-600" />
            <span>{t.repairs}</span>
          </h2>
          <p className="text-xs text-gray-500">
            {lang === 'ar'
              ? 'استلام السماعات للصيانة، متابعة الحالة وسجل الإصلاحات لكل جهاز ومريض'
              : 'Hearing aid repair intake, status tracking, and repair history per device and patient'}
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-md transition"
        >
          {showForm ? <X className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
          <span>{showForm ? t.cancel : t.newRepair}</span>
        </button>
      </div>

      {/* Intake form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white p-5 rounded-2xl border border-orange-200 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4 text-xs"
        >
          <label className="space-y-1 md:col-span-2">
            <span className="font-bold text-gray-700">{lang === 'ar' ? 'المريض *' : 'Patient *'}</span>
            <select
              value={form.clientId}
              onChange={(e) => setForm({ ...form, clientId: e.target.value })}
              className={inputCls}
            >
              <option value="">{t.selectClient}</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fileNo} · {lang === 'ar' ? c.nameAr : c.nameEn} · {c.phone}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="font-bold text-gray-700">
              {lang === 'ar' ? 'الرقم التسلسلي للجهاز' : 'Device serial number'}
            </span>
            <input
              value={form.serialNumber}
              onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
              placeholder={lang === 'ar' ? 'يملأ الماركة والضمان تلقائياً' : 'Fills brand & warranty automatically'}
              className={`${inputCls} font-mono`}
            />
          </label>
          <label className="space-y-1">
            <span className="font-bold text-gray-700">{lang === 'ar' ? 'الماركة' : 'Brand'}</span>
            <input value={form.deviceBrand} onChange={(e) => setForm({ ...form, deviceBrand: e.target.value })} className={inputCls} />
          </label>
          <label className="space-y-1">
            <span className="font-bold text-gray-700">{lang === 'ar' ? 'الموديل' : 'Model'}</span>
            <input value={form.deviceModel} onChange={(e) => setForm({ ...form, deviceModel: e.target.value })} className={inputCls} />
          </label>
          <label className="space-y-1">
            <span className="font-bold text-gray-700">{t.earSide}</span>
            <select value={form.ear} onChange={(e) => setForm({ ...form, ear: e.target.value })} className={inputCls}>
              <option value="both">{t.earBoth}</option>
              <option value="left">{t.earLeft}</option>
              <option value="right">{t.earRight}</option>
            </select>
          </label>
          <label className="space-y-1 md:col-span-3">
            <span className="font-bold text-gray-700">{lang === 'ar' ? 'وصف العطل *' : 'Reported fault *'}</span>
            <textarea
              value={form.issue}
              onChange={(e) => setForm({ ...form, issue: e.target.value })}
              rows={2}
              className={inputCls}
            />
          </label>
          <label className="space-y-1">
            <span className="font-bold text-gray-700">{lang === 'ar' ? 'جهة الإصلاح' : 'Repaired by'}</span>
            <select value={form.repairedBy} onChange={(e) => setForm({ ...form, repairedBy: e.target.value })} className={inputCls}>
              <option value="in_house">{lang === 'ar' ? 'ورشة المركز' : 'In-house workshop'}</option>
              <option value="manufacturer">{lang === 'ar' ? 'الوكيل / المصنع' : 'Manufacturer / agent'}</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="font-bold text-gray-700">{lang === 'ar' ? 'موعد التسليم المتوقع' : 'Expected ready date'}</span>
            <input type="date" value={form.expectedDate} onChange={(e) => setForm({ ...form, expectedDate: e.target.value })} className={inputCls} />
          </label>
          <label className="space-y-1">
            <span className="font-bold text-gray-700">
              {lang === 'ar' ? 'رسوم الإصلاح (خارج الضمان)' : 'Repair charge (out of warranty)'}
            </span>
            <input type="number" min="0" value={form.charge} onChange={(e) => setForm({ ...form, charge: e.target.value })} className={inputCls} />
          </label>
          <div className="md:col-span-3 flex items-center justify-between gap-4">
            <span className="text-red-600 font-bold">{error}</span>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold rounded-xl"
            >
              {saving ? t.loading : t.save}
            </button>
          </div>
        </form>
      )}

      {/* Filter Chips & Search */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              lang === 'ar'
                ? 'بحث برقم التذكرة، الرقم التسلسلي، اسم المريض، أو الجوال...'
                : 'Search by ticket #, serial number, patient name, or phone...'
            }
            className="w-full pl-10 pr-4 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
          />
          <Search className="w-4 h-4 text-gray-400 absolute start-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto text-xs">
          {[
            { id: 'open', label: lang === 'ar' ? 'المفتوحة' : 'Open' },
            { id: 'overdue', label: lang === 'ar' ? 'متأخرة' : 'Overdue' },
            ...REPAIR_STATUSES.map((s) => ({ id: s, label: label(s) })),
            { id: 'all', label: lang === 'ar' ? 'الكل' : 'All' },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id)}
              className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                statusFilter === s.id
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-slate-900 text-white font-semibold">
              <tr>
                <th className="p-3 text-start">{lang === 'ar' ? 'رقم التذكرة' : 'Ticket #'}</th>
                <th className="p-3 text-start">{t.clientInfo}</th>
                <th className="p-3 text-start">{lang === 'ar' ? 'الجهاز' : 'Device'}</th>
                <th className="p-3 text-start">{lang === 'ar' ? 'العطل' : 'Fault'}</th>
                <th className="p-3 text-center">{lang === 'ar' ? 'الاستلام' : 'Received'}</th>
                <th className="p-3 text-center">{lang === 'ar' ? 'المتوقع' : 'Expected'}</th>
                <th className="p-3 text-end">{lang === 'ar' ? 'الرسوم' : 'Charge'}</th>
                <th className="p-3 text-center">{t.status}</th>
                <th className="p-3 text-center w-16">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    {loading ? t.loading : t.noData}
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-orange-50/20 transition">
                    <td className="p-3 font-mono font-bold text-orange-700">
                      <Link href={`/repairs/${r.id}`} className="hover:underline">
                        {r.ticketNo}
                      </Link>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-gray-900">
                        {lang === 'ar' ? r.clientNameAr : r.clientNameEn}
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono">{r.clientPhone}</div>
                    </td>
                    <td className="p-3">
                      <div className="text-gray-800">
                        {r.deviceBrand} {r.deviceModel}
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono flex items-center gap-1">
                        {r.serialNumber || '—'}
                        {r.underWarranty && <ShieldCheck className="w-3 h-3 text-emerald-600" />}
                      </div>
                    </td>
                    <td className="p-3 text-gray-600 truncate max-w-[180px]">{r.issue}</td>
                    <td className="p-3 text-center font-mono text-gray-500">{r.receivedAt}</td>
                    <td className="p-3 text-center font-mono text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        {isRepairOverdue(r) && <AlertTriangle className="w-3 h-3 text-red-600" />}
                        {r.expectedDate || '—'}
                      </span>
                    </td>
                    <td className="p-3 text-end font-mono font-bold text-gray-900">
                      {r.underWarranty
                        ? lang === 'ar' ? 'ضمان' : 'Warranty'
                        : `${formatCurrency(r.charge)} ر.س`}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          REPAIR_STATUS_COLORS[r.status as RepairStatus] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {label(r.status)}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <Link
                        href={`/repairs/${r.id}`}
                        className="p-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition inline-flex"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
