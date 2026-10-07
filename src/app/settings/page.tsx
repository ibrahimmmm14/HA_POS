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
  PlusCircle,
  Pencil,
  Warehouse,
} from 'lucide-react';

type AddKind = 'branch' | 'warehouse' | 'hospital' | 'doctor' | 'insurance';

interface FieldDef {
  name: string;
  labelAr: string;
  labelEn: string;
  required?: boolean;
  type?: 'text' | 'tel' | 'number' | 'select' | 'checkbox';
  /** what a select lists (hospitals by default) */
  options?: 'branches';
  dir?: 'ltr';
}

const FORMS: Record<
  AddKind,
  { titleAr: string; titleEn: string; editTitleAr: string; editTitleEn: string; endpoint: string; fields: FieldDef[] }
> = {
  branch: {
    titleAr: 'إضافة فرع جديد',
    titleEn: 'Add New Branch',
    editTitleAr: 'تعديل بيانات الفرع',
    editTitleEn: 'Edit Branch',
    endpoint: '/api/branches',
    fields: [
      { name: 'code', labelAr: 'رمز الفرع', labelEn: 'Branch code', required: true, dir: 'ltr' },
      { name: 'nameAr', labelAr: 'اسم الفرع (عربي)', labelEn: 'Branch name (Arabic)', required: true },
      { name: 'nameEn', labelAr: 'اسم الفرع (إنجليزي)', labelEn: 'Branch name (English)', dir: 'ltr' },
      { name: 'cityAr', labelAr: 'المدينة', labelEn: 'City' },
      { name: 'addressAr', labelAr: 'العنوان', labelEn: 'Address' },
      { name: 'phone', labelAr: 'الهاتف', labelEn: 'Phone', type: 'tel', dir: 'ltr' },
      { name: 'taxNumber', labelAr: 'الرقم الضريبي', labelEn: 'Tax number', dir: 'ltr' },
    ],
  },
  warehouse: {
    titleAr: 'إضافة مستودع جديد',
    titleEn: 'Add New Warehouse',
    editTitleAr: 'تعديل بيانات المستودع',
    editTitleEn: 'Edit Warehouse',
    endpoint: '/api/warehouses',
    fields: [
      { name: 'code', labelAr: 'رمز المستودع', labelEn: 'Warehouse code', required: true, dir: 'ltr' },
      { name: 'nameAr', labelAr: 'اسم المستودع (عربي)', labelEn: 'Warehouse name (Arabic)', required: true },
      { name: 'nameEn', labelAr: 'اسم المستودع (إنجليزي)', labelEn: 'Warehouse name (English)', dir: 'ltr' },
      { name: 'branchId', labelAr: 'الفرع', labelEn: 'Branch', required: true, type: 'select', options: 'branches' },
    ],
  },
  hospital: {
    titleAr: 'إضافة مستشفى جديد',
    titleEn: 'Add New Hospital',
    editTitleAr: 'تعديل بيانات المستشفى',
    editTitleEn: 'Edit Hospital',
    endpoint: '/api/hospitals',
    fields: [
      { name: 'nameAr', labelAr: 'اسم المستشفى (عربي)', labelEn: 'Hospital name (Arabic)', required: true },
      { name: 'nameEn', labelAr: 'اسم المستشفى (إنجليزي)', labelEn: 'Hospital name (English)', dir: 'ltr' },
      { name: 'code', labelAr: 'الرمز (اختياري)', labelEn: 'Code (optional)', dir: 'ltr' },
      { name: 'cityAr', labelAr: 'المدينة', labelEn: 'City' },
      { name: 'phone', labelAr: 'الهاتف', labelEn: 'Phone', type: 'tel', dir: 'ltr' },
    ],
  },
  doctor: {
    titleAr: 'إضافة طبيب جديد',
    titleEn: 'Add New Doctor',
    editTitleAr: 'تعديل بيانات الطبيب',
    editTitleEn: 'Edit Doctor',
    endpoint: '/api/doctors',
    fields: [
      { name: 'nameAr', labelAr: 'اسم الطبيب (عربي)', labelEn: 'Doctor name (Arabic)', required: true },
      { name: 'nameEn', labelAr: 'اسم الطبيب (إنجليزي)', labelEn: 'Doctor name (English)', dir: 'ltr' },
      { name: 'hospitalId', labelAr: 'المستشفى', labelEn: 'Hospital', required: true, type: 'select' },
      { name: 'specialtyAr', labelAr: 'التخصص', labelEn: 'Specialty' },
      { name: 'phone', labelAr: 'رقم التواصل', labelEn: 'Phone', type: 'tel', dir: 'ltr' },
      { name: 'commissionPercent', labelAr: 'نسبة الإحالة %', labelEn: 'Referral %', type: 'number', dir: 'ltr' },
    ],
  },
  insurance: {
    titleAr: 'إضافة شركة تأمين جديدة',
    titleEn: 'Add New Insurance Company',
    editTitleAr: 'تعديل بيانات شركة التأمين',
    editTitleEn: 'Edit Insurance Company',
    endpoint: '/api/insurance',
    fields: [
      { name: 'nameAr', labelAr: 'اسم الشركة (عربي)', labelEn: 'Company name (Arabic)', required: true },
      { name: 'nameEn', labelAr: 'اسم الشركة (إنجليزي)', labelEn: 'Company name (English)', dir: 'ltr' },
      { name: 'code', labelAr: 'الرمز (اختياري)', labelEn: 'Code (optional)', dir: 'ltr' },
      { name: 'phone', labelAr: 'الهاتف', labelEn: 'Phone', type: 'tel', dir: 'ltr' },
      { name: 'defaultCoveragePercent', labelAr: 'نسبة التغطية الافتراضية %', labelEn: 'Default coverage %', type: 'number', dir: 'ltr' },
      { name: 'requiresPreApproval', labelAr: 'تتطلب موافقة مسبقة', labelEn: 'Requires pre-approval', type: 'checkbox' },
    ],
  },
};

