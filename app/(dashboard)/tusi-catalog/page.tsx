'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { 
  BookOpen, 
  Copy, 
  Plus, 
  Search, 
  CheckCircle2, 
  ShieldAlert, 
  Edit3, 
  Trash2, 
  X, 
  AlertCircle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type PeriodType = 'BULANAN' | 'TRIWULANAN' | 'SEMESTERAN' | 'TAHUNAN' | 'INSIDENTIL';

interface TemplateItem {
  id: string;
  tusi_type: string;
  title: string;
  description: string | null;
  legal_basis: string | null;
  period_type: PeriodType;
  created_by_unit: string;
  created_at: string;
  unit?: {
    name: string;
    code: string;
  } | null;
}

export default function TusiCatalogPage() {
  const supabase = createClient();

  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTusi, setSelectedTusi] = useState('ALL');
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Modal Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editTusiType, setEditTusiType] = useState('MSKI');
  const [editPeriodType, setEditPeriodType] = useState<PeriodType>('BULANAN');
  const [editDescription, setEditDescription] = useState('');
  const [editLegalBasis, setEditLegalBasis] = useState('');

  useEffect(() => {
    loadUserAndTemplates();
  }, []);

  const loadUserAndTemplates = async () => {
    setLoading(true);
    // 1. Ambil profil pengguna yang sedang login
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, role, unit_id')
        .eq('id', user.id)
        .single();
      if (profile) setCurrentUserProfile(profile);
    }

    // 2. Ambil daftar master tusi
    await fetchTemplates();
    setLoading(false);
  };

  const fetchTemplates = async () => {
    const { data } = await supabase
      .from('task_templates')
      .select('*, unit:units(name, code)')
      .order('created_at', { ascending: false });
    if (data) setTemplates(data as TemplateItem[]);
  };

  // Cek apakah user memiliki hak mengelola (SUPER_ADMIN atau berasal dari unit pembuat)
  const canManageTemplate = (template: TemplateItem) => {
    if (!currentUserProfile) return false;
    if (currentUserProfile.role === 'SUPER_ADMIN') return true;
    return currentUserProfile.unit_id === template.created_by_unit;
  };

  // Buka Modal Edit
  const openEditModal = (template: TemplateItem) => {
    setEditingTemplateId(template.id);
    setEditTitle(template.title);
    setEditTusiType(template.tusi_type || 'MSKI');
    setEditPeriodType(template.period_type || 'BULANAN');
    setEditDescription(template.description || '');
    setEditLegalBasis(template.legal_basis || '');
    setErrorMsg('');
    setIsEditModalOpen(true);
  };

  // Submit Perubahan Master Tusi
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplateId) return;

    if (!editTitle.trim()) {
      setErrorMsg('Judul tusi wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    const { error } = await supabase
      .from('task_templates')
      .update({
        title: editTitle.trim(),
        tusi_type: editTusiType.trim().toUpperCase(),
        period_type: editPeriodType,
        description: editDescription.trim() || null,
        legal_basis: editLegalBasis.trim() || null,
      })
      .eq('id', editingTemplateId);

    setIsSubmitting(false);

    if (error) {
      setErrorMsg(`Gagal memperbarui tusi: ${error.message}`);
    } else {
      setIsEditModalOpen(false);
      setSuccessMsg('Master Tusi berhasil diperbarui!');
      fetchTemplates();
      setTimeout(() => setSuccessMsg(''), 3500);
    }
  };

  // Hapus Master Tusi
  const handleDeleteTemplate = async (templateId: string, title: string) => {
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus master tusi "${title}"?\n\nCatatan: Tindakan ini tidak akan menghapus tugas yang sudah terlanjur dikloning pada periode aktif.`
    );
    if (!confirmed) return;

    const { error } = await supabase
      .from('task_templates')
      .delete()
      .eq('id', templateId);

    if (error) {
      alert(`Gagal menghapus template: ${error.message}`);
    } else {
      setSuccessMsg(`Master Tusi "${title}" berhasil dihapus.`);
      fetchTemplates();
      setTimeout(() => setSuccessMsg(''), 3500);
    }
  };

  // Kloning Master Tusi ke Tugas Unit Pengguna
  const handleCloneTask = async (template: TemplateItem) => {
    setCloningId(template.id);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('profiles')
      .select('unit_id')
      .eq('id', user?.id)
      .single();

    if (!profile) {
      setCloningId(null);
      return;
    }

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

  // Ambil list unik tusi_type untuk filter pills
  const availableTusiTypes = ['ALL', 'MSKI', 'PD', 'BANK', 'VERA', 'UMUM'];

  const filtered = templates.filter((t) => {
    const matchSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.tusi_type?.toLowerCase().includes(search.toLowerCase()) ||
      t.legal_basis?.toLowerCase().includes(search.toLowerCase());
    const matchTusi = selectedTusi === 'ALL' || t.tusi_type === selectedTusi;
    return matchSearch && matchTusi;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2 sm:p-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Bank Tusi & Katalog Pekerjaan</h1>
          <p className="text-xs text-stone-500 mt-1">
            Koleksi standar tugas fungsi unit vertikal yang dapat diadopsi dan dikelola.
          </p>
        </div>

        <Link
          href="/tusi-catalog/new"
          className="inline-flex items-center gap-2 bg-[#DF3B68] text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-sm hover:bg-[#C72F58] transition-all self-start sm:self-auto"
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
      <div className="bg-white border border-stone-200/70 rounded-3xl p-3 md:p-4 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Cari judul pekerjaan atau dasar hukum..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-stone-50/60 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20 focus:border-[#DF3B68]"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {availableTusiTypes.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedTusi(type)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedTusi === type ? 'bg-stone-900 text-white shadow-xs' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Katalog Template */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full bg-white border border-stone-200/60 rounded-3xl p-16 text-center text-xs text-stone-400 shadow-sm">
            Memuat master bank tusi...
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full bg-white border border-stone-200/60 rounded-3xl p-12 text-center space-y-2 shadow-sm">
            <ShieldAlert className="w-8 h-8 text-stone-300 mx-auto" />
            <p className="text-xs font-semibold text-stone-700">Belum ada template tusi yang sesuai</p>
            <p className="text-[11px] text-stone-400">Silakan sesuaikan kata kunci pencarian atau tambah standar tusi baru.</p>
          </div>
        ) : (
          filtered.map((t) => {
            const hasManageAccess = canManageTemplate(t);

            return (
              <div
                key={t.id}
                className="bg-white border border-stone-200/70 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#DF3B68]/10 text-[#DF3B68]">
                        {t.tusi_type}
                      </span>
                      <span className="text-[10px] font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                        {t.period_type}
                      </span>
                    </div>

                    {/* Tombol Akses Kelola (Edit & Hapus) jika memiliki otorisasi */}
                    {hasManageAccess && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(t)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                          title="Edit Master Tusi"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(t.id, t.title)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Hapus Master Tusi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
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
                  <span className="text-[10px] text-stone-400 truncate max-w-[140px]" title={t.unit?.name ?? 'Pusat'}>
                    Oleh: {t.unit?.name ?? 'Pusat'}
                  </span>
                  <button
                    onClick={() => handleCloneTask(t)}
                    disabled={cloningId === t.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-900 text-white text-[11px] font-medium hover:bg-stone-800 disabled:opacity-50 transition-colors shadow-2xs"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {cloningId === t.id ? 'Mengkloning...' : 'Kloning Tugas'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Form Edit Master Tusi */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-stone-200/80 shadow-2xl p-6 md:p-8 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-stone-900 text-sm md:text-base">
                  Edit Master Tusi
                </h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-full text-stone-400 hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <Input
                label="Judul Tugas / Master Tusi *"
                placeholder="Contoh: Rekonsiliasi Laporan Keuangan UAKPA"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 text-left">
                  <label className="block text-xs font-semibold text-stone-600">Tipe Tusi *</label>
                  <input
                    type="text"
                    value={editTusiType}
                    onChange={(e) => setEditTusiType(e.target.value)}
                    placeholder="MSKI, PD, VERA, dsb."
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 uppercase focus:outline-none focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="block text-xs font-semibold text-stone-600">Siklus Periode *</label>
                  <select
                    value={editPeriodType}
                    onChange={(e) => setEditPeriodType(e.target.value as PeriodType)}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="BULANAN">Bulanan</option>
                    <option value="TRIWULANAN">Triwulanan</option>
                    <option value="SEMESTERAN">Semesteran</option>
                    <option value="TAHUNAN">Tahunan</option>
                    <option value="INSIDENTIL">Insidentil</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1 text-left">
                <label className="block text-xs font-semibold text-stone-600">Dasar Hukum (Opsional)</label>
                <input
                  type="text"
                  placeholder="Contoh: PER-5/PB/2024 atau PMK 210/2022"
                  value={editLegalBasis}
                  onChange={(e) => setEditLegalBasis(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="block text-xs font-semibold text-stone-600">Deskripsi / Uraian Detail (Opsional)</label>
                <textarea
                  rows={3}
                  placeholder="Uraian prosedur pelaksanaan tusi..."
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full p-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  isLoading={isSubmitting}
                  className="bg-primary hover:bg-primary-hover text-white font-semibold"
                >
                  Simpan Perubahan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
