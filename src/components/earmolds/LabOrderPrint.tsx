'use client';

import React from 'react';
import { EarmoldOrder, Client } from '@/types';
import { Printer, Scissors, Award } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface LabOrderPrintProps {
  order: EarmoldOrder;
  client?: Client;
}

export function LabOrderPrint({ order, client }: LabOrderPrintProps) {
  const handlePrint = () => {
    window.print();
  };

  const getShellName = (type: string) => {
    switch (type) {
      case 'hard_acrylic':
        return 'أكريليك صلب (Hard Acrylic)';
      case 'soft_silicone':
        return 'سيليكون مرن ناعم (Soft Silicone)';
      case 'skeleton':
        return 'هيكل مفتوح (Skeleton)';
      case 'semi_skeleton':
        return 'نصف هيكل (Semi-Skeleton)';
      case 'canal':
        return 'قالب قناة السمع (Canal Mold)';
      case 'micro_cic':
        return 'هيكل ميكرو داخل القناة (Micro-CIC)';
      default:
        return type;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end print:hidden">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow transition"
        >
          <Printer className="w-4 h-4" />
          <span>طباعة كشف تشغيل المعمل / Print Lab Work Slip</span>
        </button>
      </div>

      <div className="bg-white p-8 rounded-2xl border-2 border-dashed border-purple-300 shadow-sm print:shadow-none print:border-solid print:border-gray-800 max-w-[800px] mx-auto text-gray-900 print:p-0">
        {/* Lab Slip Header */}
        <div className="flex justify-between items-start border-b-2 border-purple-800 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-700 text-white flex items-center justify-center">
              <Scissors className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-purple-950">
                أمر تشغيل معمل السمعيات والقوالب
              </h2>
              <p className="text-xs text-gray-600 font-semibold">
                Audiology Laboratory Custom Earmold & CIC Work Order
              </p>
            </div>
          </div>

          <div className="text-end">
            <div className="font-mono text-base font-black text-purple-800">
              {order.orderNo}
            </div>
            <div className="text-xs text-gray-600">
              تاريخ الطلب: <span className="font-mono">{order.impressionDate}</span>
            </div>
            <div className="text-xs text-red-600 font-bold">
              تاريخ التسليم المطلوب: <span className="font-mono">{order.expectedDate}</span>
            </div>
          </div>
        </div>

        {/* Client & Clinic Details */}
        <div className="grid grid-cols-2 gap-4 text-xs bg-purple-50/50 p-4 rounded-xl border border-purple-100 mb-6">
          <div className="space-y-1">
            <div className="font-bold text-purple-900 border-b border-purple-200 pb-1 mb-1">
              بيانات المريض / Patient Information
            </div>
            <div>
              <span className="text-gray-500">اسم المريض: </span>
              <span className="font-bold text-gray-900">{client?.nameAr || 'غير مسجل'}</span>
            </div>
            <div>
              <span className="text-gray-500">رقم الملف: </span>
              <span className="font-mono">{client?.fileNo || '-'}</span>
            </div>
            <div>
              <span className="text-gray-500">رقم الجوال: </span>
              <span className="font-mono">{client?.phone || '-'}</span>
            </div>
            <div>
              <span className="text-gray-500">العمر / الجنس: </span>
              <span>
                {client?.age || '-'} سنة ({client?.gender === 'female' ? 'أنثى' : 'ذكر'})
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="font-bold text-purple-900 border-b border-purple-200 pb-1 mb-1">
              جهة الفحص والمعمل / Clinic & Lab
            </div>
            <div>
              <span className="text-gray-500">الورشة / المعمل المعين: </span>
              <span className="font-semibold text-gray-900">{order.workshop}</span>
            </div>
            <div>
              <span className="text-gray-500">أخصائي أخذ الطبعة: </span>
              <span>{order.impressionBy}</span>
            </div>
            <div>
              <span className="text-gray-500">السماعة المستهدفة: </span>
              <span className="font-mono font-bold text-blue-700">
                {order.deviceBrand || ''} {order.deviceModel || ''}
              </span>
            </div>
          </div>
        </div>

        {/* Technical Manufacturing Specs */}
        <div className="border border-gray-300 rounded-xl p-4 mb-6">
          <div className="text-sm font-bold text-gray-900 mb-3 border-b pb-2 flex items-center gap-2">
            <Award className="w-4 h-4 text-purple-600" />
            <span>المواصفات الفنية للتصنيع / Technical Specifications</span>
          </div>

          <div className="grid grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-gray-500 mb-1">جهة الأذن (Ear Side)</div>
              <div className="font-bold text-sm text-gray-900">
                {order.ear === 'both' ? 'الأذنين معاً (Left & Right)' : order.ear === 'left' ? 'الأذن اليسرى (Left Ear)' : 'الأذن اليمنى (Right Ear)'}
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-gray-500 mb-1">مادة ونوع القالب (Shell Material)</div>
              <div className="font-bold text-sm text-gray-900">{getShellName(order.shellType)}</div>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-gray-500 mb-1">قناة التنفيس (Ventilation)</div>
              <div className="font-bold text-sm text-gray-900">{order.ventType}</div>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-gray-500 mb-1">لون القالب (Color)</div>
              <div className="font-bold text-sm text-gray-900">{order.color}</div>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-gray-500 mb-1">سعر البيع المعتمد</div>
              <div className="font-bold text-sm text-emerald-700 font-mono">
                {formatCurrency(order.price)} ر.س
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-gray-500 mb-1">حالة الطلب الحالية</div>
              <div className="font-bold text-sm text-purple-700 capitalize">
                {order.status}
              </div>
            </div>
          </div>

          {order.notes && (
            <div className="mt-4 p-3 bg-amber-50 rounded-lg text-xs text-amber-900 border border-amber-200">
              <span className="font-bold">ملاحظات وتعليمات خاصة للمعمل: </span>
              {order.notes}
            </div>
          )}
        </div>

        {/* Visual Impression Checklist */}
        <div className="border border-gray-200 rounded-xl p-4 mb-6 text-xs">
          <div className="font-bold text-gray-800 mb-2">فحص جودة الطبعة (Lab QA Checklist):</div>
          <div className="grid grid-cols-3 gap-2 text-gray-600">
            <div>[  ] عمق القناة السمعية مكتمل (Meatus depth)</div>
            <div>[  ] حافة الشراع وزاوية الهيليكس واضحة (Helix rim)</div>
            <div>[  ] عدم وجود فقاعات هواء في السيليكون (No air voids)</div>
          </div>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8 text-xs pt-6 border-t border-gray-300 text-center">
          <div>
            <div className="font-bold text-gray-800 mb-10">توقيع أخصائي العيادة / Clinician</div>
            <div className="border-t border-gray-400 w-44 mx-auto"></div>
          </div>
          <div>
            <div className="font-bold text-gray-800 mb-10">استلام وفني المعمل / Lab Technician</div>
            <div className="border-t border-gray-400 w-44 mx-auto"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
