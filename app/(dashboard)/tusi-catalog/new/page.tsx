'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { PeriodType } from '@/types/database.types';

export default function NewTusiPage() {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState('');
  const [tusiType, setTusiType] = useState('MSKI');
  const [periodType, setPeriodType] = useState<PeriodType>('BULANAN');
  const [description, setDescription] = useState('');
  const [legalBasis, setLegalBasis] = useState('');

  // Aturan Siklus Formula
  const [deadlineRule, setDeadlineRule] = useState<string>('END_OF_PERIOD');
  const [exactDay, setExactDay] = useState<number>(31);
  const [isRecurring, setIsRecurring] = useState<boolean>(true);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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

    const { error } = await supabase.from('task_templates').insert({
      title: title.trim(),
      tusi_type: tusiType,
      period_type: periodType,
      description: description.trim() || null,
      legal_basis: legalBasis.trim() || null,
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

      <div className="bg-white border border-stone-200/60 rounded-3xl p-8 shadow-soft">
        <div className="mb-6">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full">
            Master Bank Data
          </span>
          <h1 className="text-xl font-bold text-stone-900 mt-2">Buat Master Template Tusi</h1>
          <p className="text-xs text-stone-500 mt-1">Daftarkan standar tugas agar bisa diadopsi oleh seksi sejenis dan dibangkitkan otomatis</p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-xs">{errorMsg}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            label="Judul Tugas / Tusi *" 
            placeholder="Misal: Telaah Laporan Keuangan BLU" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            required 
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Rumpun Tusi</label>
              <select
                className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 focus:outline-none focus:border-primary"
                value={tusiType}
                onChange={(e) => setTusiType(e.target.value)}
              >
                {['MSKI', 'PD', 'BANK', 'VERA', 'UMUM'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Siklus Periode</label>
              <select
                className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 focus:outline-none focus:border-primary"
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value as PeriodType)}
              >
                {['BULANAN', 'TRIWULANAN', 'SEMESTERAN', 'TAHUNAN', 'INSIDENTIL'].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Pengaturan Formula Tenggat Siklus */}
          {periodType !== 'INSIDENTIL' && (
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
                <Clock className="w-4 h-4 text-primary" />
                <span>Aturan Batas Tenggat Waktu Siklus</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-stone-600 mb-1">Formula Batas:</label>
                  <select
                    value={deadlineRule}
                    onChange={(e) => setDeadlineRule(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs"
                  >
                    <option value="END_OF_PERIOD">Tepat di Akhir Periode (Contoh: TW I = 31 Maret)</option>
                    <option value="NEXT_MONTH_DATE">Bulan Berikutnya (M+1)</option>
                    <option value="SAME_MONTH_DATE">Bulan Berjalan</option>
                  </select>
                </div>

                {deadlineRule !== 'END_OF_PERIOD' && (
                  <div>
                    <label className="block text-[11px] font-medium text-stone-600 mb-1">Batas Tanggal:</label>
                    <select
                      value={exactDay}
                      onChange={(e) => setExactDay(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs"
                    >
                      <option value={31}>Akhir Bulan</option>
                      <option value={5}>Tanggal 5</option>
                      <option value={10}>Tanggal 10</option>
                      <option value={15}>Tanggal 15</option>
                      <option value={20}>Tanggal 20</option>
                      <option value={25}>Tanggal 25</option>
                    </select>
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="rounded text-primary focus:ring-primary w-3.5 h-3.5"
                />
                <span className="text-xs text-stone-700 font-medium">
                  Aktifkan otomasi generate tugas oleh sistem setiap awal siklus
                </span>
              </label>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">Deskripsi / Prosedur Ringkas</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan tahapan atau output yang diharapkan..."
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-primary"
            />
          </div>

          <Input 
            label="Dasar Hukum / Regulasi" 
            placeholder="Misal: Perdirjen Perbendaharaan No. PER-5/PB/2024" 
            value={legalBasis} 
            onChange={(e) => setLegalBasis(e.target.value)} 
          />

          <div className="pt-2">
            <Button type="submit" isLoading={loading} className="w-full">
              Simpan Master Tusi
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
