'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/components/common/LanguageContext';
import { useBranch } from '@/components/common/BranchContext';
import { MessageTemplate, MessageLog, Client } from '@/types';
import {
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  Smartphone,
  Copy,
  ExternalLink,
} from 'lucide-react';

export default function MessagingPage() {
  const { lang, t } = useLanguage();
  const { currentBranch } = useBranch();

  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  // Dispatch composer state
  const [selectedClientId, setSelectedClientId] = useState('');
  const [phone, setPhone] = useState('0505123456');
  const [selectedTrigger, setSelectedTrigger] = useState('order_ready');
  const [composedText, setComposedText] = useState('');
  const [sending, setSending] = useState(false);

  const fetchMessagingData = () => {
    fetch('/api/messaging')
      .then((res) => res.json())
      .then((data) => {
        if (data.templates) {
          setTemplates(data.templates);
          if (data.templates.length > 0 && !composedText) {
            setComposedText(data.templates[0].bodyAr);
          }
        }
        if (data.logs) setLogs(data.logs);
      });

    fetch('/api/clients')
      .then((res) => res.json())
      .then((data) => {
        if (data.clients) {
          setClients(data.clients);
          if (data.clients.length > 0 && !selectedClientId) {
            setSelectedClientId(data.clients[0].id);
            setPhone(data.clients[0].phone);
          }
        }
      });
  };

  useEffect(() => {
    fetchMessagingData();
  }, []);

  // Update text when trigger changes
  useEffect(() => {
    const tmpl = templates.find((t) => t.trigger === selectedTrigger);
    if (tmpl) {
      const client = clients.find((c) => c.id === selectedClientId);
      let text = lang === 'ar' ? tmpl.bodyAr : tmpl.bodyEn;
      text = text
        .replace('{client_name}', client?.nameAr || 'العميل العزيز')
        .replace('{order_no}', 'EMO-2026-0042')
        .replace('{invoice_no}', 'INV-2026-0089')
        .replace('{grand_total}', '14,386.5')
        .replace('{remaining_due}', '0.00')
        .replace('{branch}', currentBranch.nameAr)
        .replace('{date}', new Date().toISOString().split('T')[0]);
      setComposedText(text);
    }
  }, [selectedTrigger, selectedClientId, templates, lang]);

  const saudiPhone = phone.replace(/\D/g, '');
  const formattedSaudiPhone = saudiPhone.startsWith('05')
    ? `966${saudiPhone.substring(1)}`
    : saudiPhone;
  const whatsappUrl = `https://wa.me/${formattedSaudiPhone}?text=${encodeURIComponent(
    composedText
  )}`;

  const handleSend = async () => {
    if (!phone || !composedText) return;
    setSending(true);

    const client = clients.find((c) => c.id === selectedClientId);
    try {
      const res = await fetch('/api/messaging', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClientId,
          clientName: client?.nameAr || 'عميل مباشر',
          phone,
          channel: 'whatsapp',
          trigger: selectedTrigger,
          content: composedText,
        }),
      });

      if (res.ok) {
        fetchMessagingData();
        // Open WhatsApp web in new tab
        window.open(whatsappUrl, '_blank');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-emerald-600" />
            <span>{t.whatsappMessaging}</span>
          </h2>
          <p className="text-xs text-gray-500">
            {lang === 'ar'
              ? 'إرسال إشعارات جاهزية القوالب، نسخ الفواتير، ومواعيد الفحص السمعي مباشرة عبر واتساب'
              : 'Direct WhatsApp and SMS client messaging for order pickups, invoices, and appointments'}
          </p>
        </div>
      </div>

      {/* Grid: Composer & Templates */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Composer (7 Cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4 text-xs">
          <div className="font-bold text-sm text-gray-900 pb-2 border-b border-gray-100 flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-emerald-600" />
            <span>{lang === 'ar' ? 'إنشاء وإرسال رسالة مباشرة' : 'Compose Message'}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">{t.clientInfo}</label>
              <select
                value={selectedClientId}
                onChange={(e) => {
                  setSelectedClientId(e.target.value);
                  const cl = clients.find((c) => c.id === e.target.value);
                  if (cl) setPhone(cl.phone);
                }}
                className="w-full border border-gray-300 rounded-lg p-2 bg-white"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameAr} ({c.phone})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">{t.phone}</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">{t.messageTemplate}</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'order_ready', label: t.templateOrderReady },
                { id: 'invoice_receipt', label: t.templateInvoice },
                { id: 'appointment', label: t.templateAppointment },
                { id: 'battery_reminder', label: t.templateBattery },
              ].map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => setSelectedTrigger(tmpl.id)}
                  className={`p-2 rounded-xl border text-start font-bold transition ${
                    selectedTrigger === tmpl.id
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {tmpl.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              {lang === 'ar' ? 'نص الرسالة (المعاينة الحية)' : 'Message Body'}
            </label>
            <textarea
              rows={5}
              value={composedText}
              onChange={(e) => setComposedText(e.target.value)}
              className="w-full border border-gray-300 rounded-xl p-3 text-xs leading-relaxed focus:ring-2 focus:ring-emerald-500 font-sans"
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <span className="text-[11px] text-gray-400">
              سيتم تسجيل الرسالة في السجل وفتح رابط الإرسال المباشر
            </span>

            <button
              onClick={handleSend}
              disabled={sending || !phone}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{t.sendWhatsapp}</span>
            </button>
          </div>
        </div>

        {/* Message Log & Outbox (5 Cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <h3 className="font-bold text-xs text-gray-900 uppercase tracking-wider">
              {t.messageLog}
            </h3>
            <span className="text-gray-400 font-mono text-xs">{logs.length} Sent</span>
          </div>

          <div className="space-y-3 max-h-[420px] overflow-y-auto pe-1">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-slate-50/70 rounded-xl border border-slate-200 space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900">{log.clientName}</span>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                    {log.status === 'delivered' ? 'تم التسليم ✓' : 'مرسلة ✓'}
                  </span>
                </div>
                <div className="text-[11px] text-gray-500 font-mono">
                  {log.phone} • {log.sentAt}
                </div>
                <p className="text-[11px] text-gray-700 line-clamp-2 bg-white p-2 rounded-lg border border-gray-100">
                  {log.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
