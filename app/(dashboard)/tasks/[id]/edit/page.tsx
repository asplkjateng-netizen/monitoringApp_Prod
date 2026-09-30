'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, FileText, Users, AlertCircle, Save, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function EditTaskPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params?.id as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [legalBasis, setLegalBasis] = useState('');
  const [periodType, setPeriodType] = useState<string>('BULANAN');
  const [periodMonth, setPeriodMonth] = useState<number>(1);
  const [periodYear, setPeriodYear] = useState<number>(2026);
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<string>('SEDANG');

  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedPics, setSelectedPics] = useState<string[]>([]);

  useEffect(() => {
    if (taskId) loadTaskAndStaff();
  }, [taskId]);

  const loadTaskAndStaff = async () => {
    setLoading(true);

    // 1. Ambil data task saat ini
    const { data: task, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (error || !task) {
      setErrorMessage('Tugas tidak ditemukan.');
      setLoading(false);
      return;
    }

    setTitle(task.title);
    setDescription(task.description || '');
    setLegalBasis(task.legal_basis || '');
    setPeriodType(task.period_type);
    setPeriodMonth(task.period_month || 1);
    setPeriodYear(task.period_year);
    setDeadline(task.deadline);
    setPriority(task.priority);

    // 2. Ambil staf unit untuk PIC
    const { data: staff } = await supabase
      .from('profiles')
      .select('id, full_name, nip, role')
      .eq('unit_id', task.unit_id)
      .eq('approval_status', 'APPROVED');

    if (staff) setStaffList(staff);

    // 3. Ambil PIC yang sudah terpilih saat ini
    const { data: currentPics } = await supabase
      .from('task_pics')
      .select('user_id')
      .eq('task_id', taskId);

    if (currentPics) setSelectedPics(currentPics.map((p) => p.user_id));

    setLoading(false);
  };

  const togglePic = (picId: string) => {
    setSelectedPics((prev) =>
      prev.includes(picId) ? prev.filter((id) => id !== picId) : [...prev, picId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setErrorMessage('Judul tugas wajib diisi.');
    if (!deadline) return setErrorMessage('Tenggat waktu wajib ditentukan.');

    setSubmitting(true);
    setErrorMessage('');

    try {
      // 1. Dapatkan daftar PIC eksisting sebelum diubah untuk perbandingan mutasi
      const { data: existingPicsData } = await supabase
        .from('task_pics')
        .select('user_id')
        .eq('task_id', taskId);
      
      const previousPicIds = (existingPicsData || []).map((p) => p.user_id);

      // 2. Update data pokok task
      const { error: taskError } = await supabase
        .from('tasks')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          legal_basis: legalBasis.trim() || null,
          period_type: periodType as any,
          period_month: periodMonth,
          period_year: periodYear,
          deadline,
          priority: priority as any,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId);

      if (taskError) throw taskError;

      // 3. Update Relasi Multi-PIC (Hapus lama, masukkan baru)
      await supabase.from('task_pics').delete().eq('task_id', taskId);

      if (selectedPics.length > 0) {
        const picPayloads = selectedPics.map((uid) => ({
          task_id: taskId,
          user_id: uid,
        }));
        await supabase.from('task_pics').insert(picPayloads);

        // [BACKLOG-1] Notifikasi khusus untuk PIC baru yang ditambahkan
        const newlyAddedPics = selectedPics.filter((id) => !previousPicIds.includes(id));
        if (newlyAddedPics.length > 0) {
          const notifs = newlyAddedPics.map((uid) => ({
            user_id: uid,
            title: '📋 Penugasan PIC Tugas',
            message: `Anda baru saja ditambahkan sebagai PIC pada tugas: "${title.trim()}". Batas tenggat: ${deadline}.`,
            action_link: `/tasks/${taskId}`,
            is_read: false,
          }));
          await supabase.from('notifications').insert(notifs);
        }
      }

      router.push(`/tasks/${taskId}`);
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal memperbarui rincian tugas.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-sm text-stone-500">Memuat formulir edit...</div>;
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Link
          href={`/tasks/${taskId}`}
          className="p-2 rounded-xl border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Edit Rincian Tugas</h1>
          <p className="text-xs text-stone-500 mt-0.5">Perbarui informasi tugas pokok, tenggat waktu, atau mutasi Multi-PIC pelaksana.</p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200/70 shadow-sm space-y-5">
          <div className="flex items-center gap-2 text-stone-800 font-bold text-sm border-b border-stone-100 pb-3">
            <FileText className="w-4 h-4 text-[#DF3B68]" />
            <span>Rincian Pokok Tugas</span>
          </div>

          <div className="space-y-4">
            <Input
              label="Judul / Uraian Tugas *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-600">Dasar Hukum / Peraturan</label>
              <input
                type="text"
                value={legalBasis}
                onChange={(e) => setLegalBasis(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-900"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-600">Deskripsi / Petunjuk Teknis</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 resize-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Tipe Periode</label>
              <select
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-800"
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
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={periodMonth}
                  onChange={(e) => setPeriodMonth(Number(e.target.value))}
                  className="w-1/2 px-2 py-2.5 rounded-xl border border-stone-200 bg-white text-xs"
                />
                <input
                  type="number"
                  value={periodYear}
                  onChange={(e) => setPeriodYear(Number(e.target.value))}
                  className="w-1/2 px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs"
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
                className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs font-mono font-medium"
              />
            </div>
          </div>
        </div>

        {/* Multi-PIC Update */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200/70 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2 text-stone-800 font-bold text-sm">
              <Users className="w-4 h-4 text-[#DF3B68]" />
              <span>Perbarui PIC Pelaksana</span>
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

        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href={`/tasks/${taskId}`}
            className="px-5 py-2.5 rounded-full border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-medium"
          >
            Batal
          </Link>
          <Button
            type="submit"
            isLoading={submitting}
            className="bg-[#DF3B68] hover:bg-[#C72F58] text-white px-7 py-2.5 rounded-full shadow-sm text-xs font-semibold"
          >
            Simpan Perubahan
          </Button>
        </div>
      </form>
    </div>
  );
}
