'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/components/common/LanguageContext';
import { Client } from '@/types';
import {
  Users,
  PlusCircle,
  Search,
  Eye,
  Activity,
  Phone,
  Calendar,
  FileText,
  UserPlus,
} from 'lucide-react';

export default function ClientsListPage() {
  const { lang, t } = useLanguage();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // New Client Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNameAr, setNewNameAr] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newNationalId, setNewNationalId] = useState('');
  const [newGender, setNewGender] = useState<'male' | 'female'>('male');
  const [newAge, setNewAge] = useState<number>(45);
  const [newAddress, setNewAddress] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchClients = () => {
    fetch('/api/clients')
      .then((res) => res.json())
      .then((data) => {
        if (data.clients) setClients(data.clients);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNameAr || !newPhone) return;

    setCreating(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nameAr: newNameAr,
          nameEn: newNameAr,
          phone: newPhone,
          nationalId: newNationalId,
          gender: newGender,
          age: Number(newAge),
          dob: '1980-01-01',
          cityAr: 'الرياض',
          cityEn: 'Riyadh',
          address: newAddress,
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewNameAr('');
        setNewPhone('');
        setNewNationalId('');
        setNewAddress('');
        fetchClients();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const filtered = clients.filter(
    (c) =>
      !search ||
      c.nameAr.toLowerCase().includes(search.toLowerCase()) ||
      c.nameEn?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.nationalId.includes(search) ||
      c.fileNo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            <span>{t.clients}</span>
          </h2>
          <p className="text-xs text-gray-500">
            {lang === 'ar'
              ? 'سجل المرضى، أرقام الملفات، المخططات السمعية، وتاريخ الأجهزة المباعة'
              : 'Patient directory, clinical files, audiometric evaluations, and device history'}
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition"
        >
          <UserPlus className="w-4 h-4" />
          <span>{t.newClient}</span>
        </button>
      </div>

      {/* Search Box */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              lang === 'ar'
                ? 'بحث بالاسم، رقم الملف، رقم الجوال، أو الهوية الوطنية...'
                : 'Search by patient name, file #, phone, or national ID...'
            }
            className="w-full pl-10 pr-4 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
          />
          <Search className="w-4 h-4 text-gray-400 absolute start-3 top-2.5" />
        </div>
      </div>

      {/* Client List Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-slate-900 text-white font-semibold">
              <tr>
                <th className="p-3 text-start">{t.fileNumber}</th>
                <th className="p-3 text-start">{t.fullName}</th>
                <th className="p-3 text-start">{t.phone}</th>
                <th className="p-3 text-start">{t.nationalId}</th>
                <th className="p-3 text-center">{t.gender}</th>
                <th className="p-3 text-center">{t.age}</th>
                <th className="p-3 text-start">{t.address}</th>
                <th className="p-3 text-center w-24">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    {loading ? t.loading : t.noData}
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-blue-50/20 transition">
                    <td className="p-3 font-mono font-bold text-blue-700">
                      <Link href={`/clients/${c.id}`} className="hover:underline">
                        {c.fileNo}
                      </Link>
                    </td>
                    <td className="p-3 font-bold text-gray-900">
                      <Link href={`/clients/${c.id}`} className="hover:text-blue-600">
                        {c.nameAr}
                      </Link>
                    </td>
                    <td className="p-3 font-mono text-gray-600">{c.phone}</td>
                    <td className="p-3 font-mono text-gray-500">{c.nationalId || '-'}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          c.gender === 'female'
                            ? 'bg-pink-100 text-pink-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {c.gender === 'female' ? t.female : t.male}
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono">{c.age}</td>
                    <td className="p-3 text-gray-600 truncate max-w-[200px]">
                      {c.address}
                    </td>
                    <td className="p-3 text-center">
                      <Link
                        href={`/clients/${c.id}`}
                        className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition inline-flex items-center gap-1"
                        title="عرض الملف السريري"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold">الملف</span>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="font-bold text-base text-gray-900">
                {t.addClientQuick}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  {t.fullName} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newNameAr}
                  onChange={(e) => setNewNameAr(e.target.value)}
                  placeholder="مثال: خالد بن فهد السالم"
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    {t.phone} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="05XXXXXXXX"
                    className="w-full border border-gray-300 rounded-lg p-2 font-mono focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    {t.nationalId}
                  </label>
                  <input
                    type="text"
                    value={newNationalId}
                    onChange={(e) => setNewNationalId(e.target.value)}
                    placeholder="10XXXXXXXX"
                    className="w-full border border-gray-300 rounded-lg p-2 font-mono focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">{t.gender}</label>
                  <select
                    value={newGender}
                    onChange={(e) => setNewGender(e.target.value as any)}
                    className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                  >
                    <option value="male">{t.male}</option>
                    <option value="female">{t.female}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">{t.age}</label>
                  <input
                    type="number"
                    value={newAge}
                    onChange={(e) => setNewAge(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg p-2 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">{t.address}</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="المدينة، الحي، اسم الشارع..."
                  className="w-full border border-gray-300 rounded-lg p-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow transition"
                >
                  {creating ? t.loading : t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