export default function SettingsPage() {
  const { lang, t } = useLanguage();
  const { branches, warehouses, refreshBranches } = useBranch();

  const [doctors, setDoctors] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [insurance, setInsurance] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'branches' | 'warehouses' | 'doctors' | 'insurance' | 'tax'>('branches');

  // Add dialog state
  const [addKind, setAddKind] = useState<AddKind | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const loadMasterData = () =>
    fetch('/api/branches')
      .then((res) => res.json())
      .then((data) => {
        if (data.doctors) setDoctors(data.doctors);
        if (data.hospitals) setHospitals(data.hospitals);
        if (data.insuranceCompanies) setInsurance(data.insuranceCompanies);
      });

  useEffect(() => {
    loadMasterData();
  }, []);

  const openAdd = (kind: AddKind) => {
    setForm({});
    setEditId(null);
    setFormError('');
    setAddKind(kind);
  };

  // Open the same dialog pre-filled with an existing record
  const openEdit = (kind: AddKind, record: Record<string, any>) => {
    const values: Record<string, string> = {};
    for (const f of FORMS[kind].fields) {
      const v = record[f.name];
      values[f.name] = typeof v === 'boolean' ? (v ? 'true' : '') : v === null || v === undefined ? '' : String(v);
    }
    setForm(values);
    setEditId(record.id);
    setFormError('');
    setAddKind(kind);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addKind) return;

    setSaving(true);
    setFormError('');
    try {
      const res = await fetch(editId ? `${FORMS[addKind].endpoint}/${editId}` : FORMS[addKind].endpoint, {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (err.error === 'warehouse_not_empty') {
          setFormError(
            lang === 'ar'
              ? 'لا يمكن نقل مستودع به أرصدة أو أرقام تسلسلية أو تحويلات معلقة إلى فرع آخر. حوّل الأصناف أولاً.'
              : 'A warehouse holding stock, serial numbers or open transfers cannot move to another branch. Transfer the stock out first.'
          );
          return;
        }
        setFormError(
          lang === 'ar'
            ? 'تعذر الحفظ. تأكد من البيانات (قد يكون الرمز مستخدماً من قبل).'
            : 'Could not save. Check the details (the code may already be in use).'
        );
        return;
      }
      setAddKind(null);
      setEditId(null);
      if (addKind === 'branch' || addKind === 'warehouse') await refreshBranches();
      else await loadMasterData();
    } catch (err) {
      console.error(err);
      setFormError(lang === 'ar' ? 'حدث خطأ في الاتصال.' : 'Connection error.');
    } finally {
      setSaving(false);
    }
  };

  const addButton = (kind: AddKind, labelAr: string, labelEn: string) => (
    <button
      onClick={() => openAdd(kind)}
      className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition"
    >
      <PlusCircle className="w-4 h-4" />
      <span>{lang === 'ar' ? labelAr : labelEn}</span>
    </button>
  );

  const editButton = (kind: AddKind, record: Record<string, any>) => (
    <button
      onClick={() => openEdit(kind, record)}
      className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition inline-flex"
      title={lang === 'ar' ? 'تعديل' : 'Edit'}
    >
      <Pencil className="w-4 h-4" />
    </button>
  );

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
          { id: 'warehouses', label: lang === 'ar' ? 'المستودعات' : 'Warehouses', icon: Warehouse },
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
        <div className="space-y-4">
        <div className="flex justify-end">{addButton('branch', 'إضافة فرع', 'Add Branch')}</div>
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
                <span className="flex items-center gap-2">
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                    نشط
                  </span>
                  {editButton('branch', b)}
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
        </div>
      )}

      {/* Tab: Warehouses */}
      {activeTab === 'warehouses' && (
        <div className="space-y-4">
          <div className="flex justify-end">{addButton('warehouse', 'إضافة مستودع', 'Add Warehouse')}</div>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-900 text-white font-semibold">
                  <tr>
                    <th className="p-3 text-start">{lang === 'ar' ? 'الرمز' : 'Code'}</th>
                    <th className="p-3 text-start">{lang === 'ar' ? 'المستودع' : 'Warehouse'}</th>
                    <th className="p-3 text-start">{lang === 'ar' ? 'الفرع' : 'Branch'}</th>
                    <th className="p-3 text-center w-16">{lang === 'ar' ? 'تعديل' : 'Edit'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {warehouses.map((w) => {
                    const br = branches.find((b) => b.id === w.branchId);
                    return (
                      <tr key={w.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono text-blue-700 font-bold">{w.code}</td>
                        <td className="p-3 font-bold text-gray-900">{lang === 'ar' ? w.nameAr : w.nameEn}</td>
                        <td className="p-3 text-gray-700">{br ? (lang === 'ar' ? br.nameAr : br.nameEn) : '-'}</td>
                        <td className="p-3 text-center">{editButton('warehouse', w)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-[11px] text-gray-500">
            {lang === 'ar'
              ? 'اربط كل مستخدم بمستودع أو أكثر من شاشة المستخدمين، وحوّل الأصناف بين المستودعات من شاشة المخزون.'
              : 'Link users to warehouses from the Users screen, and move stock between warehouses from the Inventory screen.'}
          </p>
        </div>
      )}

      {/* Tab: Doctors & Hospitals */}
      {activeTab === 'doctors' && (
        <div className="space-y-4">
        <div className="flex flex-wrap justify-end gap-2">
          {addButton('hospital', 'إضافة مستشفى', 'Add Hospital')}
          {addButton('doctor', 'إضافة طبيب', 'Add Doctor')}
        </div>
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
                  <th className="p-3 text-center w-16">{lang === 'ar' ? 'تعديل' : 'Edit'}</th>
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
                      <td className="p-3 text-center">{editButton('doctor', d)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Hospitals list */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-3 border-b border-gray-100 font-bold text-sm text-gray-900 flex items-center gap-2">
            <HospIcon className="w-4 h-4 text-blue-600" />
            <span>{lang === 'ar' ? 'المستشفيات' : 'Hospitals'}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-900 text-white font-semibold">
                <tr>
                  <th className="p-3 text-start">{lang === 'ar' ? 'الرمز' : 'Code'}</th>
                  <th className="p-3 text-start">{lang === 'ar' ? 'اسم المستشفى' : 'Hospital'}</th>
                  <th className="p-3 text-start">{lang === 'ar' ? 'المدينة' : 'City'}</th>
                  <th className="p-3 text-start">{lang === 'ar' ? 'الهاتف' : 'Phone'}</th>
                  <th className="p-3 text-center">{lang === 'ar' ? 'عدد الأطباء' : 'Doctors'}</th>
                  <th className="p-3 text-center w-16">{lang === 'ar' ? 'تعديل' : 'Edit'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {hospitals.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono text-blue-700 font-bold">{h.code}</td>
                    <td className="p-3 font-bold text-gray-900">{lang === 'ar' ? h.nameAr : h.nameEn}</td>
                    <td className="p-3 text-gray-600">{lang === 'ar' ? h.cityAr : h.cityEn}</td>
                    <td className="p-3 font-mono text-gray-600">{h.phone || '-'}</td>
                    <td className="p-3 text-center font-mono">
                      {doctors.filter((d) => d.hospitalId === h.id).length}
                    </td>
                    <td className="p-3 text-center">{editButton('hospital', h)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      )}

      {/* Tab: Insurance */}
      {activeTab === 'insurance' && (
        <div className="space-y-4">
        <div className="flex justify-end">{addButton('insurance', 'إضافة شركة تأمين', 'Add Insurance Company')}</div>
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
                <span className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 font-mono">هاتف: {ic.phone}</span>
                  {editButton('insurance', ic)}
                </span>
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

      {/* Add Branch / Hospital / Doctor Modal */}
      {addKind && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-bold text-base text-gray-900">
                {editId
                  ? lang === 'ar' ? FORMS[addKind].editTitleAr : FORMS[addKind].editTitleEn
                  : lang === 'ar' ? FORMS[addKind].titleAr : FORMS[addKind].titleEn}
              </h3>
              <button
                onClick={() => setAddKind(null)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              {FORMS[addKind].fields.map((f) => (
                <div key={f.name}>
                  <label className="block font-semibold text-gray-700 mb-1">
                    {lang === 'ar' ? f.labelAr : f.labelEn}
                    {f.required && <span className="text-red-500"> *</span>}
                  </label>
                  {f.type === 'checkbox' ? (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={form[f.name] === 'true'}
                        onChange={(e) => setForm({ ...form, [f.name]: e.target.checked ? 'true' : '' })}
                        className="w-4 h-4"
                      />
                      <span className="text-gray-600">{lang === 'ar' ? 'نعم' : 'Yes'}</span>
                    </label>
                  ) : f.type === 'select' ? (
                    <select
                      required={f.required}
                      value={form[f.name] || ''}
                      onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                    >
                      <option value="">{lang === 'ar' ? '— اختر —' : '— Select —'}</option>
                      {(f.options === 'branches' ? branches : hospitals).map((h: any) => (
                        <option key={h.id} value={h.id}>
                          {lang === 'ar' ? h.nameAr : h.nameEn}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={f.type || 'text'}
                      required={f.required}
                      dir={f.dir}
                      min={f.type === 'number' ? 0 : undefined}
                      max={f.type === 'number' ? 100 : undefined}
                      value={form[f.name] || ''}
                      onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
              ))}

              {addKind === 'doctor' && hospitals.length === 0 && (
                <p className="text-amber-700 bg-amber-50 p-2 rounded-lg">
                  {lang === 'ar' ? 'أضف مستشفى أولاً قبل إضافة الطبيب.' : 'Add a hospital first.'}
                </p>
              )}

              {formError && <p className="text-red-600 bg-red-50 p-2 rounded-lg">{formError}</p>}

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setAddKind(null)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow transition disabled:opacity-60"
                >
                  {saving ? t.loading : t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
