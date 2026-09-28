'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { BookOpen, Copy, Plus, Search, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { TaskTemplate } from '@/types/database.types';

export default function TusiCatalogPage() {
  const supabase = createClient();
  const [templates, setTemplates] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedTusi, setSelectedTusi] = useState('ALL');
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchTemplates = async () => {
    const { data } = await supabase
      .from('task_templates')
      .select('*, unit:units(name, code)')
      .order('created_at', { ascending: false });
    if (data) setTemplates(data);
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCloneTask = async (template: any) => {
    setCloningId(template.id);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('profiles')
      .select('unit_id')
      .eq('id', user?.id)
      .single();

    if (!profile) return;

    // Kloning template ke tabel tasks periode tahun berjalan
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const { error } = await supabase.from('tasks').insert({
      unit_id: profile.unit_id,
      template_id: template.id,
      title: template.title,
      description: template.description,
      legal_basis: template.legal_basis,
      period_type: template.period_type,
      period_month: now.getMonth() + 1,
      period_year: now.getFullYear(),
      deadline: nextMonth.toISOString().split('T')[0],
      status: 'BELUM_DIKERJAKAN',
      progress_pct: 0,
      created_by: user?.id,
    });

    setCloningId(null);
    if (!error) {
      setSuccessMsg(`Tusi "${template.title}" berhasil dikloning ke daftar tugas unit Anda!`);
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  const filtered = templates.filter((t) => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
                        t.tusi_type?.toLowerCase().includes(search.toLowerCase());
    const matchTusi = selectedTusi === 'ALL' || t.tusi_type === selectedTusi;
    return matchSearch && matchTusi;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900 tracking-tight">Bank Tusi & Katalog Pekerjaan</h1>
          <p className="text-xs text-stone-500 mt-0.5">Koleksi standar tugas fungsi unit vertikal yang dapat diadopsi</p>
        </div>

        <Link
          href="/tusi-catalog/new"
          className="inline-flex items-center gap-2 bg-primary text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-sm hover:bg-primary-hover transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Master Tusi</span>
        </Link>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter & Pencarian Bar */}
      <div className="bg-white border border-stone-200/60 rounded-3xl p-4 shadow-soft flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-stone-400" />
          <input
            type="text"
            placeholder="Cari judul pekerjaan atau dasar hukum..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-2xl border border-stone-200 text-xs focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto w-full md:w-auto">
          {['ALL', 'MSKI', 'PD', 'BANK', 'VERA', 'UMUM'].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedTusi(type)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                selectedTusi === type ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Katalog Template */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full bg-white border border-stone-200/60 rounded-3xl p-10 text-center space-y-2">
            <ShieldAlert className="w-8 h-8 text-stone-300 mx-auto" />
            <p className="text-xs font-semibold text-stone-700">Belum ada template tusi</p>
            <p className="text-[11px] text-stone-400">Klik "Tambah Master Tusi" untuk membuat standar tusi pertama</p>
          </div>
        ) : (
          filtered.map((t) => (
            <div key={t.id} className="bg-white border border-stone-200/60 rounded-3xl p-5 shadow-soft flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                    {t.tusi_type}
                  </span>
                  <span className="text-[10px] font-semibold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
                    {t.period_type}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-stone-900 leading-snug">{t.title}</h3>
                {t.description && (
                  <p className="text-xs text-stone-500 line-clamp-2">{t.description}</p>
                )}
                {t.legal_basis && (
                  <p className="text-[11px] text-stone-400 italic">Dasar: {t.legal_basis}</p>
                )}
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                <span className="text-[10px] text-stone-400">Oleh: {t.unit?.name ?? 'Pusat'}</span>
                <button
                  onClick={() => handleCloneTask(t)}
                  disabled={cloningId === t.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-900 text-white text-[11px] font-medium hover:bg-stone-800 disabled:opacity-50 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {cloningId === t.id ? 'Mengkloning...' : 'Kloning Tugas'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
