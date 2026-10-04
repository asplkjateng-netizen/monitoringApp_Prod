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
  AlertCircle,
  Clock,
  Building2,
  Sparkles
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
  deadline_rule?: string | null;
  exact_day?: number | null;
  is_recurring?: boolean;
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
  const [userTusiType, setUserTusiType] = useState<string>('UMUM');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

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
  const [editTusiType, setEditTusiType] = useState('ASPLK');
  const [editPeriodType, setEditPeriodType] = useState<PeriodType>('BULANAN');
  const [editDeadlineRule, setEditDeadlineRule] = useState('NEXT_MONTH_DATE');
  const [editExactDay, setEditExactDay] = useState(15);
  const [editCustomDayInput, setEditCustomDayInput] = useState('15');
  const [editDescription, setEditDescription] = useState('');
  const [editLegalBasis, setEditLegalBasis] = useState('');

  useEffect(() => {
    loadUserAndTemplates();
  }, []);

  const loadUserAndTemplates = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    let currentTusi = 'UMUM';
    let adminFlag = false;

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, role, unit_id, unit:units(id, name, code, tusi_type)')
        .eq('id', user.id)
        .single();

      if (profile) {
        setCurrentUserProfile(profile);
        currentTusi = (profile.unit as any)?.tusi_type || 'UMUM';
        adminFlag = String(profile.role).toUpperCase() === 'SUPER_ADMIN';
        
        setUserTusiType(currentTusi);
        setIsSuperAdmin(adminFlag);
        setSelectedTusi(adminFlag ? 'ALL' : currentTusi);
      }
    }

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

  const canManageTemplate = (template: TemplateItem) => {
    if (!currentUserProfile) return false;
    if (isSuperAdmin) return true;
    return currentUserProfile.unit_id === template.created_by_unit;
  };

  const openEditModal = (template: TemplateItem) => {
    setEditingTemplateId(template.id);
    setEditTitle(template.title);
    setEditTusiType(template.tusi_type || 'ASPLK');
    setEditPeriodType(template.period_type || 'BULANAN');
    setEditDeadlineRule(template.deadline_rule || 'NEXT_MONTH_DATE');
    const day = template.exact_day || 15;
    setEditExactDay(day);
    setEditCustomDayInput(String(day));
    setEditDescription(template.description || '');
    setEditLegalBasis(template.legal_basis || '');
    setErrorMsg('');
    setIsEditModalOpen(true);
  };

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
        deadline_rule: editPeriodType === 'INSIDENTIL' ? 'MANUAL' : editDeadlineRule,
        exact_day: editExactDay,
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

  const handleDeleteTemplate = async (templateId: string, title: string) => {
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus master tusi "${title}"?\n\nTindakan ini tidak akan menghapus tugas yang sudah terlanjur dikloning pada periode aktif.`
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

  const calculateDeadlineForClone = (template: TemplateItem): string => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const rule = template.deadline_rule || 'END_OF_PERIOD';
    const day = template.exact_day || 31;

    let targetYear = currentYear;
    let targetMonth = currentMonth;

    if (template.period_type === 'BULANAN') {
      if (rule === 'NEXT_MONTH_DATE') {
        targetMonth = currentMonth + 1;
        if (targetMonth > 12) { targetMonth = 1; targetYear += 1; }
      }
    } else if (template.period_type === 'TRIWULANAN') {
      const currentQuarter = Math.ceil(currentMonth / 3);
      const qEnd = currentQuarter * 3;
      const qStart = (currentQuarter - 1) * 3 + 1;

      if (rule === 'END_OF_PERIOD') targetMonth = qEnd;
      else if (rule === 'NEXT_MONTH_DATE') {
        targetMonth = qEnd + 1;
        if (targetMonth > 12) { targetMonth = 1; targetYear += 1; }
      } else if (rule === 'SAME_MONTH_DATE') targetMonth = qStart;
    } else if (template.period_type === 'SEMESTERAN') {
      const isSem1 = currentMonth <= 6;
      const sEnd = isSem1 ? 6 : 12;
      const sStart = isSem1 ? 1 : 7;

      if (rule === 'END_OF_PERIOD') targetMonth = sEnd;
      else if (rule === 'NEXT_MONTH_DATE') {
        targetMonth = sEnd + 1;
        if (targetMonth > 12) { targetMonth = 1; targetYear += 1; }
      } else if (rule === 'SAME_MONTH_DATE') targetMonth = sStart;
    } else if (template.period_type === 'TAHUNAN') {
      if (rule === 'NEXT_MONTH_DATE') { targetMonth = 1; targetYear += 1; }
      else targetMonth = 12;
    }

    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    const finalDay = day >= 31 ? daysInMonth : Math.min(day, daysInMonth);
    return `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(finalDay).padStart(2, '0')}`;
  };

  // KLONING TUGAS: Otomatis masuk ke unit staf yang login & otomatis jadikan staf sebagai PIC
  const handleCloneTask = async (template: TemplateItem) => {
    setCloningId(template.id);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !currentUserProfile?.unit_id) {
      setCloningId(null);
      setErrorMsg('Sesi tidak valid. Harap muat ulang halaman.');
      return;
    }

    const now = new Date();
    const deadlineStr = calculateDeadlineForClone(template);

    // Hitung period_month akurat
    let periodMonth = now.getMonth() + 1;
    if (template.period_type === 'TRIWULANAN') {
      periodMonth = Math.ceil(periodMonth / 3) * 3;
    } else if (template.period_type === 'SEMESTERAN') {
      periodMonth = periodMonth <= 6 ? 6 : 12;
    } else if (template.period_type === 'TAHUNAN') {
      periodMonth = 12;
    }

    // 1. Insert ke tabel tasks unit pemohon
    const { data: newTask, error: taskError } = await supabase
      .from('tasks')
      .insert({
        unit_id: currentUserProfile.unit_id,
        template_id: template.id,
        title: template.title,
        description: template.description,
        legal_basis: template.legal_basis,
        period_type: template.period_type,
        period_month: periodMonth,
        period_year: now.getFullYear(),
        deadline: deadlineStr,
        status: 'BELUM_DIKERJAKAN',
        progress_pct: 0,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (taskError || !newTask) {
      setCloningId(null);
      setErrorMsg(`Gagal mengkloning: ${taskError?.message || 'Kesalahan sistem'}`);
      return;
    }

    // 2. Daftarkan staf pengkloning langsung sebagai PIC di task_pics
    await supabase.from('task_pics').insert({
      task_id: newTask.id,
      user_id: user.id,
    });

    setCloningId(null);
    setSuccessMsg(
      `Tusi "${template.title}" berhasil dikloning ke unit Anda dan otomatis masuk ke daftar tugas Anda! (Tenggat: ${deadlineStr})`
    );
    setTimeout(() => setSuccessMsg(''), 4500);
  };

  // Kumpulan tombol filter tusi dinamis dari data yang ada
  const dynamicTusiList = Array.from(
    new Set(['ALL', userTusiType, ...templates.map((t) => t.tusi_type?.toUpperCase()).filter(Boolean)])
  );

  // Filter scoped: Staf biasa otomatis hanya melihat Tusi sejenis (misal ASPLK)
  const filtered = templates.filter((t) => {
    const matchSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.tusi_type?.toLowerCase().includes(search.toLowerCase()) ||
      t.legal_basis?.toLowerCase().includes(search.toLowerCase());

    if (!matchSearch) return false;

    if (!isSuperAdmin) {
      // Non-admin hanya melihat tusi sejenis (misal ASPLK)
      return t.tusi_type?.toUpperCase() === userTusiType.toUpperCase();
    }

    // Super Admin bebas memilih ALL atau tusi spesifik
    return selectedTusi === 'ALL' || t.tusi_type?.toUpperCase() === selectedTusi.toUpperCase();
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2 sm:p-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Bank Tusi & Katalog Pekerjaan</h1>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-[#DF3B68] border border-rose-200">
              Seksi {userTusiType}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            {!isSuperAdmin 
              ? `Menampilkan standar tugas fungsi Seksi ${userTusiType} dari seluruh unit/KPPN se-wilayah yang dapat Anda adopsi secara instan.`
              : 'Koleksi master standar tugas fungsi seluruh unit vertikal.'}
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

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filter & Pencarian Bar */}
      <div className="bg-white border border-stone-200/70 rounded-3xl p-3 md:p-4 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder={`Cari judul pekerjaan atau dasar hukum ${!isSuperAdmin ? `Seksi ${userTusiType}...` : '...'}`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-stone-50/60 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20 focus:border-[#DF3B68]"
          />
        </div>

        {/* Filter Tusi: Super Admin dapat memilih kategori lain, staf biasa terkunci pada Tusi unitnya */}
        {isSuperAdmin ? (
          <div className="flex gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {dynamicTusiList.map((type) => (
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
        ) : (
          <div className="flex items-center gap-1.5 bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200 text-xs text-stone-600">
            <Sparkles className="w-3.5 h-3.5 text-[#DF3B68]" />
            <span>Kategori: <strong>{userTusiType} (Terkunci Sesuai Unit)</strong></span>
          </div>
        )}
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
            <p className="text-xs font-semibold text-stone-700">
              Belum ada master tusi untuk kategori {userTusiType}
            </p>
            <p className="text-[11px] text-stone-400">
              Tugas yang Anda rekam dengan opsi "Simpan ke Katalog Tusi" akan otomatis muncul di sini untuk dikloning oleh seksi Anda.
            </p>
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
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#DF3B68]/10 text-[#DF3B68]">
                        {t.tusi_type}
                      </span>
                      <span className="text-[10px] font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full">
                        {t.period_type}
                      </span>
                    </div>

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

                  {t.period_type !== 'INSIDENTIL' && (
                    <div className="pt-1 flex items-center gap-1 text-[10px] font-medium text-stone-500">
                      <Clock className="w-3 h-3 text-[#DF3B68]" />
                      <span>
                        {`Batas: ${t.exact_day === 31 ? 'Akhir Bulan' : `Tgl ${t.exact_day}`} (${t.deadline_rule === 'NEXT_MONTH_DATE' ? 'M+1' : t.deadline_rule === 'SAME_MONTH_DATE' ? 'Awal Periode' : 'Akhir Periode'})`}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-[10px] text-stone-400 truncate max-w-[130px]" title={t.unit?.name ?? 'Pusat'}>
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
          <div className="bg-white w-full max-w-lg rounded-3xl border border-stone-200/80 shadow-2xl p-6 md:p-8 space-y-5">
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

              {editPeriodType !== 'INSIDENTIL' && (
                <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2.5">
                  <span className="text-xs font-bold text-stone-800 block">Formula Batas Tenggat Siklus:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-stone-500 mb-0.5">1. Posisi Bulan:</label>
                      <select
                        value={editDeadlineRule}
                        onChange={(e) => setEditDeadlineRule(e.target.value)}
                        className="w-full p-2 rounded-lg border border-stone-200 bg-white text-xs"
                      >
                        <option value="NEXT_MONTH_DATE">Bulan Berikutnya (M+1)</option>
                        <option value="END_OF_PERIOD">Bulan Terakhir Periode</option>
                        <option value="SAME_MONTH_DATE">Awal Periode</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-stone-500 mb-0.5">2. Tanggal:</label>
                      <div className="flex gap-1.5">
                        <select
                          value={editExactDay === 31 ? '31' : [5, 10, 15, 20, 25].includes(editExactDay) ? String(editExactDay) : 'CUSTOM'}
                          onChange={(e) => {
                            if (e.target.value === 'CUSTOM') {
                              setEditExactDay(15);
                              setEditCustomDayInput('15');
                            } else {
                              const val = Number(e.target.value);
                              setEditExactDay(val);
                              setEditCustomDayInput(String(val));
                            }
                          }}
                          className="w-1/2 p-2 rounded-lg border border-stone-200 bg-white text-xs"
                        >
                          <option value="31">Akhir Bulan</option>
                          <option value="5">Tgl 5</option>
                          <option value="10">Tgl 10</option>
                          <option value="15">Tgl 15</option>
                          <option value="20">Tgl 20</option>
                          <option value="25">Tgl 25</option>
                          <option value="CUSTOM">Bebas</option>
                        </select>

                        <input
                          type="number"
                          min={1}
                          max={31}
                          value={editCustomDayInput}
                          onChange={(e) => {
                            setEditCustomDayInput(e.target.value);
                            const val = Number(e.target.value);
                            if (val >= 1 && val <= 31) setEditExactDay(val);
                          }}
                          className="w-1/2 p-2 rounded-lg border border-stone-200 bg-white text-xs font-mono text-center"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1 text-left">
                <label className="block text-xs font-semibold text-stone-600">Dasar Hukum (Opsional)</label>
                <input
                  type="text"
                  value={editLegalBasis}
                  onChange={(e) => setEditLegalBasis(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="block text-xs font-semibold text-stone-600">Deskripsi / Prosedur (Opsional)</label>
                <textarea
                  rows={3}
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
