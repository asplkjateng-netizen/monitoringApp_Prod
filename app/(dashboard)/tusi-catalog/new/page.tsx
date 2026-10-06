'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, Info, Sparkles, Tag, RotateCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { PeriodType } from '@/types/database.types';

// Daftar standar Rumpun Tusi gabungan Kanwil dan KPPN
const DEFAULT_TUSI_OPTIONS = [
  'ASPLK',
  'PPA I',
  'PPA II',
  'SKKI',
  'MSKI',
  'PD',
  'BANK',
  'VERA',
  'UMUM'
];

export default function NewTusiPage() {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState('');
  const [tusiType, setTusiType] = useState('ASPLK');
  const [availableTusiList, setAvailableTusiList] = useState<string[]>(DEFAULT_TUSI_OPTIONS);
  const [category, setCategory] = useState<'TUSI' | 'TAMBAHAN' | 'IMPROVISASI'>('TUSI');
  const [periodType, setPeriodType] = useState<PeriodType>('TRIWULANAN');
  const [description, setDescription] = useState('');
  const [legalBasis, setLegalBasis] = useState('');
  const [legalBasisLink, setLegalBasisLink] = useState('');

  // Aturan Siklus Formula Fleksibel
  const [deadlineRule, setDeadlineRule] = useState<string>('NEXT_MONTH_DATE');
  const [exactDay, setExactDay] = useState<number>(15);
  const [customDayInput, setCustomDayInput] = useState<string>('15');
  const [isRecurring, setIsRecurring] = useState<boolean>(true);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Muat identitas profil & unit pengguna untuk auto-select Rumpun Tusi
  useEffect(() => {
    loadUserUnitTusi();
  }, []);

  const loadUserUnitTusi = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('unit_id, unit:units(id, name, tusi_type)')
        .eq('id', user.id)
        .single();

      if (profile && (profile.unit as any)?.tusi_type) {
        const userTusi = String((profile.unit as any).tusi_type).trim().toUpperCase();
        setTusiType(userTusi);
        setAvailableTusiList((prev) => Array.from(new Set([userTusi, ...prev])));
      }
    } catch (err) {
      console.error('Gagal memuat tusi profil:', err);
    }
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

    // Proteksi cek duplikasi sebelum insert
    const { data: existingTpl } = await supabase
      .from('task_templates')
      .select('id')
      .ilike('title', title.trim())
      .eq('tusi_type', tusiType.toUpperCase())
      .maybeSingle();

    if (existingTpl) {
      setErrorMsg(`Master Tusi dengan judul "${title.trim()}" pada seksi ${tusiType} sudah ada. Silakan edit dari katalog.`);
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('task_templates').insert({
      title: title.trim(),
      tusi_type: tusiType.toUpperCase(),
      category: category,
      period_type: periodType,
      description: description.trim() || null,
      legal_basis: legalBasis.trim() || null,
      legal_basis_link: legalBasisLink.trim() || null,
      deadline_rule: periodType === 'INSIDENTIL' ? 'MANUAL' : deadlineRule,
      exact_day: exactDay,
      is_recurring: periodType !== 'INSIDENTIL' ? isRecurring : false,
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
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/tusi-catalog" className="inline-flex items-center text-xs font-semibold text-stone-500 hover:text-stone-900 gap-1">
        <ArrowLeft className="w-4 h-4" /> Kembali ke Katalog
      </Link>

      <div className="bg-white border border-stone-200/60 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#DF3B68] bg-[#DF3B68]/10 px-2.5 py-1 rounded-full">
            Master Bank Data
          </span>
          <h1 className="text-xl font-bold text-stone-900 mt-2">Buat Master Template Tusi</h1>
          <p className="text-xs text-stone-500 mt-1">
            Daftarkan standar tugas agar bisa diadopsi satker dan digenerate otomatis setiap awal periode.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Klasifikasi Jenis Pekerjaan */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-stone-700 flex items-center gap-1.5">
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
                      : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
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
              <label className="block text-xs font-semibold text-stone-600 mb-1 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#DF3B68]" />
                <span>Rumpun Tusi *</span>
              </label>
              <select
                className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20"
                value={tusiType}
                onChange={(e) => setTusiType(e.target.value)}
              >
                {availableTusiList.map((t) => (
                  <option key={t} value={t}>
                    {t} {t === 'ASPLK' ? '⭐ (Kanwil Akuntansi)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Siklus Periode *</label>
              <select
                className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20"
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value as PeriodType)}
              >
                {['TRIWULANAN', 'BULANAN', 'SEMESTERAN', 'TAHUNAN', 'INSIDENTIL'].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Pengaturan Formula Tenggat Siklus Fleksibel */}
          {periodType !== 'INSIDENTIL' && (
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
                <Clock className="w-4 h-4 text-[#DF3B68]" />
                <span>Formula Batas Tenggat Waktu Siklus</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-stone-600 mb-1">1. Posisi Bulan Batas:</label>
                  <select
                    value={deadlineRule}
                    onChange={(e) => setDeadlineRule(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs"
                  >
                    <option value="NEXT_MONTH_DATE">Bulan Berikutnya (M+1)</option>
                    <option value="END_OF_PERIOD">Bulan Terakhir Periode Berkenaan</option>
                    <option value="SAME_MONTH_DATE">Awal Periode / Bulan Berjalan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-stone-600 mb-1">2. Penetapan Tanggal:</label>
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
                      className="w-1/2 px-2.5 py-2 rounded-xl border border-stone-200 bg-white text-xs"
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
                      className="w-1/2 px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs font-mono text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Simulasi Preview */}
              <div className="p-2.5 bg-white rounded-xl border border-stone-200 text-xs text-stone-700 flex items-start gap-2">
                <Info className="w-4 h-4 text-[#DF3B68] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-stone-900">Simulasi Pola Tenggat:</p>
                  <p className="text-[11px] text-stone-600 mt-0.5">{getCyclePreviewSimulation()}</p>
                </div>
              </div>

              {/* Sakelar Klerikal Rutin */}
              <label className="flex items-center gap-2 cursor-pointer pt-1 bg-white p-2.5 rounded-xl border border-stone-200">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="rounded text-[#DF3B68] focus:ring-[#DF3B68] w-4 h-4"
                />
                <div className="text-xs">
                  <span className="font-bold text-stone-800 flex items-center gap-1">
                    <RotateCw className="w-3 h-3 text-emerald-600" />
                    Pekerjaan Klerikal Rutin (Auto-Cycle)
                  </span>
                  <span className="text-[11px] text-stone-500 block">
                    Cron sistem akan membangkitkan tugas otomatis setiap awal siklus
                  </span>
                </div>
              </label>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">Deskripsi / Prosedur Ringkas</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan tahapan teknis atau output yang diharapkan..."
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input 
              label="Dasar Hukum / Regulasi" 
              placeholder="Misal: PER-5/PB/2024" 
              value={legalBasis} 
              onChange={(e) => setLegalBasis(e.target.value)} 
            />

            <Input 
              label="Link Regulasi Cloud / JDIH" 
              placeholder="https://jdih.kemenkeu.go.id/..." 
              value={legalBasisLink} 
              onChange={(e) => setLegalBasisLink(e.target.value)} 
            />
          </div>

          <div className="pt-2">
            <Button type="submit" isLoading={loading} className="w-full bg-[#DF3B68] hover:bg-[#C72F58] text-white">
              Simpan Master Tusi
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
