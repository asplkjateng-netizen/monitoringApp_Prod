'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Calendar, 
  Users, 
  CheckCircle2, 
  FileText, 
  Sparkles,
  AlertCircle,
  BookmarkPlus
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface StaffProfile {
  id: string;
  full_name: string;
  nip: string;
  role: string;
}

interface TaskTemplate {
  id: string;
  title: string;
  description: string | null;
  legal_basis: string | null;
  period_type: 'BULANAN' | 'TRIWULANAN' | 'SEMESTERAN' | 'TAHUNAN' | 'INSIDENTIL';
}

export default function NewTaskPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Identitas sesi & unit
  const [userId, setUserId] = useState<string | null>(null);
  const [unitId, setUnitId] = useState<string | null>(null);
  const [userTusiType, setUserTusiType] = useState<string>('UMUM');

  // Sumber data pendukung
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);

  // State Form Pokok
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [saveAsTemplate, setSaveAsTemplate] = useState<boolean>(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [legalBasis, setLegalBasis] = useState('');
  const [periodType, setPeriodType] = useState<'BULANAN' | 'TRIWULANAN' | 'SEMESTERAN' | 'TAHUNAN' | 'INSIDENTIL'>('BULANAN');
  const [periodMonth, setPeriodMonth] = useState<number>(new Date().getMonth() + 1);
  const [periodYear, setPeriodYear] = useState<number>(new Date().getFullYear());
  
  // Pengaturan Deadline Klerikal vs Insidentil
  const [cutoffDay, setCutoffDay] = useState<number>(15);
  const [cutoffTiming, setCutoffTiming] = useState<'SAME_MONTH' | 'NEXT_MONTH'>('NEXT_MONTH');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<'TINGGI' | 'SEDANG' | 'RENDAH'>('SEDANG');

  // Multi-PIC & Subtasks dinamis
  const [selectedPics, setSelectedPics] = useState<string[]>([]);
  const [subtasks, setSubtasks] = useState<string[]>(['']);

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Hitung otomatis deadline saat tipe periode / cut-off berubah
  useEffect(() => {
    if (periodType !== 'INSIDENTIL') {
      calculateClericalDeadline();
    }
  }, [periodType, periodMonth, periodYear, cutoffDay, cutoffTiming]);

  const calculateClericalDeadline = () => {
    let targetYear = periodYear;
    let targetMonth = periodMonth; // 1-12

    if (cutoffTiming === 'NEXT_MONTH') {
      targetMonth += 1;
      if (targetMonth > 12) {
        targetMonth = 1;
        targetYear += 1;
      }
    }

    // Pastikan tanggal valid di bulan tersebut
    const daysInTargetMonth = new Date(targetYear, targetMonth, 0).getDate();
    const effectiveDay = Math.min(cutoffDay, daysInTargetMonth);

    const formattedMonth = String(targetMonth).padStart(2, '0');
    const formattedDay = String(effectiveDay).padStart(2, '0');
    setDeadline(`${targetYear}-${formattedMonth}-${formattedDay}`);
  };

  const fetchInitialData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    setUserId(user.id);

    // Ambil profil user, unit_id, dan tusi_type
    const { data: profile } = await supabase
      .from('profiles')
      .select('unit_id, unit:units(id, tusi_type)')
      .eq('id', user.id)
      .single();

    if (profile?.unit_id) {
      setUnitId(profile.unit_id);
      const tusi = (profile.unit as any)?.tusi_type || 'UMUM';
      setUserTusiType(tusi);

      // Ambil staf aktif
      const { data: staff } = await supabase
        .from('profiles')
        .select('id, full_name, nip, role')
        .eq('unit_id', profile.unit_id)
        .eq('approval_status', 'APPROVED')
        .order('full_name', { ascending: true });

      if (staff) {
        setStaffList(staff);
        setSelectedPics([user.id]);
      }

      // Ambil Master Template Bank Tusi
      const { data: tpl } = await supabase
        .from('task_templates')
        .select('id, title, description, legal_basis, period_type')
        .order('title', { ascending: true });

      if (tpl) setTemplates(tpl);
    }

    setLoading(false);
  };

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;

    const tpl = templates.find((t) => t.id === templateId);
    if (tpl) {
      setTitle(tpl.title);
      setDescription(tpl.description || '');
      setLegalBasis(tpl.legal_basis || '');
      setPeriodType(tpl.period_type);
    }
  };

  const togglePic = (picId: string) => {
    setSelectedPics((prev) =>
      prev.includes(picId) ? prev.filter((id) => id !== picId) : [...prev, picId]
    );
  };

  const handleAddSubtask = () => setSubtasks((prev) => [...prev, '']);
  const handleRemoveSubtask = (index: number) => setSubtasks((prev) => prev.filter((_, i) => i !== index));
  const handleSubtaskChange = (index: number, value: string) => {
    setSubtasks((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!unitId || !userId) {
      setErrorMessage('Sesi kerja tidak valid. Harap muat ulang halaman.');
      return;
    }
    if (!title.trim()) {
      setErrorMessage('Judul tugas wajib diisi.');
      return;
    }
    if (!deadline) {
      setErrorMessage('Tenggat waktu (deadline) wajib ditentukan.');
      return;
    }

    setSubmitting(true);

    try {
      let createdTemplateId = selectedTemplateId || null;

      // 1. Simpan ke Bank Template jika opsi dicentang
      if (saveAsTemplate) {
        const { data: newTpl, error: tplError } = await supabase
          .from('task_templates')
          .insert({
            tusi_type: userTusiType,
            title: title.trim(),
            description: description.trim() || null,
            legal_basis: legalBasis.trim() || null,
            period_type: periodType,
            created_by_unit: unitId
          })
          .select('id')
          .single();

        if (tplError) {
          console.warn('Gagal menyimpan template master:', tplError.message);
        } else if (newTpl) {
          createdTemplateId = newTpl.id;
        }
      }

      // 2. Simpan Task Utama
      const { data: newTask, error: taskError } = await supabase
        .from('tasks')
        .insert({
          unit_id: unitId,
          template_id: createdTemplateId,
          title: title.trim(),
          description: description.trim() || null,
          legal_basis: legalBasis.trim() || null,
          period_type: periodType,
          period_month: periodMonth,
          period_year: periodYear,
          deadline,
          priority,
          status: 'BELUM_DIKERJAKAN',
          progress_pct: 0,
          created_by: userId,
        })
        .select('id')
        .single();

      if (taskError || !newTask) {
        throw new Error(taskError?.message || 'Gagal menyimpan tugas baru.');
      }

      const taskId = newTask.id;

      // 3. Simpan Multi-PIC
      if (selectedPics.length > 0) {
        const picPayloads = selectedPics.map((picUserId) => ({
          task_id: taskId,
          user_id: picUserId,
        }));
        await supabase.from('task_pics').insert(picPayloads);
      }

      // 4. Simpan Subtasks jika ada
      const validSubtasks = subtasks.map((s) => s.trim()).filter((s) => s.length > 0);
      if (validSubtasks.length > 0) {
        const subtaskPayloads = validSubtasks.map((stTitle) => ({
          task_id: taskId,
          title: stTitle,
          is_completed: false,
          evidence_link_type: 'INHERIT',
        }));

        const { error: subtaskError } = await supabase
          .from('subtasks')
          .insert(subtaskPayloads);

        if (subtaskError) {
          console.error('Error saat menyimpan subtasks:', subtaskError);
        }
      }

      router.push('/tasks');
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-sm text-stone-500">Menyiapkan formulir rekam tugas...</div>;
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Link
          href="/tasks"
          className="p-2 rounded-xl border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Rekam Tugas Baru</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Daftarkan realisasi tugas unit kerja, tentukan batas tenggat, Multi-PIC, dan tahapan sub-pekerjaan.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card 1: Import dari Katalog Tusi */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200/70 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-stone-800 font-semibold text-sm">
            <Sparkles className="w-4 h-4 text-[#DF3B68]" />
            <span>Gunakan Master Template Bank Tusi (Opsional)</span>
          </div>
          <select
            value={selectedTemplateId}
            onChange={(e) => handleSelectTemplate(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20"
          >
            <option value="">-- Buat Tugas Mandiri (Tanpa Template) --</option>
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.title} ({tpl.period_type})
              </option>
            ))}
          </select>
        </div>

        {/* Card 2: Informasi Pokok Pekerjaan & Deadline Klerikal */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200/70 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2 text-stone-800 font-bold text-sm">
              <FileText className="w-4 h-4 text-[#DF3B68]" />
              <span>Rincian Informasi Tugas</span>
            </div>
            {/* Checkbox Simpan ke Bank Template */}
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-200 px-3 py-1.5 rounded-xl transition-colors">
              <input
                type="checkbox"
                checked={saveAsTemplate}
                onChange={(e) => setSaveAsTemplate(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-[#DF3B68] focus:ring-[#DF3B68]"
              />
              <BookmarkPlus className="w-3.5 h-3.5 text-[#DF3B68]" />
              <span>Simpan ke Bank Template Tusi</span>
            </label>
          </div>

          <div className="space-y-4">
            <Input
              label="Judul / Uraian Tugas *"
              placeholder="Contoh: Rekonsiliasi Laporan Keuangan dan LPJ Bendahara"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <div className="space-y-1 text-left">
              <label className="block text-xs font-semibold text-stone-600">Dasar Hukum / Peraturan</label>
              <input
                type="text"
                placeholder="Contoh: PER-56/PB/2016, Nota Dinas Terkait"
                value={legalBasis}
                onChange={(e) => setLegalBasis(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20"
              />
            </div>

            <div className="space-y-1 text-left">
              <label className="block text-xs font-semibold text-stone-600">Deskripsi / Petunjuk Teknis</label>
              <textarea
                rows={3}
                placeholder="Rincian output tugas..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20 resize-none"
              />
            </div>
          </div>

          {/* Konfigurasi Siklus Periode & Deadline Klerikal */}
          <div className="bg-stone-50/70 p-4 rounded-2xl border border-stone-100 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Tipe Periode</label>
                <select
                  value={periodType}
                  onChange={(e) => setPeriodType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 focus:ring-2 focus:ring-[#DF3B68]/20"
                >
                  <option value="BULANAN">Bulanan</option>
                  <option value="TRIWULANAN">Triwulanan</option>
                  <option value="SEMESTERAN">Semesteran</option>
                  <option value="TAHUNAN">Tahunan</option>
                  <option value="INSIDENTIL">Insidentil (Bebas)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Periode Bulan & Tahun</label>
                <div className="flex gap-2">
                  <select
                    value={periodMonth}
                    onChange={(e) => setPeriodMonth(Number(e.target.value))}
                    className="w-1/2 px-2 py-2 rounded-xl border border-stone-200 bg-white text-xs text-stone-800"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>Bulan {i + 1}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={periodYear}
                    onChange={(e) => setPeriodYear(Number(e.target.value))}
                    className="w-1/2 px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs text-stone-800"
                  />
                </div>
              </div>

              {/* Deadline Logic */}
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">
                  {periodType === 'INSIDENTIL' ? 'Tenggat Waktu *' : 'Tenggat Waktu Terkalkulasi'}
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 font-mono font-medium focus:ring-2 focus:ring-[#DF3B68]/20"
                />
              </div>
            </div>

            {/* Aturan Khusus Klerikal (Bulanan, Triwulanan, Semesteran, Tahunan) */}
            {periodType !== 'INSIDENTIL' && (
              <div className="pt-2 border-t border-stone-200/60 flex flex-wrap items-center gap-3 text-xs text-stone-600">
                <span className="font-semibold text-stone-700">Aturan Siklus: Batas Tanggal</span>
                <select
                  value={cutoffDay}
                  onChange={(e) => setCutoffDay(Number(e.target.value))}
                  className="px-2.5 py-1 rounded-lg border border-stone-200 bg-white text-xs font-medium"
                >
                  {[5, 10, 15, 20, 25, 31].map((d) => (
                    <option key={d} value={d}>Tanggal {d === 31 ? 'Akhir Bulan' : d}</option>
                  ))}
                </select>
                <span>pada</span>
                <select
                  value={cutoffTiming}
                  onChange={(e) => setCutoffTiming(e.target.value as any)}
                  className="px-2.5 py-1 rounded-lg border border-stone-200 bg-white text-xs font-medium"
                >
                  <option value="NEXT_MONTH">Bulan Berikutnya (M+1)</option>
                  <option value="SAME_MONTH">Bulan Berjalan</option>
                </select>
                <span className="text-stone-400 text-[11px] italic">
                  (Otomatis menghitung tanggal tenggat: {deadline})
                </span>
              </div>
            )}
          </div>

          {/* Prioritas */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-2">Tingkat Prioritas</label>
            <div className="flex gap-3">
              {[
                { id: 'RENDAH', label: 'Rendah', style: 'peer-checked:bg-stone-100 peer-checked:text-stone-800' },
                { id: 'SEDANG', label: 'Sedang', style: 'peer-checked:bg-amber-50 peer-checked:text-amber-800 peer-checked:border-amber-300' },
                { id: 'TINGGI', label: 'Tinggi', style: 'peer-checked:bg-rose-50 peer-checked:text-rose-800 peer-checked:border-rose-300' },
              ].map((p) => (
                <label key={p.id} className="cursor-pointer flex-1">
                  <input
                    type="radio"
                    name="priority"
                    value={p.id}
                    checked={priority === p.id}
                    onChange={() => setPriority(p.id as any)}
                    className="peer sr-only"
                  />
                  <div className={`p-2 text-center text-xs font-semibold rounded-xl border border-stone-200 text-stone-500 transition-all ${p.style}`}>
                    {p.label}
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Card 3: Multi-PIC */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200/70 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2 text-stone-800 font-bold text-sm">
              <Users className="w-4 h-4 text-[#DF3B68]" />
              <span>Tetapkan PIC Pelaksana (Multi-PIC)</span>
            </div>
            <span className="text-[11px] text-stone-400 font-medium">{selectedPics.length} pegawai dipilih</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-52 overflow-y-auto pr-1">
            {staffList.map((staff) => {
              const isChecked = selectedPics.includes(staff.id);
              return (
                <div
                  key={staff.id}
                  onClick={() => togglePic(staff.id)}
                  className={`p-3 rounded-2xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                    isChecked
                      ? 'border-[#DF3B68]/40 bg-rose-50/40 text-stone-900'
                      : 'border-stone-200/80 bg-white text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <div className="truncate pr-2">
                    <p className="font-semibold truncate">{staff.full_name}</p>
                    <p className="text-[10px] text-stone-400">NIP. {staff.nip} • {staff.role}</p>
                  </div>
                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${isChecked ? 'bg-[#DF3B68] border-[#DF3B68] text-white' : 'border-stone-300'}`}>
                    {isChecked && <CheckCircle2 className="w-3 h-3" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 4: Sub-Pekerjaan Awal */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200/70 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2 text-stone-800 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 text-[#DF3B68]" />
              <span>Tahapan Sub-Pekerjaan Awal (Opsional)</span>
            </div>
            <button
              type="button"
              onClick={handleAddSubtask}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#DF3B68] hover:text-[#C72F58]"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah Tahapan
            </button>
          </div>

          <div className="space-y-2.5">
            {subtasks.map((st, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs font-semibold text-stone-400 w-5 text-right">{idx + 1}.</span>
                <input
                  type="text"
                  placeholder={`Uraian sub-tahapan ke-${idx + 1}`}
                  value={st}
                  onChange={(e) => handleSubtaskChange(idx, e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20"
                />
                {subtasks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSubtask(idx)}
                    className="p-2 text-stone-400 hover:text-rose-500 rounded-lg hover:bg-rose-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/tasks"
            className="px-5 py-2.5 rounded-full border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-medium"
          >
            Batal
          </Link>
          <Button
            type="submit"
            isLoading={submitting}
            className="bg-[#DF3B68] hover:bg-[#C72F58] text-white px-7 py-2.5 rounded-full shadow-sm text-xs font-semibold"
          >
            Simpan & Terbitkan Tugas
          </Button>
        </div>
      </form>
    </div>
  );
}
