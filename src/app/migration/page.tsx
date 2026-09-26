'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/components/common/LanguageContext';
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Play,
} from 'lucide-react';

export default function MigrationPage() {
  const { lang, t } = useLanguage();

  const [importType, setImportType] = useState<'clients' | 'items'>('clients');
  const [csvContent, setCsvContent] = useState('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; count: number } | null>(null);

  // Sample templates
  const clientTemplateCsv = `nameAr,nameEn,phone,nationalId,gender,age,address,notes
محمد المنصور,Mohammad Al-Mansoor,0501122334,1039482910,male,52,حي الصحافة الرياض,عميل قديم
فاطمة الزهراني,Fatimah Al-Zahrani,0559988776,2049281920,female,38,حي النخيل الخبر,ضعف سمع حسي عصبي`;

  const itemTemplateCsv = `sku,nameAr,nameEn,category,brand,model,unit,costPrice,salePrice,stockWh1
HA-NEW-01,سماعة ريزاوند أومنيا 9,Resound Omnia 9,hearing_aids,ReSound,Omnia 9,قطعة,8900,14200,4
BAT-POW-13,بطاريات باور ون حجم 13,Power One Size 13,batteries,PowerOne,Size 13,كرتون,16,42,50`;

  const handleDownloadTemplate = () => {
    const content = importType === 'clients' ? clientTemplateCsv : itemTemplateCsv;
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `template_${importType}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleParseCsv = (text: string) => {
    setCsvContent(text);
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      setParsedRows([]);
      return;
    }

    const headers = lines[0].split(',').map((h) => h.trim());
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(',').map((v) => v.trim());
      if (vals.length === headers.length) {
        const obj: Record<string, any> = {};
        headers.forEach((h, idx) => {
          obj[h] = vals[idx];
        });
        rows.push(obj);
      }
    }
    setParsedRows(rows);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        handleParseCsv(evt.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const handleLoadSample = () => {
    const content = importType === 'clients' ? clientTemplateCsv : itemTemplateCsv;
    handleParseCsv(content);
  };

  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) return;
    setImporting(true);
    try {
      const res = await fetch('/api/migration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: importType,
          records: parsedRows,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setResult({ success: true, count: data.importedCount });
        setParsedRows([]);
        setCsvContent('');
      }
    } catch (e) {
      console.error(e);
      alert('Import error');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
            <span>{t.migrationTitle}</span>
          </h2>
          <p className="text-xs text-gray-500">
            {lang === 'ar'
              ? 'أداة ترحيل واستيراد بيانات العملاء، الأصناف، والأرصدة من النظام القديم عبر ملفات Excel و CSV'
              : 'Legacy data migration utility for patient files, inventory catalog, and opening balances'}
          </p>
        </div>
      </div>

      {result && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-xs text-emerald-900">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div className="font-bold">
            تم استيراد {result.count} سجل بنجاح وإضافتها إلى قاعدة البيانات!
          </div>
        </div>
      )}

      {/* Type selection & Template download */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="text-gray-700">نوع البيانات المراد استيرادها:</span>
            <div className="flex items-center bg-gray-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setImportType('clients');
                  setParsedRows([]);
                  setCsvContent('');
                }}
                className={`px-4 py-1.5 rounded-lg transition ${
                  importType === 'clients'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-gray-600'
                }`}
              >
                بيانات المرضى / العملاء
              </button>
              <button
                type="button"
                onClick={() => {
                  setImportType('items');
                  setParsedRows([]);
                  setCsvContent('');
                }}
                className={`px-4 py-1.5 rounded-lg transition ${
                  importType === 'items'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-gray-600'
                }`}
              >
                دليل الأصناف والمخزون
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLoadSample}
              className="px-3 py-1.5 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              تحميل نموذج تجريبي
            </button>
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl shadow transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.downloadTemplate}</span>
            </button>
          </div>
        </div>

        {/* File Upload Zone */}
        <div className="border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-2xl p-6 text-center transition bg-slate-50/50 space-y-2">
          <Upload className="w-8 h-8 text-gray-400 mx-auto" />
          <div className="text-xs font-bold text-gray-800">
            اسحب وأفلت ملف CSV هنا أو قم باختياره من جهازك
          </div>
          <p className="text-[11px] text-gray-500">
            يجب أن يحتوي الملف على الترويسات المتطابقة مع نموذج النظام
          </p>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileUpload}
            className="text-xs text-gray-600 file:me-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        {/* CSV Textarea preview */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            أو الصق محتوى ملف CSV مباشرة:
          </label>
          <textarea
            rows={4}
            value={csvContent}
            onChange={(e) => handleParseCsv(e.target.value)}
            className="w-full border border-gray-300 rounded-xl p-3 text-xs font-mono"
            placeholder="nameAr,phone,nationalId..."
          />
        </div>
      </div>

      {/* Parsed Rows Validation Table */}
      {parsedRows.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{t.validationPreview}</span>
              <span className="text-xs font-mono text-gray-400">
                ({parsedRows.length} {lang === 'ar' ? 'سجلات صالحة للاستيراد' : 'records ready'})
              </span>
            </h3>

            <button
              onClick={handleExecuteImport}
              disabled={importing}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              <span>{importing ? t.loading : t.startImport}</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-100 text-slate-700 font-semibold">
                <tr>
                  <th className="p-2.5 text-center w-8">#</th>
                  {Object.keys(parsedRows[0]).map((key) => (
                    <th key={key} className="p-2.5 font-mono text-start">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {parsedRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-2.5 text-center font-mono text-gray-400">{idx + 1}</td>
                    {Object.values(row).map((val: any, vIdx) => (
                      <td key={vIdx} className="p-2.5 font-medium text-gray-900">
                        {val}
                      </td>
                    ))}
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
