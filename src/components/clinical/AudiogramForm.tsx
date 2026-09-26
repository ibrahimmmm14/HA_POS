'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/components/common/LanguageContext';
import { AudiogramChart } from './AudiogramChart';
import { Activity, Save, Check } from 'lucide-react';

interface AudiogramFormProps {
  clientId: string;
  onSaved?: () => void;
}

const FREQUENCIES = [125, 250, 500, 1000, 2000, 4000, 8000];

export function AudiogramForm({ clientId, onSaved }: AudiogramFormProps) {
  const { lang, t } = useLanguage();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [audiologistName, setAudiologistName] = useState('د. هدى الشهري');
  const [testType, setTestType] = useState('فحص النغمات النقية التشخيصي (PTA)');
  const [notes, setNotes] = useState('');
  const [sdsLeft, setSdsLeft] = useState<number>(85);
  const [sdsRight, setSdsRight] = useState<number>(90);

  const [leftAir, setLeftAir] = useState<Record<number, number | null>>({
    125: 25,
    250: 30,
    500: 45,
    1000: 50,
    2000: 60,
    4000: 70,
    8000: 75,
  });

  const [rightAir, setRightAir] = useState<Record<number, number | null>>({
    125: 20,
    250: 25,
    500: 35,
    1000: 45,
    2000: 55,
    4000: 65,
    8000: 70,
  });

  const [leftBone, setLeftBone] = useState<Record<number, number | null>>({
    250: 25,
    500: 40,
    1000: 45,
    2000: 55,
    4000: 65,
  });

  const [rightBone, setRightBone] = useState<Record<number, number | null>>({
    250: 20,
    500: 30,
    1000: 40,
    2000: 50,
    4000: 60,
  });

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // PTA calculation: average of 500, 1000, 2000 Hz
  const calcPta = (air: Record<number, number | null>) => {
    const v500 = air[500] ?? 0;
    const v1000 = air[1000] ?? 0;
    const v2000 = air[2000] ?? 0;
    return Number(((v500 + v1000 + v2000) / 3).toFixed(1));
  };

  const ptaLeft = calcPta(leftAir);
  const ptaRight = calcPta(rightAir);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/audiograms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          date,
          audiologistName,
          testType,
          leftAir,
          rightAir,
          leftBone,
          rightBone,
          ptaLeft,
          ptaRight,
          sdsLeft,
          sdsRight,
          notes,
        }),
      });
      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
        if (onSaved) onSaved();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">
              {lang === 'ar' ? 'تسجيل فحص سمعي تشخيصي جديد' : 'New Diagnostic Audiogram Entry'}
            </h3>
            <p className="text-xs text-gray-500">
              {lang === 'ar'
                ? 'إدخال قياسات التوصيل الهوائي والعظمي لجميع الترددات'
                : 'Enter Air and Bone conduction dB thresholds across octaves'}
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow transition disabled:opacity-50"
        >
          {savedSuccess ? (
            <>
              <Check className="w-4 h-4" />
              <span>{lang === 'ar' ? 'تم الحفظ بنجاح!' : 'Saved Successfully!'}</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>{saving ? t.loading : t.save}</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: dB Value Matrix */}
        <div className="lg:col-span-7 space-y-5">
          {/* Metadata Row */}
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-gray-600 font-medium mb-1">{t.date}</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-gray-600 font-medium mb-1">
                {lang === 'ar' ? 'اسم الأخصائي' : 'Audiologist'}
              </label>
              <input
                type="text"
                value={audiologistName}
                onChange={(e) => setAudiologistName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-gray-600 font-medium mb-1">
                {lang === 'ar' ? 'نوع الفحص' : 'Test Type'}
              </label>
              <input
                type="text"
                value={testType}
                onChange={(e) => setTestType(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Table: Air & Bone Conduction Grid */}
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-xs text-center">
              <thead className="bg-gray-50 border-b border-gray-200 font-semibold text-gray-700">
                <tr>
                  <th className="p-2 text-start font-bold">
                    {lang === 'ar' ? 'القناة / التردد' : 'Channel / Freq'}
                  </th>
                  {FREQUENCIES.map((f) => (
                    <th key={f} className="p-2">
                      {f >= 1000 ? `${f / 1000}k` : f}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {/* Right Ear - Air (Red O) */}
                <tr className="bg-red-50/40">
                  <td className="p-2 text-start font-bold text-red-700 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full border border-red-500 flex items-center justify-center text-[10px]">
                      O
                    </span>
                    <span>{lang === 'ar' ? 'يمين هوائي (R-Air)' : 'R - Air'}</span>
                  </td>
                  {FREQUENCIES.map((f) => (
                    <td key={`ra-${f}`} className="p-1">
                      <input
                        type="number"
                        min="-10"
                        max="120"
                        step="5"
                        value={rightAir[f] ?? ''}
                        onChange={(e) =>
                          setRightAir({
                            ...rightAir,
                            [f]: e.target.value === '' ? null : Number(e.target.value),
                          })
                        }
                        className="w-11 text-center font-mono font-semibold py-1 rounded border border-red-200 bg-white text-red-900 focus:ring-1 focus:ring-red-500"
                      />
                    </td>
                  ))}
                </tr>

                {/* Right Ear - Bone (Red [) */}
                <tr className="bg-red-50/20">
                  <td className="p-2 text-start font-bold text-red-800">
                    {lang === 'ar' ? 'يمين عظمي (R-Bone)' : 'R - Bone'}
                  </td>
                  {FREQUENCIES.map((f) => (
                    <td key={`rb-${f}`} className="p-1">
                      {[250, 500, 1000, 2000, 4000].includes(f) ? (
                        <input
                          type="number"
                          min="-10"
                          max="80"
                          step="5"
                          value={rightBone[f] ?? ''}
                          onChange={(e) =>
                            setRightBone({
                              ...rightBone,
                              [f]: e.target.value === '' ? null : Number(e.target.value),
                            })
                          }
                          className="w-11 text-center font-mono py-1 rounded border border-red-200 bg-white text-red-800 focus:ring-1 focus:ring-red-500"
                        />
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Left Ear - Air (Blue X) */}
                <tr className="bg-blue-50/40">
                  <td className="p-2 text-start font-bold text-blue-700 flex items-center gap-1.5">
                    <span className="text-xs font-bold">✕</span>
                    <span>{lang === 'ar' ? 'يسار هوائي (L-Air)' : 'L - Air'}</span>
                  </td>
                  {FREQUENCIES.map((f) => (
                    <td key={`la-${f}`} className="p-1">
                      <input
                        type="number"
                        min="-10"
                        max="120"
                        step="5"
                        value={leftAir[f] ?? ''}
                        onChange={(e) =>
                          setLeftAir({
                            ...leftAir,
                            [f]: e.target.value === '' ? null : Number(e.target.value),
                          })
                        }
                        className="w-11 text-center font-mono font-semibold py-1 rounded border border-blue-200 bg-white text-blue-900 focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                  ))}
                </tr>

                {/* Left Ear - Bone (Blue ]) */}
                <tr className="bg-blue-50/20">
                  <td className="p-2 text-start font-bold text-blue-800">
                    {lang === 'ar' ? 'يسار عظمي (L-Bone)' : 'L - Bone'}
                  </td>
                  {FREQUENCIES.map((f) => (
                    <td key={`lb-${f}`} className="p-1">
                      {[250, 500, 1000, 2000, 4000].includes(f) ? (
                        <input
                          type="number"
                          min="-10"
                          max="80"
                          step="5"
                          value={leftBone[f] ?? ''}
                          onChange={(e) =>
                            setLeftBone({
                              ...leftBone,
                              [f]: e.target.value === '' ? null : Number(e.target.value),
                            })
                          }
                          className="w-11 text-center font-mono py-1 rounded border border-blue-200 bg-white text-blue-800 focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Scores: PTA & SDS */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-red-50/60 border border-red-200 rounded-xl text-xs space-y-1.5">
              <div className="font-bold text-red-800">
                {lang === 'ar' ? 'نتائج الأذن اليمنى (Right Ear)' : 'Right Ear Analysis'}
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t.ptaScore}:</span>
                <span className="font-mono font-bold text-red-900">{ptaRight} dB HL</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">{t.speechDiscrimination}:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={sdsRight}
                    onChange={(e) => setSdsRight(Number(e.target.value))}
                    className="w-14 text-center font-mono font-bold border border-red-200 rounded px-1 py-0.5 bg-white"
                  />
                  <span>%</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl text-xs space-y-1.5">
              <div className="font-bold text-blue-800">
                {lang === 'ar' ? 'نتائج الأذن اليسرى (Left Ear)' : 'Left Ear Analysis'}
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t.ptaScore}:</span>
                <span className="font-mono font-bold text-blue-900">{ptaLeft} dB HL</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">{t.speechDiscrimination}:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={sdsLeft}
                    onChange={(e) => setSdsLeft(Number(e.target.value))}
                    className="w-14 text-center font-mono font-bold border border-blue-200 rounded px-1 py-0.5 bg-white"
                  />
                  <span>%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {lang === 'ar' ? 'التشخيص والملاحظات السريرية' : 'Diagnostic Summary & Recommendation'}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                lang === 'ar'
                  ? 'اكتب توصية البرمجة أو نوع المعينة السمعية المناسبة...'
                  : 'Enter clinical impressions and fitting recommendations...'
              }
              className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Right Side: Live SVG Audiogram Chart */}
        <div className="lg:col-span-5 flex flex-col justify-start">
          <AudiogramChart
            frequencies={FREQUENCIES}
            leftAir={leftAir}
            rightAir={rightAir}
            leftBone={leftBone}
            rightBone={rightBone}
          />
        </div>
      </div>
    </div>
  );
}
