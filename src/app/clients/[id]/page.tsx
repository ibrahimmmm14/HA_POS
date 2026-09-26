'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useLanguage } from '@/components/common/LanguageContext';
import { AudiogramChart } from '@/components/clinical/AudiogramChart';
import { AudiogramForm } from '@/components/clinical/AudiogramForm';
import { Client, Audiogram, EarmoldOrder, Invoice, SerialUnit } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  ArrowLeft,
  User,
  Activity,
  Receipt,
  Scissors,
  Barcode,
  Calendar,
  Phone,
  Shield,
  Plus,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export default function ClientProfilePage() {
  const params = useParams();
  const { lang, t } = useLanguage();

  const [data, setData] = useState<{
    client: Client;
    audiograms: Audiogram[];
    earmoldOrders: EarmoldOrder[];
    invoices: Invoice[];
    devices: SerialUnit[];
  } | null>(null);

  const [activeTab, setActiveTab] = useState<'audiograms' | 'devices' | 'earmolds' | 'invoices'>('audiograms');
  const [showNewAudiogramForm, setShowNewAudiogramForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchClientData = () => {
    if (params.id) {
      fetch(`/api/clients/${params.id}`)
        .then((res) => res.json())
        .then((resData) => {
          if (resData.client) setData(resData);
        })
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    fetchClientData();
  }, [params.id]);

  if (loading) {
    return (
      <div className="text-center py-20 text-gray-500 font-bold text-sm">
        {t.loading}
      </div>
    );
  }

  if (!data || !data.client) {
    return (
      <div className="text-center py-20 text-red-500 font-bold text-sm">
        {lang === 'ar' ? 'ملف المريض غير موجود' : 'Client file not found'}
      </div>
    );
  }

  const { client, audiograms, earmoldOrders, invoices, devices } = data;

  return (
    <div className="space-y-6">
      {/* Header Profile Card */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/clients"
              className="p-2.5 rounded-2xl border border-gray-200 hover:bg-gray-50 transition"
            >
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </Link>

            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-700 to-blue-500 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-blue-500/20">
              <User className="w-7 h-7" />
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-black text-gray-950">{client.nameAr}</h1>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                  {client.fileNo}
                </span>
              </div>
              <div className="text-xs text-gray-500 flex flex-wrap items-center gap-4 mt-1">
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  <span className="font-mono">{client.phone}</span>
                </span>
                <span>
                  {client.age} سنة ({client.gender === 'female' ? t.female : t.male})
                </span>
                <span>{client.address}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/invoices/new"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
            >
              {lang === 'ar' ? '+ إصدار فاتورة' : '+ New Invoice'}
            </Link>
            <Link
              href="/earmolds/new"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
            >
              {lang === 'ar' ? '+ طلب قالب' : '+ Custom Earmold'}
            </Link>
          </div>
        </div>

        {/* Insurance details ribbon if present */}
        {client.insurancePolicyNo && (
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span className="font-bold">تغطية تأمين طبي مسجلة:</span>
              <span className="font-mono font-semibold">{client.insurancePolicyNo}</span>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
              معتمد
            </span>
          </div>
        )}
      </div>

      {/* Profile Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-gray-200 text-xs font-bold">
        {[
          {
            id: 'audiograms',
            label: `${t.audiogramChart} (${audiograms.length})`,
            icon: Activity,
          },
          {
            id: 'devices',
            label: `${t.deviceHistory} (${devices.length})`,
            icon: Barcode,
          },
          {
            id: 'earmolds',
            label: `${t.earmoldOrders} (${earmoldOrders.length})`,
            icon: Scissors,
          },
          {
            id: 'invoices',
            label: `${t.invoices} (${invoices.length})`,
            icon: Receipt,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold transition ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Audiograms & Diagnostics */}
      {activeTab === 'audiograms' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-900">
              {lang === 'ar' ? 'سجل الفحوصات وتخطيط السمع السريري' : 'Audiometric Evaluations'}
            </h3>
            <button
              onClick={() => setShowNewAudiogramForm(!showNewAudiogramForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>
                {showNewAudiogramForm
                  ? lang === 'ar'
                    ? 'إغلاق النموذج'
                    : 'Close Form'
                  : lang === 'ar'
                  ? 'تسجيل فحص سمعي جديد'
                  : 'New Audiogram'}
              </span>
            </button>
          </div>

          {/* New Audiogram Form */}
          {showNewAudiogramForm && (
            <AudiogramForm
              clientId={client.id}
              onSaved={() => {
                setShowNewAudiogramForm(false);
                fetchClientData();
              }}
            />
          )}

          {/* List of existing audiograms */}
          {audiograms.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border text-center text-gray-400 text-xs">
              {lang === 'ar'
                ? 'لا يوجد فحص سمعي مسجل لهذا المريض حتى الآن. انقر على تسجيل فحص جديد بالأعلى.'
                : 'No audiograms recorded for this patient yet.'}
            </div>
          ) : (
            <div className="space-y-6">
              {audiograms.map((aud) => (
                <div
                  key={aud.id}
                  className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-6 items-center"
                >
                  <div className="lg:col-span-6 space-y-4 text-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                      <div>
                        <div className="font-bold text-sm text-gray-900">{aud.testType}</div>
                        <div className="text-gray-500 font-mono mt-0.5">
                          {aud.date} • {aud.audiologistName}
                        </div>
                      </div>
                      <span className="font-mono text-[10px] text-gray-400">ID: {aud.id}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-red-50/60 rounded-xl border border-red-100">
                        <div className="font-bold text-red-800">الأذن اليمنى (Right)</div>
                        <div className="mt-1">
                          PTA: <span className="font-mono font-bold">{aud.ptaRight} dB HL</span>
                        </div>
                        <div>
                          SDS: <span className="font-mono font-bold">{aud.sdsRight}%</span>
                        </div>
                      </div>

                      <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                        <div className="font-bold text-blue-800">الأذن اليسرى (Left)</div>
                        <div className="mt-1">
                          PTA: <span className="font-mono font-bold">{aud.ptaLeft} dB HL</span>
                        </div>
                        <div>
                          SDS: <span className="font-mono font-bold">{aud.sdsLeft}%</span>
                        </div>
                      </div>
                    </div>

                    {aud.notes && (
                      <div className="p-3 bg-gray-50 rounded-xl text-gray-700">
                        <span className="font-bold">التشخيص والتوصية: </span>
                        {aud.notes}
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-6 flex justify-center">
                    <AudiogramChart
                      frequencies={aud.frequencies}
                      leftAir={aud.leftAir}
                      rightAir={aud.rightAir}
                      leftBone={aud.leftBone}
                      rightBone={aud.rightBone}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Devices & Serial Numbers */}
      {activeTab === 'devices' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h3 className="text-sm font-bold text-gray-900">
            {lang === 'ar' ? 'المعينات السمعية والأجهزة المملوكة للمريض' : 'Hearing Aid Units & Warranty'}
          </h3>

          {devices.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-xs">
              {lang === 'ar' ? 'لا توجد أجهزة مسجلة' : 'No devices recorded'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {devices.map((d) => (
                <div
                  key={d.id}
                  className="p-4 rounded-xl border border-gray-200 bg-slate-50/50 space-y-2 text-xs"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-sm text-gray-900 font-mono">
                        {d.serialNumber}
                      </div>
                      <div className="text-gray-500 font-mono text-[11px] mt-0.5">
                        Item ID: {d.itemId}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {d.status}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-gray-200 flex justify-between text-gray-600">
                    <span>تاريخ انتهاء الضمان:</span>
                    <span className="font-mono font-bold text-blue-700">
                      {d.warrantyEndDate || 'ساري المفعول'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Custom Earmold Orders */}
      {activeTab === 'earmolds' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-900 text-white font-semibold">
                <tr>
                  <th className="p-3 text-start">{t.earmoldOrderNo}</th>
                  <th className="p-3 text-center">{t.earSide}</th>
                  <th className="p-3 text-start">{t.shellType}</th>
                  <th className="p-3 text-center">{t.expectedDelivery}</th>
                  <th className="p-3 text-center">{t.status}</th>
                  <th className="p-3 text-end">{t.price}</th>
                  <th className="p-3 text-center">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {earmoldOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-purple-50/20">
                    <td className="p-3 font-mono font-bold text-purple-700">
                      {o.orderNo}
                    </td>
                    <td className="p-3 text-center font-bold">
                      {o.ear === 'both' ? 'L & R' : o.ear}
                    </td>
                    <td className="p-3 capitalize">{o.shellType.replace('_', ' ')}</td>
                    <td className="p-3 text-center font-mono">{o.expectedDate}</td>
                    <td className="p-3 text-center font-bold text-purple-700 capitalize">
                      {o.status}
                    </td>
                    <td className="p-3 text-end font-mono font-bold">
                      {formatCurrency(o.price)} ر.س
                    </td>
                    <td className="p-3 text-center">
                      <Link
                        href={`/earmolds/${o.id}`}
                        className="text-blue-600 hover:underline font-bold"
                      >
                        عرض
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Invoices */}
      {activeTab === 'invoices' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-900 text-white font-semibold">
                <tr>
                  <th className="p-3 text-start">{t.invoiceNo}</th>
                  <th className="p-3 text-center">{t.date}</th>
                  <th className="p-3 text-center">{t.paymentMethod}</th>
                  <th className="p-3 text-end">{t.grandTotal}</th>
                  <th className="p-3 text-end">{t.remainingDue}</th>
                  <th className="p-3 text-center">{t.status}</th>
                  <th className="p-3 text-center">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-blue-50/20">
                    <td className="p-3 font-mono font-bold text-blue-700">
                      {inv.invoiceNo}
                    </td>
                    <td className="p-3 text-center font-mono">{inv.date}</td>
                    <td className="p-3 text-center capitalize">{inv.paymentMethod}</td>
                    <td className="p-3 text-end font-mono font-bold">
                      {formatCurrency(inv.grandTotal)} ر.س
                    </td>
                    <td className="p-3 text-end font-mono font-bold text-red-600">
                      {formatCurrency(inv.remainingDue)} ر.س
                    </td>
                    <td className="p-3 text-center capitalize">{inv.deliveryStatus}</td>
                    <td className="p-3 text-center">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="text-blue-600 hover:underline font-bold"
                      >
                        طباعة
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
