'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/components/common/LanguageContext';
import { useBranch } from '@/components/common/BranchContext';
import {
  Settings,
  Building,
  Users,
  ShieldCheck,
  Percent,
  Hospital as HospIcon,
  CheckCircle2,
} from 'lucide-react';

export default function SettingsPage() {
  const { lang, t } = useLanguage();
  const { branches, warehouses } = useBranch();

  const [doctors, setDoctors] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [insurance, setInsurance] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'branches' | 'doctors' | 'insurance' | 'tax'>('branches');

  useEffect(() => {
    fetch('/api/branches')
      .then((res) => res.json())
      .then((data) => {
        if (data.doctors) setDoctors(data.doctors);
        if (data.hospitals) setHospitals(data.hospitals);
        if (data.insuranceCompanies) setInsurance(data.insuranceCompanies);
      });
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-gray-700" />
            <span>{t.settings}</span>
          </h2>
          <p className="text-xs text-gray-500">
            {lang === 'ar'
              ? 'إدارة الفروع، المستودعات، الأطباء، المستشفيات، شركات التأمين، ونسب الضريبة'
              : 'Configure branches, warehouses, referring doctors, hospital affiliations, and tax rates'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 text-xs font-bold">
        {[
          { id: 'branches', label: t.branches, icon: Building },
          { id: 'doctors', label: 'الأطباء والمستشفيات', icon: Users },
          { id: 'insurance', label: 'شركات التأمين الطبي', icon: ShieldCheck },
          { id: 'tax', label: 'إعدادات الضريبة والفواتير', icon: Percent },
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

      {/* Tab: Branches */}
      {activeTab === 'branches' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {branches.map((b) => (
            <div
              key={b.id}
              className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                  {b.code}
                </span>
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                  نشط
                </span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-900">{b.nameAr}</h3>
                <p className="text-gray-500 mt-0.5">{b.addressAr}</p>
              </div>
              <div className="pt-2 border-t border-gray-100 text-[11px] space-y-1 text-gray-600">
                <div>الهاتف: <span className="font-mono">{b.phone}</span></div>
                <div>الرقم الضريبي: <span className="font-mono font-bold">{b.taxNumber}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Doctors & Hospitals */}
      {activeTab === 'doctors' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-900 text-white font-semibold">
                <tr>
                  <th className="p-3 text-start">اسم الطبيب</th>
                  <th className="p-3 text-start">التخصص</th>
                  <th className="p-3 text-start">المستشفى</th>
                  <th className="p-3 text-start">رقم التواصل</th>
                  <th className="p-3 text-center">نسبة الإحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {doctors.map((d) => {
                  const hosp = hospitals.find((h) => h.id === d.hospitalId);
                  return (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-gray-900">{d.nameAr}</td>
                      <td className="p-3 text-gray-600">{d.specialtyAr}</td>
                      <td className="p-3 text-gray-800 font-medium">{hosp?.nameAr || '-'}</td>
                      <td className="p-3 font-mono text-gray-600">{d.phone}</td>
                      <td className="p-3 text-center font-mono font-bold text-blue-700">
                        {d.commissionPercent}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Insurance */}
      {activeTab === 'insurance' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {insurance.map((ic) => (
            <div
              key={ic.id}
              className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">
                  {ic.code}
                </span>
                <span className="text-[10px] text-gray-500 font-mono">هاتف: {ic.phone}</span>
              </div>
              <h3 className="font-bold text-sm text-gray-900">{ic.nameAr}</h3>
              <div className="pt-2 border-t border-gray-100 space-y-1 text-gray-600">
                <div className="flex justify-between">
                  <span>نسبة التغطية الافتراضية:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {ic.defaultCoveragePercent}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>الموافقة المسبقة:</span>
                  <span className="font-semibold text-gray-800">
                    {ic.requiresPreApproval ? 'مطلوبة' : 'غير مطلوبة'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Tax */}
      {activeTab === 'tax' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm max-w-xl space-y-4 text-xs">
          <h3 className="font-bold text-sm text-gray-900 pb-2 border-b">
            إعدادات ضريبة القيمة المضافة (VAT)
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-gray-600 mb-1">النسبة المئوية الافتراضية لضريبة القيمة المضافة</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  disabled
                  value="15"
                  className="w-24 border border-gray-300 rounded-lg p-2 font-mono font-bold text-center bg-gray-50"
                />
                <span className="font-bold">% (المعيار الوطني للمملكة العربية السعودية)</span>
              </div>
            </div>

            <div>
              <label className="block text-gray-600 mb-1">مطابقة الفوترة الإلكترونية (ZATCA Stage 2 Phase Ready)</label>
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>تشفير رمز الاستجابة السريعة (TLV QR) مفعّل تلقائياً بجميع الفواتير</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
