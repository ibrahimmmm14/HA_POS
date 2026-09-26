'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/components/common/LanguageContext';
import { formatCurrency } from '@/lib/utils';
import {
  BarChart3,
  Users,
  ShieldCheck,
  Activity,
  Download,
  Calendar,
  Building,
  CheckCircle2,
} from 'lucide-react';

export default function ReportsPage() {
  const { lang, t } = useLanguage();
  const [stats, setStats] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'sales' | 'doctors' | 'insurance' | 'audit'>('sales');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/reports').then((res) => res.json()),
      fetch('/api/audit-logs').then((res) => res.json()),
    ])
      .then(([repData, logData]) => {
        setStats(repData);
        if (logData.logs) setAuditLogs(logData.logs);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleExportCsv = () => {
    let rows: string[] = [];
    if (activeTab === 'doctors') {
      rows.push('Doctor,Hospital,Referrals,TotalSalesReferred,CommissionEarned');
      stats?.doctorStats?.forEach((d: any) => {
        rows.push(`"${d.doctorNameAr}","${d.hospitalNameAr}",${d.referralsCount},${d.totalSalesReferred},${d.commissionEarned}`);
      });
    } else {
      rows.push('Branch,InvoiceCount,TotalSales');
      stats?.branchStats?.forEach((b: any) => {
        rows.push(`"${b.nameAr}",${b.invoiceCount},${b.totalSales}`);
      });
    }

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `report_${activeTab}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <span>{t.reports}</span>
          </h2>
          <p className="text-xs text-gray-500">
            {lang === 'ar'
              ? 'تقارير المبيعات الشاملة، عمولات الأطباء، مطالبات التأمين، وسجل الرقابة والعمليات'
              : 'Detailed sales reports, doctor referral commissions, insurance claims, and audit logs'}
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl shadow transition"
        >
          <Download className="w-4 h-4" />
          <span>{t.exportCsv}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 text-xs font-bold">
        {[
          { id: 'sales', label: 'تقرير مبيعات الفروع', icon: Building },
          { id: 'doctors', label: t.doctorReferrals, icon: Users },
          { id: 'insurance', label: t.insuranceReconciliation, icon: ShieldCheck },
          { id: 'audit', label: t.auditTrail, icon: Activity },
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

      {/* Tab 1: Sales By Branch */}
      {activeTab === 'sales' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-900 text-white font-semibold">
                <tr>
                  <th className="p-3 text-start">{t.branch}</th>
                  <th className="p-3 text-center">عدد الفواتير</th>
                  <th className="p-3 text-end">إجمالي المبيعات</th>
                  <th className="p-3 text-end">متوسط قيمة الفاتورة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(stats?.branchStats || []).map((b: any) => {
                  const avg = b.invoiceCount > 0 ? b.totalSales / b.invoiceCount : 0;
                  return (
                    <tr key={b.branchId} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-gray-900">{b.nameAr}</td>
                      <td className="p-3 text-center font-mono font-bold text-gray-700">
                        {b.invoiceCount}
                      </td>
                      <td className="p-3 text-end font-mono font-bold text-blue-700">
                        {formatCurrency(b.totalSales)} ر.س
                      </td>
                      <td className="p-3 text-end font-mono text-gray-600">
                        {formatCurrency(avg)} ر.س
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Doctor & Hospital Referral Commissions */}
      {activeTab === 'doctors' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-900 text-white font-semibold">
                <tr>
                  <th className="p-3 text-start">{t.referringDoctor}</th>
                  <th className="p-3 text-start">{t.hospital}</th>
                  <th className="p-3 text-center">عدد الإحالات</th>
                  <th className="p-3 text-end">إجمالي مبيعات الإحالات</th>
                  <th className="p-3 text-center">نسبة العمولة</th>
                  <th className="p-3 text-end">{t.doctorCommission} المستحقة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(stats?.doctorStats || []).map((d: any) => (
                  <tr key={d.doctorId} className="hover:bg-emerald-50/20">
                    <td className="p-3 font-bold text-gray-900">{d.doctorNameAr}</td>
                    <td className="p-3 text-gray-600">{d.hospitalNameAr}</td>
                    <td className="p-3 text-center font-mono font-bold text-gray-700">
                      {d.referralsCount}
                    </td>
                    <td className="p-3 text-end font-mono font-bold text-gray-900">
                      {formatCurrency(d.totalSalesReferred)} ر.س
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-emerald-700">
                      {d.commissionPercent}%
                    </td>
                    <td className="p-3 text-end font-mono font-black text-emerald-800 text-sm">
                      {formatCurrency(d.commissionEarned)} ر.س
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Insurance Reconciliation */}
      {activeTab === 'insurance' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6 text-xs">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200">
              <div className="text-gray-500 font-semibold mb-1">عدد مطالبات التأمين</div>
              <div className="text-xl font-black text-blue-900 font-mono">
                {stats?.insuranceStats?.claimsCount || 0} مطالبات
              </div>
            </div>

            <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200">
              <div className="text-gray-500 font-semibold mb-1">إجمالي المبالغ المغطاة</div>
              <div className="text-xl font-black text-emerald-800 font-mono">
                {formatCurrency(stats?.insuranceStats?.totalClaimed || 0)} ر.س
              </div>
            </div>

            <div className="p-4 bg-purple-50/60 rounded-xl border border-purple-200">
              <div className="text-gray-500 font-semibold mb-1">مبالغ تحمل المرضى (Co-pay)</div>
              <div className="text-xl font-black text-purple-900 font-mono">
                {formatCurrency(stats?.insuranceStats?.totalCopay || 0)} ر.س
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Audit Trail Log */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-900 text-white font-semibold">
                <tr>
                  <th className="p-3 text-start">الوقت والتاريخ</th>
                  <th className="p-3 text-start">المستخدم</th>
                  <th className="p-3 text-center">نوع الإجراء</th>
                  <th className="p-3 text-start">تفاصيل العملية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono text-gray-500">{log.timestamp}</td>
                    <td className="p-3 font-bold text-gray-900">{log.userName}</td>
                    <td className="p-3 text-center">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 text-gray-800">{log.details}</td>
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
