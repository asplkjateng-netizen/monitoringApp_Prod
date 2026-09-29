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
  AlertCircle
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

  // Sumber data pendukung
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);

  // State Form
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [legalBasis, setLegalBasis] = useState('');
  const [periodType, setPeriodType] = useState<'BULANAN' | 'TRIWULANAN' | 'SEMESTERAN' | 'TAHUNAN' | 'INSIDENTIL'>('BULANAN');
  const [periodMonth, setPeriodMonth] = useState<number>(new Date().getMonth() + 1);
  const [periodYear, setPeriodYear] = useState<number>(new Date().getFullYear());
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<'TINGGI' | 'SEDANG' | 'RENDAH'>('SEDANG');

  // Multi-PIC & Subtasks dinamis
  const [selectedPics, setSelectedPics] = useState<string[]>([]);
  const [subtasks, setSubtasks] = useState<string[]>(['']);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    setUserId(user.id);

    // 1. Ambil profil user & unit_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('unit_id')
      .eq('id', user.id)
      .single();

    if (profile?.unit_id) {
      setUnitId(profile.unit_id);

      // 2. Ambil staf aktif di unit yang sama untuk Multi-PIC
      const { data: staff } = await supabase
        .from('profiles')
        .select('id, full_name, nip, role')
        .eq('unit_id', profile.unit_id)
        .eq('approval_status', 'APPROVED')
        .order('full_name', { ascending: true });

      if (staff) {
        setStaffList(staff);
        // Default: jadikan pembuat tugas sebagai salah satu PIC terpilih
        setSelectedPics([user.id]);
      }

      // 3. Ambil Master Template Bank Tusi
      const { data: tpl } = await supabase
        .from('task_templates')
        .select('id, title, description, legal_basis, period_type')
        .order('title', { ascending: true });

      if (tpl) setTemplates(tpl);
    }

    setLoading(false);
  };

  // Handler auto-fill jika memilih template
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

  // Toggle PIC
  const togglePic = (picId: string) => {
    setSelectedPics((prev) =>
      prev.includes(picId) ? prev.filter((id) => id !== picId) : [...prev, picId]
    );
  };

  // Subtask Handlers
  const handleAddSubtask = () => {
    setSubtasks((prev) => [...prev, '']);
  };

  const handleSubtaskChange = (index: number, value: string) => {
    setSubtasks((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const handleRemoveSubtask = (index: number) => {
    setSubtasks((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Handler
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
      // 1. Simpan Task Utama
      const { data: newTask, error: taskError } = await supabase
        .from('tasks')
        .insert({
          unit_id: unitId,
          template_id: selectedTemplateId || null,
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

      // 2. Simpan Multi-PIC jika ada yang dipilih
      if (selectedPics.length > 0) {
        const picPayloads = selectedPics.map((picUserId) => ({
          task_id: taskId,
          user_id: picUserId,
        }));

        const { error: picError } = await supabase
          .from('task_pics')
          .insert(picPayloads);

        if (picError) console.error('Error saat menyimpan PIC:', picError);
      }

      // 3. Simpan Subtasks jika ada yang diisi
      const validSubtasks = subtasks
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

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

        if (subtaskError) console.error('Error saat menyimpan sub-tugas:', subtaskError);
      }

      // Sukses -> alihkan ke daftar tugas
      router.push('/tasks');
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-sm text-stone-500">
        Menyiapkan formulir rekam tugas...
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header & Tombol Kembali */}
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
            Daftarkan realisasi tugas unit kerja, tentukan Multi-PIC, dan susun tahapan sub-pekerjaan.
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
        {/* Card 1: Import dari Katalog Tusi (Opsional) */}
        {templates.length > 0 && (
          <div className="bg-white rounded-3xl p-6 border border-stone-200/70 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-stone-800 font-semibold text-sm">
              <Sparkles className="w-4 h-4 text-[#DF3B68]" />
              <span>Gunakan Master Template Bank Tusi (Opsional)</span>
            </div>
            <p className="text-xs text-stone-500">
              Pilih template untuk mengisi otomatis uraian tugas, dasar hukum, dan tipe periode.
            </p>
            <select
              value={selectedTemplateId}
              onChange={(e) => handleSelectTemplate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20 focus:border-[#DF3B68]"
            >
              <option value="">-- Buat Tugas Mandiri (Tanpa Template) --</option>
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.title} ({tpl.period_type})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Card 2: Informasi Pokok Pekerjaan */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200/70 shadow-sm space-y-5">
          <div className="flex items-center gap-2 text-stone-800 font-bold text-sm border-b border-stone-100 pb-3">
            <FileText className="w-4 h-4 text-[#DF3B68]" />
            <span>Rincian Informasi Tugas</span>
          </div>

          <div className="space-y-4">
            <Input
              label="Judul / Uraian Tugas *"
              placeholder="Contoh: Penyusunan Laporan Kepatuhan Internal Semester I"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <div className="w-full space-y-1 text-left">
              <label className="block text-xs font-semibold text-stone-600">Dasar Hukum / Peraturan</label>
              <input
                type="text"
                placeholder="Contoh: PER-12/PB/2023, Nota Dinas Direktur SMI"
                value={legalBasis}
                onChange={(e) => setLegalBasis(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20 focus:border-[#DF3B68]"
              />
            </div>

            <div className="w-full space-y-1 text-left">
              <label className="block text-xs font-semibold text-stone-600">Deskripsi / Petunjuk Teknis</label>
              <textarea
                rows={3}
                placeholder="Jelaskan output dokumen dan tata kelola tugas ini secara ringkas..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20 focus:border-[#DF3B68] resize-none"
              />
            </div>
          </div>

          {/* Grid Periode & Deadline */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Tipe Periode</label>
              <select
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value as any)}
                className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20"
              >
                <option value="BULANAN">Bulanan</option>
                <option value="TRIWULANAN">Triwulanan</option>
                <option value="SEMESTERAN">Semesteran</option>
                <option value="TAHUNAN">Tahunan</option>
                <option value="INSIDENTIL">Insidentil</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Periode Bulan & Tahun</label>
              <div className="flex gap-2">
                <select
                  value={periodMonth}
                  onChange={(e) => setPeriodMonth(Number(e.target.value))}
                  className="w-1/2 px-2 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      Bulan {i + 1}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={periodYear}
                  onChange={(e) => setPeriodYear(Number(e.target.value))}
                  className="w-1/2 px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Tenggat Waktu (Deadline) *</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20"
              />
            </div>
          </div>

          {/* Prioritas Tugas */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-2">Tingkat Prioritas</label>
            <div className="flex gap-3">
              {[
                { id: 'RENDAH', label: 'Rendah', style: 'peer-checked:bg-stone-100 peer-checked:text-stone-800 peer-checked:border-stone-300' },
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
                  <div className={`p-2.5 text-center text-xs font-semibold rounded-xl border border-stone-200 text-stone-500 transition-all ${p.style}`}>
                    {p.label}
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Card 3: Multi-PIC Pegawai */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200/70 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2 text-stone-800 font-bold text-sm">
              <Users className="w-4 h-4 text-[#DF3B68]" />
              <span>Tetapkan PIC Pelaksana (Multi-PIC)</span>
            </div>
            <span className="text-[11px] text-stone-400 font-medium">
              {selectedPics.length} pegawai dipilih
            </span>
          </div>

          <p className="text-xs text-stone-500">
            Pilih satu atau beberapa pegawai dari seksi/unit kerja Anda yang bertanggung jawab atas tugas ini:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
            {staffList.map((staff) => {
              const isChecked = selectedPics.includes(staff.id);
              return (
                <div
                  key={staff.id}
                  onClick={() => togglePic(staff.id)}
                  className={`p-3 rounded-2xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                    isChecked
                      ? 'border-[#DF3B68]/40 bg-rose-50/40 text-stone-900 shadow-xs'
                      : 'border-stone-200/80 bg-white text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <div className="truncate pr-2">
                    <p className="font-semibold truncate">{staff.full_name}</p>
                    <p className="text-[10px] text-stone-400">NIP. {staff.nip} • {staff.role}</p>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${
                      isChecked
                        ? 'bg-[#DF3B68] border-[#DF3B68] text-white'
                        : 'border-stone-300 bg-white'
                    }`}
                  >
                    {isChecked && <CheckCircle2 className="w-3 h-3" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 4: Sub-Pekerjaan Checklist Dinamis */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200/70 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2 text-stone-800 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 text-[#DF3B68]" />
              <span>Tahapan Sub-Pekerjaan Awal (Opsional)</span>
            </div>
            <button
              type="button"
              onClick={handleAddSubtask}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#DF3B68] hover:text-[#C72F58] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Tahapan
            </button>
          </div>

          <p className="text-xs text-stone-500">
            Rincikan tahapan eksekusi. Progres persentase tugas utama akan otomatis terhitung dari checklist sub-tugas ini.
          </p>

          <div className="space-y-2.5">
            {subtasks.map((st, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs font-semibold text-stone-400 w-5 text-right">{idx + 1}.</span>
                <input
                  type="text"
                  placeholder={`Uraian sub-tahapan ke-${idx + 1}`}
                  value={st}
                  onChange={(e) => handleSubtaskChange(idx, e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20 focus:border-[#DF3B68]"
                />
                {subtasks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSubtask(idx)}
                    className="p-2 text-stone-400 hover:text-rose-500 transition-colors rounded-lg hover:bg-rose-50"
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
            className="px-5 py-2.5 rounded-full border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-medium transition-colors"
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
