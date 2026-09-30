'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Users, 
  CheckCircle2, 
  FileText, 
  Sparkles,
  AlertCircle,
  BookmarkPlus,
  Clock,
  CalendarCheck2
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
  deadline_rule?: string;
  exact_day?: number;
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
  const [saveAsTemplate, setSaveAsTemplate] = useState<boolean>(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [legalBasis, setLegalBasis] = useState('');
  const [periodType, setPeriodType] = useState<'BULANAN' | 'TRIWULANAN' | 'SEMESTERAN' | 'TAHUNAN' | 'INSIDENTIL'>('BULANAN');
  
  // Aturan Siklus & Deadline
  const [deadlineRule, setDeadlineRule] = useState<'END_OF_PERIOD' | 'NEXT_MONTH_DATE' | 'SAME_MONTH_DATE'>('END_OF_PERIOD');
  const [exactDay, setExactDay] = useState<number>(31);
  const [customDayInput, setCustomDayInput] = useState<string>('31');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<'TINGGI' | 'SEDANG' | 'RENDAH'>('SEDANG');

  // Multi-PIC & Subtasks dinamis
  const [selectedPics, setSelectedPics] = useState<string[]>([]);
  const [subtasks, setSubtasks] = useState<string[]>(['']);

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Hitung otomatis deadline berdasarkan formula siklus
  useEffect(() => {
    if (periodType !== 'INSIDENTIL') {
      calculateRecurringDeadline();
    }
  }, [periodType, deadlineRule, exactDay]);

  const calculateRecurringDeadline = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12

    let targetYear = currentYear;
    let targetMonth = currentMonth;

    if (periodType === 'BULANAN') {
      if (deadlineRule === 'END_OF_PERIOD' || deadlineRule === 'SAME_MONTH_DATE') {
        targetMonth = currentMonth;
      } else if (deadlineRule === 'NEXT_MONTH_DATE') {
        targetMonth = currentMonth + 1;
        if (targetMonth > 12) {
          targetMonth = 1;
          targetYear += 1;
        }
      }
    } else if (periodType === 'TRIWULANAN') {
      // Tentukan bulan penutup TW (TW1: 3, TW2: 6, TW3: 9, TW4: 12)
      const currentQuarter = Math.ceil(currentMonth / 3);
      const quarterEndMonth = currentQuarter * 3;

      if (deadlineRule === 'END_OF_PERIOD') {
        targetMonth = quarterEndMonth;
      } else if (deadlineRule === 'NEXT_MONTH_DATE') {
        targetMonth = quarterEndMonth + 1;
        if (targetMonth > 12) {
          targetMonth = 1;
          targetYear += 1;
        }
      } else {
        targetMonth = currentMonth;
      }
    } else if (periodType === 'SEMESTERAN') {
      // Tentukan bulan penutup Semester (Sem1: 6, Sem2: 12)
      const semesterEndMonth = currentMonth <= 6 ? 6 : 12;

      if (deadlineRule === 'END_OF_PERIOD') {
        targetMonth = semesterEndMonth;
      } else if (deadlineRule === 'NEXT_MONTH_DATE') {
        targetMonth = semesterEndMonth + 1;
        if (targetMonth > 12) {
          targetMonth = 1;
          targetYear += 1;
        }
      } else {
        targetMonth = currentMonth;
      }
    } else if (periodType === 'TAHUNAN') {
      if (deadlineRule === 'END_OF_PERIOD') {
        targetMonth = 12;
      } else if (deadlineRule === 'NEXT_MONTH_DATE') {
        targetMonth = 1;
        targetYear += 1;
      }
    }

    // Hitung tanggal akhir di bulan target
    const daysInTargetMonth = new Date(targetYear, targetMonth, 0).getDate();
    let effectiveDay = exactDay;
    if (deadlineRule === 'END_OF_PERIOD' || exactDay >= 31) {
      effectiveDay = daysInTargetMonth;
    } else {
      effectiveDay = Math.min(exactDay, daysInTargetMonth);
    }

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

    const { data: profile } = await supabase
      .from('profiles')
      .select('unit_id, unit:units(id, tusi_type)')
      .eq('id', user.id)
      .single();

    if (profile?.unit_id) {
      setUnitId(profile.unit_id);
      const tusi = (profile.unit as any)?.tusi_type || 'UMUM';
      setUserTusiType(tusi);

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

      const { data: tpl } = await supabase
        .from('task_templates')
        .select('*')
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
      if (tpl.deadline_rule) {
        setDeadlineRule(tpl.deadline_rule as any);
      }
      if (tpl.exact_day) {
        setExactDay(tpl.exact_day);
        setCustomDayInput(String(tpl.exact_day));
      }
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
      setErrorMessage('Tenggat waktu wajib ditentukan.');
      return;
    }

    setSubmitting(true);

    try {
      let createdTemplateId = selectedTemplateId || null;
      const now = new Date();

      // 1. Simpan ke Bank Template jika opsi dicentang atau tugas berulang
      if (saveAsTemplate || (periodType !== 'INSIDENTIL' && !createdTemplateId)) {
        const { data: newTpl, error: tplError } = await supabase
          .from('task_templates')
          .insert({
            tusi_type: userTusiType,
            title: title.trim(),
            description: description.trim() || null,
            legal_basis: legalBasis.trim() || null,
            period_type: periodType,
            deadline_rule: periodType === 'INSIDENTIL' ? 'MANUAL' : deadlineRule,
            exact_day: exactDay,
            is_recurring: periodType !== 'INSIDENTIL',
            created_by_unit: unitId
          })
          .select('id')
          .single();

        if (!tplError && newTpl) {
          createdTemplateId = newTpl.id;
        }
      }

      // 2. Simpan Tugas Periode Berjalan
      const { data: newTask, error: taskError } = await supabase
        .from('tasks')
        .insert({
          unit_id: unitId,
          template_id: createdTemplateId,
          title: title.trim(),
          description: description.trim() || null,
          legal_basis: legalBasis.trim() || null,
          period_type: periodType,
          period_month: now.getMonth() + 1,
          period_year: now.getFullYear(),
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

      // 3. Simpan PIC & Buat Notifikasi Penugasan
      if (selectedPics.length > 0) {
        const picPayloads = selectedPics.map((picUserId) => ({
          task_id: taskId,
          user_id: picUserId,
        }));
        await supabase.from('task_pics').insert(picPayloads);

        const notifPayloads = selectedPics.map((picUserId) => ({
          user_id: picUserId,
          title: '📋 Penugasan Tugas Baru',
          message: `Anda ditetapkan sebagai PIC untuk: "${title.trim()}". Batas tenggat: ${deadline}.`,
          action_link: `/tasks/${taskId}`,
          is_read: false,
        }));
        await supabase.from('notifications').insert(notifPayloads);
      }

      // 4. Simpan Subtasks
      const validSubtasks = subtasks.map((s) => s.trim()).filter((s) => s.length > 0);
      if (validSubtasks.length > 0) {
        const subtaskPayloads = validSubtasks.map((stTitle) => ({
          task_id: taskId,
          title: stTitle,
          is_completed: false,
          evidence_link_type: 'INHERIT',
        }));
        await supabase.from('subtasks').insert(subtaskPayloads);
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
            Daftarkan tugas klerikal rutin berkala atau pekerjaan insidentil unit kerja.
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
        {/* Template Selector */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200/70 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-stone-800 font-semibold text-sm">
            <Sparkles className="w-4 h-4 text-[#DF3B68]" />
            <span>Pilih dari Master Bank Tusi (Opsional)</span>
          </div>
          <select
            value={selectedTemplateId}
            onChange={(e) => handleSelectTemplate(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20"
          >
            <option value="">-- Buat Tugas Mandiri Baru --</option>
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.title} ({tpl.period_type})
              </option>
            ))}
          </select>
        </div>

        {/* Informasi Pokok & Formula Siklus */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200/70 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2 text-stone-800 font-bold text-sm">
              <FileText className="w-4 h-4 text-[#DF3B68]" />
              <span>Rincian Informasi Tugas</span>
            </div>
            {periodType !== 'INSIDENTIL' ? (
              <span className="text-[11px] font-semibold text-[#DF3B68] bg-rose-50 border border-rose-200 px-3 py-1 rounded-xl">
                Otomasi Pembangkitan Rutin Aktif
              </span>
            ) : (
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-200 px-3 py-1.5 rounded-xl">
                <input
                  type="checkbox"
                  checked={saveAsTemplate}
                  onChange={(e) => setSaveAsTemplate(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-[#DF3B68] focus:ring-[#DF3B68]"
                />
                <BookmarkPlus className="w-3.5 h-3.5 text-[#DF3B68]" />
                <span>Simpan ke Bank Tusi</span>
              </label>
            )}
          </div>

          <div className="space-y-4">
            <Input
              label="Judul / Uraian Tugas *"
              placeholder="Contoh: Telaah Laporan Keuangan BLU Triwulan I"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <div className="space-y-1 text-left">
              <label className="block text-xs font-semibold text-stone-600">Dasar Hukum / Regulasi</label>
              <input
                type="text"
                placeholder="Contoh: PER-5/PB/2024, ND Dit. APK"
                value={legalBasis}
                onChange={(e) => setLegalBasis(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20"
              />
            </div>

            <div className="space-y-1 text-left">
              <label className="block text-xs font-semibold text-stone-600">Deskripsi / Petunjuk Teknis</label>
              <textarea
                rows={3}
                placeholder="Rincian prosedur teknis pelaksanaan..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20 resize-none"
              />
            </div>
          </div>

          {/* Konfigurasi Tipe Siklus & Aturan Batas */}
          <div className="bg-stone-50/80 p-5 rounded-2xl border border-stone-200/80 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Jenis Siklus Pekerjaan *</label>
                <select
                  value={periodType}
                  onChange={(e) => setPeriodType(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-stone-800 focus:ring-2 focus:ring-[#DF3B68]/20"
                >
                  <option value="BULANAN">Bulanan (Klerikal Rutin)</option>
                  <option value="TRIWULANAN">Triwulanan (TW I s.d. TW IV)</option>
                  <option value="SEMESTERAN">Semesteran (Semester I & II)</option>
                  <option value="TAHUNAN">Tahunan</option>
                  <option value="INSIDENTIL">Insidentil (Tugas Ad-Hoc / Sekali Jalan)</option>
                </select>
              </div>

              {/* Jika Insidentil, Tampilkan Input Tenggat Manual */}
              {periodType === 'INSIDENTIL' ? (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Tenggat Waktu Pekerjaan *</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs font-mono font-medium"
                  />
                </div>
              ) : (
                /* Pratinjau Tenggat Siklus Aktif */
                <div className="p-3 bg-white rounded-xl border border-stone-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-stone-400 font-semibold block uppercase">Tenggat Periode Berjalan</span>
                    <span className="text-xs font-mono font-bold text-stone-800">{deadline || '-'}</span>
                  </div>
                  <CalendarCheck2 className="w-5 h-5 text-emerald-600" />
                </div>
              )}
            </div>

            {/* Aturan Formula Batas Waktu untuk Tugas Klerikal */}
            {periodType !== 'INSIDENTIL' && (
              <div className="pt-3 border-t border-stone-200/60 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
                  <Clock className="w-4 h-4 text-[#DF3B68]" />
                  <span>Formula Batas Waktu Siklus (Dihitung Otomatis Setiap Awal Periode):</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-stone-600 mb-1">Ketentuan Batas:</label>
                    <select
                      value={deadlineRule}
                      onChange={(e) => setDeadlineRule(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs"
                    >
                      <option value="END_OF_PERIOD">Tepat di Akhir Periode (Contoh: LK BLU TW I = Akhir Maret)</option>
                      <option value="NEXT_MONTH_DATE">Bulan Berikutnya Setelah Periode Berakhir (M+1)</option>
                      <option value="SAME_MONTH_DATE">Bulan Berjalan</option>
                    </select>
                  </div>

                  {deadlineRule !== 'END_OF_PERIOD' && (
                    <div>
                      <label className="block text-[11px] font-medium text-stone-600 mb-1">Tanggal Cut-off:</label>
                      <div className="flex gap-2">
                        <select
                          value={exactDay === 31 ? '31' : [5, 10, 15, 20, 25].includes(exactDay) ? String(exactDay) : 'CUSTOM'}
                          onChange={(e) => {
                            if (e.target.value === 'CUSTOM') {
                              setExactDay(1);
                            } else {
                              const val = Number(e.target.value);
                              setExactDay(val);
                              setCustomDayInput(String(val));
                            }
                          }}
                          className="w-1/2 px-2.5 py-2 rounded-xl border border-stone-200 bg-white text-xs"
                        >
                          <option value="31">Akhir Bulan</option>
                          <option value="5">Tanggal 5</option>
                          <option value="10">Tanggal 10</option>
                          <option value="15">Tanggal 15</option>
                          <option value="20">Tanggal 20</option>
                          <option value="25">Tanggal 25</option>
                          <option value="CUSTOM">Manual / Bebas</option>
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
                  )}
                </div>
                <p className="text-[11px] text-stone-500 italic">
                  * Tugas akan didaftarkan untuk periode berjalan sekarang, dan sistem akan otomatis membangkitkan tugas ini kembali pada setiap awal siklus periode berikutnya.
                </p>
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

        {/* Multi-PIC */}
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

        {/* Sub-Pekerjaan Awal */}
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
