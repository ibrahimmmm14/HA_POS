'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/common/LanguageContext';
import { Client, EarmoldShellType, EarmoldVentType } from '@/types';
import { Scissors, Save, ArrowLeft } from 'lucide-react';

export function EarmoldOrderForm() {
  const router = useRouter();
  const { lang, t } = useLanguage();

  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState('');
  const [ear, setEar] = useState<'left' | 'right' | 'both'>('both');
  const [shellType, setShellType] = useState<EarmoldShellType>('soft_silicone');
  const [color, setColor] = useState('beige');
  const [ventType, setVentType] = useState<EarmoldVentType>('1.5mm');
  const [deviceBrand, setDeviceBrand] = useState('Phonak');
  const [deviceModel, setDeviceModel] = useState('Lumity L90-R');
  const [impressionDate, setImpressionDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [impressionBy, setImpressionBy] = useState('د. هدى الشهري');
  const [workshop, setWorkshop] = useState('الورشة الفنية الداخلية - فرع الرياض');
  const [expectedDate, setExpectedDate] = useState(
    new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0]
  );
  const [price, setPrice] = useState<number>(1100);
  const [cost, setCost] = useState<number>(440);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/clients')
      .then((res) => res.json())
      .then((data) => {
        if (data.clients) {
          setClients(data.clients);
          if (data.clients.length > 0) setClientId(data.clients[0].id);
        }
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      alert(lang === 'ar' ? 'يرجى اختيار المريض' : 'Please select patient');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/earmolds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          ear,
          shellType,
          color,
          ventType,
          deviceBrand,
          deviceModel,
          impressionDate,
          impressionBy,
          workshop,
          expectedDate,
          price,
          cost,
          notes,
          status: 'pending',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        router.push(`/earmolds/${data.order.id}`);
      }
    } catch (e) {
      console.error(e);
      alert('Error creating earmold order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center">
            <Scissors className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900">
              {lang === 'ar' ? 'طلب تصنيع قالب أذن / هيكل مخصص جديد' : 'New Custom Earmold / CIC Lab Order'}
            </h2>
            <p className="text-xs text-gray-500">
              {lang === 'ar'
                ? 'إصدار أمر تشغيل المعمل بالمواصفات الفنية للطبعة والتهوية والسماعة'
                : 'Generate laboratory order slip with impression specs, venting, and target device'}
            </p>
          </div>
        </div>

        <button
          onClick={() => router.push('/earmolds')}
          className="text-xs font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-300 px-3 py-1.5 rounded-lg"
        >
          {t.cancel}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
        {/* Client & Dates */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              {t.clientInfo} <span className="text-red-500">*</span>
            </label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-purple-500"
              required
            >
              <option value="">{t.selectClient}</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameAr} ({c.phone}) - {c.fileNo}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">{t.impressionDate}</label>
            <input
              type="date"
              value={impressionDate}
              onChange={(e) => setImpressionDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">{t.expectedDelivery}</label>
            <input
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 font-mono"
            />
          </div>
        </div>

        {/* Technical Specifications */}
        <div className="border-t border-gray-100 pt-4 space-y-4">
          <div className="font-bold text-xs text-purple-900 uppercase tracking-wider">
            {lang === 'ar' ? 'المواصفات الفنية للقالب' : 'Earmold Technical Specs'}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Ear Side */}
            <div>
              <label className="block font-semibold text-gray-700 mb-1">{t.earSide}</label>
              <select
                value={ear}
                onChange={(e) => setEar(e.target.value as any)}
                className="w-full border border-gray-300 rounded-lg p-2 bg-white"
              >
                <option value="both">{t.earBoth}</option>
                <option value="left">{t.earLeft}</option>
                <option value="right">{t.earRight}</option>
              </select>
            </div>

            {/* Shell Type */}
            <div>
              <label className="block font-semibold text-gray-700 mb-1">{t.shellType}</label>
              <select
                value={shellType}
                onChange={(e) => setShellType(e.target.value as any)}
                className="w-full border border-gray-300 rounded-lg p-2 bg-white"
              >
                <option value="soft_silicone">{t.shellSoftSilicone}</option>
                <option value="hard_acrylic">{t.shellHardAcrylic}</option>
                <option value="skeleton">{t.shellSkeleton}</option>
                <option value="semi_skeleton">{t.shellSemiSkeleton}</option>
                <option value="canal">{t.shellCanal}</option>
                <option value="micro_cic">{t.shellMicroCic}</option>
              </select>
            </div>

            {/* Vent Type */}
            <div>
              <label className="block font-semibold text-gray-700 mb-1">{t.ventType}</label>
              <select
                value={ventType}
                onChange={(e) => setVentType(e.target.value as any)}
                className="w-full border border-gray-300 rounded-lg p-2 bg-white"
              >
                <option value="1.5mm">{t.vent15mm}</option>
                <option value="none">{t.ventNone}</option>
                <option value="1.0mm">{t.vent1mm}</option>
                <option value="2.0mm">{t.vent2mm}</option>
                <option value="3.0mm">{t.vent3mm}</option>
                <option value="pressure">{t.ventPressure}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Color */}
            <div>
              <label className="block font-semibold text-gray-700 mb-1">{t.color}</label>
              <select
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 bg-white"
              >
                <option value="beige">{t.colorBeige}</option>
                <option value="clear">{t.colorClear}</option>
                <option value="red">{t.colorRed}</option>
                <option value="blue">{t.colorBlue}</option>
              </select>
            </div>

            {/* Target HA Brand */}
            <div>
              <label className="block font-semibold text-gray-700 mb-1">{t.brand}</label>
              <input
                type="text"
                value={deviceBrand}
                onChange={(e) => setDeviceBrand(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2"
                placeholder="Phonak / Oticon / Signia..."
              />
            </div>

            {/* Target HA Model */}
            <div>
              <label className="block font-semibold text-gray-700 mb-1">{t.targetDevice}</label>
              <input
                type="text"
                value={deviceModel}
                onChange={(e) => setDeviceModel(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2"
                placeholder="Lumity L90 / More 1..."
              />
            </div>
          </div>
        </div>

        {/* Workshop & Personnel */}
        <div className="border-t border-gray-100 pt-4 space-y-4">
          <div className="font-bold text-xs text-purple-900 uppercase tracking-wider">
            {lang === 'ar' ? 'بيانات المعمل والتسعير' : 'Lab & Pricing'}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">{t.workshopLab}</label>
              <input
                type="text"
                value={workshop}
                onChange={(e) => setWorkshop(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">{t.impressionBy}</label>
              <input
                type="text"
                value={impressionBy}
                onChange={(e) => setImpressionBy(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">{t.salePrice}</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg p-2 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">{t.costPrice}</label>
              <input
                type="number"
                value={cost}
                onChange={(e) => setCost(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg p-2 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">{t.notes}</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                lang === 'ar'
                  ? 'أي تعليمات خاصة بفني المعمل بخصوص عمق القناة أو شدة العزل أو موضع الريسيفر...'
                  : 'Special instructions for lab technician...'
              }
              className="w-full border border-gray-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-4 border-t border-gray-100">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{submitting ? t.loading : lang === 'ar' ? 'إصدار وطباعة طلب المعمل' : 'Create & Print Lab Order'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
