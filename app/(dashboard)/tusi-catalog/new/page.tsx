'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Clock, 
  Info, 
  Sparkles, 
  Tag, 
  RotateCw, 
  Plus, 
  Trash2, 
  BookOpen, 
  Wrench, 
  FileText,
  Link as LinkIcon,
  Award
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import type { PeriodType } from '@/types/database.types';

interface LinkItem {
  name: string;
  url: string;
}

export default function NewTusiPage() {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState('');
  const [tusiType, setTusiType] = useState('');
  const [availableTusiList, setAvailableTusiList] = useState<string[]>([]);
  const [category, setCategory] = useState<'TUSI' | 'TAMBAHAN' | 'IMPROVISASI'>('TUSI');
  const [periodType, setPeriodType] = useState<PeriodType>('TRIWULANAN');
  const [description, setDescription] = useState('');

  // Multi-Regulasi & Tools
  const [regulations, setRegulations] = useState<LinkItem[]>([{ name: '', url: '' }]);
  const [tools, setTools] = useState<LinkItem[]>([]);

  // Aturan Siklus Formula
  const [deadlineRule, setDeadlineRule] = useState<string>('NEXT_MONTH_DATE');
  const [exactDay, setExactDay] = useState<number>(15);
  const [customDayInput, setCustomDayInput] = useState<string>('15');
  const [isRecurring, setIsRecurring] = useState<boolean>(true);

  // Target Nilai Maksimal (H-X)
  const [enableMaxScore, setEnableMaxScore] = useState<boolean>(true);
  const [maxScoreDaysBefore, setMaxScoreDaysBefore] = useState<number>(2);

  const [loading, setLoading] = useState(false);
  const [fetchingHierarchy, setFetchingHierarchy] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadHierarchyAndProfile();
  }, []);

  const loadHierarchyAndProfile = async () => {
    setFetchingHierarchy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let userUnitTusi = '';

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('unit_id, unit:units(id, name, tusi_type)')
          .eq('id', user.id)
          .maybeSingle();

        if (profile && (profile.unit as any)?.tusi_type) {
          userUnitTusi = String((profile.unit as any).tusi_type).trim().toUpperCase();
        }
      }

      const { data: seksiUnits, error: unitError } = await supabase
        .from('units')
        .select('tusi_type')
        .eq('level', 'SEKSI')
        .not('tusi_type', 'is', null);

      if (unitError) throw unitError;

      const distinctTusi = Array.from(
        new Set(
          (seksiUnits || [])
            .map((u) => u.tusi_type?.trim().toUpperCase())
            .filter(Boolean) as string[]
        )
      ).sort();

      setAvailableTusiList(distinctTusi);

      if (userUnitTusi && distinctTusi.includes(userUnitTusi)) {
        setTusiType(userUnitTusi);
      } else if (distinctTusi.length > 0) {
        setTusiType(distinctTusi[0]);
      } else if (userUnitTusi) {
        setTusiType(userUnitTusi);
        setAvailableTusiList([userUnitTusi]);
      }
    } catch (err: any) {
      console.error('Gagal memuat hirarki tusi unit:', err.message);
      setErrorMsg('Gagal memuat daftar seksi hirarki. Pastikan unit tingkat SEKSI sudah didaftarkan.');
    } finally {
      setFetchingHierarchy(false);
    }
  };

  const handleAddRegulation = () => setRegulations((prev) => [...prev, { name: '', url: '' }]);
  const handleRemoveRegulation = (idx: number) => setRegulations((prev) => prev.filter((_, i) => i !== idx));
  const handleRegulationChange = (idx: number, field: 'name' | 'url', val: string) => {
    setRegulations((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const handleAddTool = () => setTools((prev) => [...prev, { name: '', url: '' }]);
  const handleRemoveTool = (idx: number) => setTools((prev) => prev.filter((_, i) => i !== idx));
  const handleToolChange = (idx: number, field: 'name' | 'url', val: string) => {
    setTools((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const getCyclePreviewSimulation = () => {
    const dayStr = exactDay >= 31 ? 'Akhir Bulan' : `Tanggal ${exactDay}`;
    if (periodType === 'TRIWULANAN') {
      if (deadlineRule === 'NEXT_MONTH_DATE') {
        return `Simulasi: TW I → ${dayStr} April • TW II → ${dayStr} Juli • TW III → ${dayStr} Oktober • TW IV → ${dayStr} Januari (Thn Depan)`;
      } else if (deadlineRule === 'END_OF_PERIOD') {
        return `Simulasi: TW I → ${dayStr} Maret • TW II → ${dayStr} Juni • TW III → ${dayStr} September • TW IV → ${dayStr} Desember`;
      } else {
        return `Simulasi: TW I → ${dayStr} Januari • TW II → ${dayStr} April • TW III → ${dayStr} Juli • TW IV → ${dayStr} Oktober`;
      }
    } else if (periodType === 'SEMESTERAN') {
      if (deadlineRule === 'NEXT_MONTH_DATE') {
        return `Simulasi: Semester I → ${dayStr} Juli • Semester II → ${dayStr} Januari (Thn Depan)`;
      } else {
        return `Simulasi: Semester I → ${dayStr} Juni • Semester II → ${dayStr} Desember`;
      }
    } else if (periodType === 'BULANAN') {
      return deadlineRule === 'NEXT_MONTH_DATE'
        ? `Simulasi: Periode berjalan → ${dayStr} di bulan berikutnya (M+1)`
        : `Simulasi: Periode berjalan → ${dayStr} di bulan berkenaan`;
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (!tusiType) {
      setErrorMsg('Rumpun Tusi wajib dipilih.');
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('profiles')
      .select('unit_id')
      .eq('id', user?.id)
      .single();

    if (!profile) {
      setErrorMsg('Gagal memverifikasi unit kerja profil Anda');
      setLoading(false);
      return;
    }

    const { data: existingTpl } = await supabase
      .from('task_templates')
      .select('id')
      .ilike('title', title.trim())
      .eq('tusi_type', tusiType.toUpperCase())
      .maybeSingle();

    if (existingTpl) {
      setErrorMsg(`Master Tusi "${title.trim()}" untuk rumpun ${tusiType} sudah terdaftar.`);
      setLoading(false);
      return;
    }

    const validRegulations = regulations.filter((r) => r.name.trim() || r.url.trim());
    const validTools = tools.filter((t) => t.name.trim() || t.url.trim());
    const primaryLegalBasis = validRegulations.length > 0 ? validRegulations[0].name : null;
    const primaryLegalBasisLink = validRegulations.length > 0 ? validRegulations[0].url : null;

    const { error } = await supabase.from('task_templates').insert({
      title: title.trim(),
      tusi_type: tusiType.toUpperCase(),
      category: category,
      period_type: periodType,
      description: description.trim() || null,
      legal_basis: primaryLegalBasis,
      legal_basis_link: primaryLegalBasisLink,
      regulations: validRegulations,
      tools: validTools,
      deadline_rule: periodType === 'INSIDENTIL' ? 'MANUAL' : deadlineRule,
      exact_day: exactDay,
      is_recurring: periodType !== 'INSIDENTIL' ? isRecurring : false,
      max_score_days_before: enableMaxScore ? Number(maxScoreDaysBefore) || 0 : 0,
      created_by_unit: profile.unit_id,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    router.push('/tusi-catalog');
    router.refresh();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/tusi-catalog" className="inline-flex items-center text-xs font-semibold text-stone-500 dark:text-slate-400 hover:text-stone-900 dark:hover:text-slate-100 gap-1 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Kembali ke Katalog
      </Link>

      <div className="bg-white dark:bg-[#131B26] border border-stone-200/60 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 transition-colors">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#DF3B68] bg-[#DF3B68]/10 px-2.5 py-1 rounded-full">
            Master Bank Data
          </span>
          <h1 className="text-xl font-bold text-stone-900 dark:text-slate-100 mt-2">Buat Master Template Tusi</h1>
          <p className="text-xs text-stone-500 dark:text-slate-400 mt-1">
            Daftarkan standar tugas lengkap dengan format petunjuk teknis, target nilai maksimal, multi-dasar hukum, dan tools aplikasi kerja.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 rounded-2xl text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Klasifikasi Tugas */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#DF3B68]" />
              <span>Klasifikasi Tugas</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'TUSI', label: 'Tusi Pokok' },
                { id: 'TAMBAHAN', label: 'Tugas Tambahan' },
                { id: 'IMPROVISASI', label: 'Improvisasi' },
              ].map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setCategory(item.id as any)}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    category === item.id
                      ? 'border-[#DF3B68] bg-[#DF3B68]/10 text-[#DF3B68]'
                      : 'border-stone-200 dark:border-white/10 bg-white dark:bg-[#1A2332] text-stone-600 dark:text-slate-300 hover:bg-stone-50 dark:hover:bg-[#243044]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <Input 
            label="Judul Tugas / Tusi *" 
            placeholder="Misal: Telaah Laporan Keuangan BLU Triwulanan" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            required 
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#DF3B68]" />
                  <span>Rumpun Tusi (Level Seksi) *</span>
                </span>
                <span className="text-[10px] text-stone-400 dark:text-slate-500">Dari Hierarki</span>
              </label>

              {fetchingHierarchy ? (
                <div className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#1A2332] text-xs text-stone-400">
                  Memuat seksi hierarki...
                </div>
              ) : (
                <select
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#1A2332] text-xs font-bold text-stone-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20"
                  value={tusiType}
                  onChange={(e) => setTusiType(e.target.value)}
                  required
                >
                  {availableTusiList.length === 0 ? (
                    <option value="">-- Belum ada seksi di hierarki --</option>
                  ) : (
                    availableTusiList.map((t) => (
                      <option key={t} value={t}>
                        Seksi {t}
                      </option>
                    ))
                  )}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 dark:text-slate-300 mb-1">Siklus Periode *</label>
              <select
                className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#1A2332] text-xs font-semibold text-stone-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20"
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value as PeriodType)}
              >
                {['TRIWULANAN', 'BULANAN', 'SEMESTERAN', 'TAHUNAN', 'INSIDENTIL'].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Formula Batas Tenggat */}
          {periodType !== 'INSIDENTIL' && (
            <div className="p-4 bg-stone-50 dark:bg-[#0E1520] rounded-2xl border border-stone-200/80 dark:border-white/10 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 dark:text-slate-200">
                <Clock className="w-4 h-4 text-[#DF3B68]" />
                <span>Formula Batas Tenggat Waktu Siklus</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-stone-600 dark:text-slate-400 mb-1">1. Posisi Bulan Batas:</label>
                  <select
                    value={deadlineRule}
                    onChange={(e) => setDeadlineRule(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#1A2332] text-xs text-stone-800 dark:text-slate-200"
                  >
                    <option value="NEXT_MONTH_DATE">Bulan Berikutnya (M+1)</option>
                    <option value="END_OF_PERIOD">Bulan Terakhir Periode Berkenaan</option>
                    <option value="SAME_MONTH_DATE">Awal Periode / Bulan Berjalan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-stone-600 dark:text-slate-400 mb-1">2. Penetapan Tanggal:</label>
                  <div className="flex gap-2">
                    <select
                      value={exactDay === 31 ? '31' : [5, 10, 15, 20, 25].includes(exactDay) ? String(exactDay) : 'CUSTOM'}
                      onChange={(e) => {
                        if (e.target.value === 'CUSTOM') {
                          setExactDay(15);
                          setCustomDayInput('15');
                        } else {
                          const val = Number(e.target.value);
                          setExactDay(val);
                          setCustomDayInput(String(val));
                        }
                      }}
                      className="w-1/2 px-2.5 py-2 rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#1A2332] text-xs text-stone-800 dark:text-slate-200"
                    >
                      <option value="31">Akhir Bulan (Max)</option>
                      <option value="5">Tgl 5</option>
                      <option value="10">Tgl 10</option>
                      <option value="15">Tgl 15</option>
                      <option value="20">Tgl 20</option>
                      <option value="25">Tgl 25</option>
                      <option value="CUSTOM">Bebas (Input)</option>
                    </select>

                    <input
                      type="number"
                      min={1}
                      max={31}
                      placeholder="Tgl 1-31"
                      value={customDayInput}
                      onChange={(e) => {
                        setCustomDayInput(e.target.value);
                        const val = Number(e.target.value);
                        if (val >= 1 && val <= 31) setExactDay(val);
                      }}
                      className="w-1/2 px-3 py-2 rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#1A2332] text-xs font-mono text-center text-stone-900 dark:text-slate-100 font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="p-2.5 bg-white dark:bg-[#131B26] rounded-xl border border-stone-200 dark:border-white/10 text-xs text-stone-700 dark:text-slate-300 flex items-start gap-2">
                <Info className="w-4 h-4 text-[#DF3B68] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-stone-900 dark:text-slate-100">Simulasi Pola Tenggat:</p>
                  <p className="text-[11px] text-stone-600 dark:text-slate-400 mt-0.5">{getCyclePreviewSimulation()}</p>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1 bg-white dark:bg-[#131B26] p-2.5 rounded-xl border border-stone-200 dark:border-white/10">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="rounded text-[#DF3B68] focus:ring-[#DF3B68] w-4 h-4 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-stone-800 dark:text-slate-200 flex items-center gap-1">
                    <RotateCw className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    Pekerjaan Klerikal Rutin (Auto-Cycle)
                  </span>
                  <span className="text-[11px] text-stone-500 dark:text-slate-400 block">
                    Cron sistem akan membangkitkan tugas otomatis setiap awal siklus
                  </span>
                </div>
              </label>

              {/* TARGET NILAI MAKSIMAL PADA MASTER */}
              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 rounded-xl border border-amber-200/80 dark:border-amber-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-200">
                    <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>Target Nilai Maksimal Default (H-X)</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={enableMaxScore}
                      onChange={(e) => setEnableMaxScore(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-200">Aktifkan H-X</span>
                  </label>
                </div>

                {enableMaxScore && (
                  <div className="flex items-center gap-2 pt-1 text-xs text-amber-800 dark:text-amber-300">
                    <span>Maksimal Selesai H -</span>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={maxScoreDaysBefore}
                      onChange={(e) => setMaxScoreDaysBefore(Number(e.target.value))}
                      className="w-16 px-2 py-1 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-[#1A2332] text-xs font-bold text-center text-amber-900 dark:text-amber-200"
                    />
                    <span>hari kalender sebelum batas resmi</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* INPUT MULTI-DASAR HUKUM */}
          <div className="p-4 bg-stone-50/70 dark:bg-[#0E1520] rounded-2xl border border-stone-200 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-800 dark:text-slate-200 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-[#DF3B68]" />
                <span>Dasar Hukum & Tautan Regulasi</span>
              </label>
              <button
                type="button"
                onClick={handleAddRegulation}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#DF3B68] hover:text-[#C72F58]"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Dasar Hukum
              </button>
            </div>

            <div className="space-y-2">
              {regulations.map((reg, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    placeholder="Nomor Regulasi (contoh: PER-28/PB/2019)"
                    value={reg.name}
                    onChange={(e) => handleRegulationChange(idx, 'name', e.target.value)}
                    className="w-full sm:w-1/2 px-3 py-2 rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#1A2332] text-xs font-mono text-stone-900 dark:text-slate-100"
                  />
                  <div className="flex items-center gap-1.5 w-full sm:w-1/2">
                    <div className="relative flex-1">
                      <LinkIcon className="w-3.5 h-3.5 text-stone-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="url"
                        placeholder="https://jdih.kemenkeu.go.id/..."
                        value={reg.url}
                        onChange={(e) => handleRegulationChange(idx, 'url', e.target.value)}
                        className="w-full pl-8 pr-3 py-2 rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#1A2332] text-xs font-mono text-stone-900 dark:text-slate-100"
                      />
                    </div>
                    {regulations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRegulation(idx)}
                        className="p-2 text-stone-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        title="Hapus regulasi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* INPUT TOOLS */}
          <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Tools & Alat Kerja / Dokumen Pendukung (Label: Tools)</span>
                </label>
                <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                  Tautkan aplikasi kedinasan atau spreadsheet kerja yang relevan dengan tugas ini.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddTool}
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-200 bg-white dark:bg-[#1A2332] px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800/60 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Tools
              </button>
            </div>

            {tools.length === 0 ? (
              <p className="text-xs text-stone-400 dark:text-slate-500 italic">Belum ada tools ditambahkan. Klik tombol di atas jika diperlukan.</p>
            ) : (
              <div className="space-y-2">
                {tools.map((tool, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      placeholder="Nama Alat / Aplikasi (contoh: Aplikasi E-Rekon&LK)"
                      value={tool.name}
                      onChange={(e) => handleToolChange(idx, 'name', e.target.value)}
                      className="w-full sm:w-1/2 px-3 py-2 rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#1A2332] text-xs font-semibold text-stone-900 dark:text-slate-100"
                    />
                    <div className="flex items-center gap-1.5 w-full sm:w-1/2">
                      <div className="relative flex-1">
                        <LinkIcon className="w-3.5 h-3.5 text-stone-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="url"
                          placeholder="https://erekon-lk.kemenkeu.go.id/..."
                          value={tool.url}
                          onChange={(e) => handleToolChange(idx, 'url', e.target.value)}
                          className="w-full pl-8 pr-3 py-2 rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#1A2332] text-xs font-mono text-stone-900 dark:text-slate-100"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveTool(idx)}
                        className="p-2 text-stone-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        title="Hapus tools"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RICH TEXT EDITOR */}
          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#DF3B68]" />
              <span>Deskripsi / Petunjuk Teknis Master (Editor Dokumen)</span>
            </label>
            <RichTextEditor
              value={description}
              onChange={setDescription}
              placeholder="Tuliskan petunjuk teknis, formula IKU, ruang lingkup, dan waktu pelaksanaan secara rapi..."
            />
          </div>

          <div className="pt-2">
            <Button 
              type="submit" 
              isLoading={loading} 
              disabled={fetchingHierarchy || availableTusiList.length === 0}
              className="w-full bg-[#DF3B68] hover:bg-[#C72F58] text-white"
            >
              Simpan Master Tusi
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
