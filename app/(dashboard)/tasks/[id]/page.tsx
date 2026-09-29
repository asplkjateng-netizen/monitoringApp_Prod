'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Link as LinkIcon,
  ShieldAlert,
  Save,
  Loader2,
  Edit3,
  CalendarDays
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params?.id as string;
  const supabase = createClient();

  const [task, setTask] = useState<any>(null);
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [pics, setPics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // States Subtask
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [addingSubtask, setAddingSubtask] = useState(false);

  // States Form Kontrol Cepat & Status
  const [currentStatus, setCurrentStatus] = useState<string>('BELUM_DIKERJAKAN');
  const [currentDeadline, setCurrentDeadline] = useState<string>('');
  const [currentPriority, setCurrentPriority] = useState<string>('SEDANG');
  const [evidenceLinkInput, setEvidenceLinkInput] = useState('');
  const [kendalaInput, setKendalaInput] = useState('');
  
  const [savingChanges, setSavingChanges] = useState(false);
  const [deletingTask, setDeletingTask] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (taskId) {
      loadTaskDetails();
    }
  }, [taskId]);

  const loadTaskDetails = async () => {
    setLoading(true);
    setErrorMsg('');

    // 1. Ambil Data Tugas
    const { data: taskData, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (taskError || !taskData) {
      setErrorMsg('Tugas tidak ditemukan atau izin akses ditolak: ' + (taskError?.message || ''));
      setLoading(false);
      return;
    }

    setTask(taskData);
    setCurrentStatus(taskData.status);
    setCurrentDeadline(taskData.deadline);
    setCurrentPriority(taskData.priority);
    setEvidenceLinkInput(taskData.evidence_link || '');
    setKendalaInput(taskData.kendala_note || '');

    // 2. Ambil Subtasks
    const { data: subData, error: subError } = await supabase
      .from('subtasks')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (subError) {
      setErrorMsg('Gagal memuat sub-pekerjaan: ' + subError.message);
    } else {
      setSubtasks(subData || []);
    }

    // 3. Ambil PIC
    const { data: picData } = await supabase
      .from('task_pics')
      .select('profile:profiles(id, full_name, nip, role)')
      .eq('task_id', taskId);

    if (picData) setPics(picData.map((p: any) => p.profile));

    setLoading(false);
  };

  // Toggle Subtask
  const handleToggleSubtask = async (subtaskId: string, currentStatusVal: boolean) => {
    const { error } = await supabase
      .from('subtasks')
      .update({ is_completed: !currentStatusVal, updated_at: new Date().toISOString() })
      .eq('id', subtaskId);

    if (error) {
      setErrorMsg('Gagal memperbarui checklist: ' + error.message);
    } else {
      loadTaskDetails();
    }
  };

  // Tambah Subtask
  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;

    setAddingSubtask(true);
    setErrorMsg('');
    setSuccessMsg('');

    const { error } = await supabase
      .from('subtasks')
      .insert({
        task_id: taskId,
        title: newSubtaskTitle.trim(),
        is_completed: false,
        evidence_link_type: 'INHERIT'
      });

    if (error) {
      setErrorMsg('Gagal menyimpan subtask baru: ' + error.message + '. Pastikan RLS subtasks sudah diatur.');
    } else {
      setNewSubtaskTitle('');
      await loadTaskDetails();
    }
    setAddingSubtask(false);
  };

  // Hapus Subtask
  const handleDeleteSubtask = async (subtaskId: string) => {
    const { error } = await supabase.from('subtasks').delete().eq('id', subtaskId);
    if (error) {
      setErrorMsg('Gagal menghapus subtask: ' + error.message);
    } else {
      loadTaskDetails();
    }
  };

  // Simpan Seluruh Perubahan Cepat (Status, Deadline, Prioritas, Bukti & Kendala)
  const handleSaveChanges = async (targetStatusOverride?: string) => {
    setSavingChanges(true);
    setErrorMsg('');
    setSuccessMsg('');

    const finalStatus = targetStatusOverride || currentStatus;

    if (finalStatus === 'SELESAI' && (!evidenceLinkInput || evidenceLinkInput.trim() === '')) {
      setErrorMsg('Status "Selesai" wajib menyertakan Link Bukti Dokumen (Google Drive/Cloud)!');
      setSavingChanges(false);
      return;
    }

    if (finalStatus === 'TERKENDALA' && (!kendalaInput || kendalaInput.trim() === '')) {
      setErrorMsg('Status "Terkendala" wajib mencantumkan catatan kendala.');
      setSavingChanges(false);
      return;
    }

    const { error } = await supabase
      .from('tasks')
      .update({
        status: finalStatus,
        deadline: currentDeadline,
        priority: currentPriority,
        evidence_link: evidenceLinkInput.trim() || null,
        kendala_note: finalStatus === 'TERKENDALA' ? kendalaInput.trim() : (kendalaInput.trim() || null),
        completed_at: finalStatus === 'SELESAI' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId);

    if (error) {
      setErrorMsg('Gagal menyimpan perubahan: ' + error.message);
    } else {
      setSuccessMsg('Perubahan data tugas berhasil disimpan!');
      setTimeout(() => setSuccessMsg(''), 3000);
      loadTaskDetails();
    }
    setSavingChanges(false);
  };

  // Hapus Tugas
  const handleDeleteTask = async () => {
    if (!confirm('Apakah Anda yakin ingin menghapus tugas ini? Seluruh sub-pekerjaan dan penugasan PIC akan ikut terhapus.')) {
      return;
    }

    setDeletingTask(true);
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);

    if (error) {
      setErrorMsg('Gagal menghapus tugas: ' + error.message);
      setDeletingTask(false);
    } else {
      router.push('/tasks');
      router.refresh();
    }
  };

  // Helper Badge Hari
  const getDeadlineStatusBadge = () => {
    if (!task) return null;
    if (task.status === 'SELESAI') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5" /> Selesai Tervalidasi
        </span>
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(task.deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    const diffDays = Math.round((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-red-600 text-white shadow-xs">
          Terlambat {Math.abs(diffDays)} hari
        </span>
      );
    } else if (diffDays === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-white">
          Batas Hari Ini
        </span>
      );
    } else if (diffDays <= 3) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
          Sisa {diffDays} hari lagi
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200">
          Sisa {diffDays} hari
        </span>
      );
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-sm text-stone-400">Memuat rincian tugas...</div>;
  }

  if (!task) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-stone-600">{errorMsg || 'Tugas tidak ditemukan'}</p>
        <Link href="/tasks" className="text-sm font-semibold text-[#DF3B68]">Kembali ke Daftar Tugas</Link>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Top Bar Navigasi & Aksi CRUD Hapus/Edit */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/tasks"
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar
        </Link>
        
        <div className="flex items-center gap-2">
          {/* Tombol Edit Lengkap */}
          <Link
            href={`/tasks/${taskId}/edit`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-stone-700 bg-white border border-stone-200 hover:bg-stone-50 transition-colors shadow-xs"
          >
            <Edit3 className="w-3.5 h-3.5 text-stone-500" />
            Edit Lengkap
          </Link>

          {/* Tombol Hapus Tugas */}
          <button
            onClick={handleDeleteTask}
            disabled={deletingTask}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            {deletingTask ? 'Menghapus...' : 'Hapus Tugas'}
          </button>
        </div>
      </div>

      {/* Alert Notifikasi */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Header Rincian Tugas */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-stone-200/70 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            {getDeadlineStatusBadge()}
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold border bg-stone-50 text-stone-700">
              Periode {task.period_type} {task.period_month ? `(Bulan ${task.period_month}/${task.period_year})` : ''}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-400 font-medium">Prioritas:</span>
            <select
              value={currentPriority}
              onChange={(e) => setCurrentPriority(e.target.value)}
              className="text-xs font-bold px-2.5 py-1 rounded-lg border border-stone-200 bg-stone-50"
            >
              <option value="RENDAH">RENDAH</option>
              <option value="SEDANG">SEDANG</option>
              <option value="TINGGI">TINGGI</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-stone-900">{task.title}</h1>
          
          {/* Ubah Tenggat Waktu Langsung */}
          <div className="flex items-center gap-2 text-xs text-stone-600 pt-1">
            <CalendarDays className="w-4 h-4 text-[#DF3B68]" />
            <span className="font-semibold">Tenggat Waktu:</span>
            <input
              type="date"
              value={currentDeadline}
              onChange={(e) => setCurrentDeadline(e.target.value)}
              className="px-2 py-1 text-xs border border-stone-200 rounded-lg bg-stone-50 font-mono"
            />
          </div>
        </div>

        {task.description && (
          <p className="text-xs md:text-sm text-stone-600 leading-relaxed bg-stone-50/70 p-4 rounded-2xl border border-stone-100">
            {task.description}
          </p>
        )}

        {task.legal_basis && (
          <div className="text-xs text-stone-500">
            <span className="font-semibold text-stone-700">Dasar Hukum: </span>
            {task.legal_basis}
          </div>
        )}

        {/* PIC Daftar Pegawai */}
        {pics.length > 0 && (
          <div className="pt-1 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-stone-500">PIC Pelaksana:</span>
            {pics.map((p) => (
              <span key={p.id} className="text-[11px] bg-stone-100 text-stone-700 px-2.5 py-0.5 rounded-full font-medium border border-stone-200">
                {p.full_name} ({p.role})
              </span>
            ))}
          </div>
        )}

        {/* Progres Otomatis dari Subtask */}
        <div className="pt-2 space-y-1.5">
          <div className="flex justify-between text-xs font-semibold text-stone-700">
            <span>Kalkulasi Progres Pelaksanaan</span>
            <span>{task.progress_pct}%</span>
          </div>
          <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 rounded-full ${
                task.progress_pct === 100 ? 'bg-emerald-500' : 'bg-[#DF3B68]'
              }`}
              style={{ width: `${task.progress_pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Grid: Subtasks (Kiri) & Kontrol Status & Bukti (Kanan) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Kolom Subtasks (2 Kolom) */}
        <div className="md:col-span-2 bg-white p-6 rounded-3xl border border-stone-200/70 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h2 className="font-bold text-stone-900 text-base">Checklist Sub-pekerjaan</h2>
              <p className="text-xs text-stone-500">Centang tahapan yang selesai untuk mengkalkulasi progres otomatis.</p>
            </div>
            <span className="text-xs font-semibold text-stone-400">
              {subtasks.filter(s => s.is_completed).length} / {subtasks.length} Selesai
            </span>
          </div>

          {/* Form Tambah Subtask */}
          <form onSubmit={handleAddSubtask} className="flex gap-2">
            <input
              type="text"
              placeholder="Ketik tahapan/sub-pekerjaan baru..."
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              className="flex-1 px-3.5 py-2 text-xs bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20"
            />
            <button
              type="submit"
              disabled={addingSubtask || !newSubtaskTitle.trim()}
              className="px-4 py-2 bg-stone-900 text-white rounded-xl hover:bg-stone-800 disabled:bg-stone-300 transition-colors text-xs font-semibold flex items-center gap-1"
            >
              {addingSubtask ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Tambah
            </button>
          </form>

          {/* Daftar Subtask */}
          <div className="divide-y divide-stone-100 pt-1">
            {subtasks.length === 0 ? (
              <div className="py-8 text-center text-xs text-stone-400">
                Belum ada tahapan sub-pekerjaan. Tambahkan tahapan pertama melalui form di atas.
              </div>
            ) : (
              subtasks.map((st, idx) => (
                <div key={st.id} className="py-3 flex items-center justify-between gap-3 group">
                  <label className="flex items-center gap-3 cursor-pointer flex-1 select-none">
                    <input
                      type="checkbox"
                      checked={st.is_completed}
                      onChange={() => handleToggleSubtask(st.id, st.is_completed)}
                      className="w-4 h-4 rounded text-[#DF3B68] focus:ring-[#DF3B68] border-stone-300 cursor-pointer"
                    />
                    <span className={`text-xs md:text-sm ${st.is_completed ? 'line-through text-stone-400' : 'text-stone-800'}`}>
                      {idx + 1}. {st.title}
                    </span>
                  </label>
                  <button
                    onClick={() => handleDeleteSubtask(st.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-rose-600 transition-opacity"
                    title="Hapus tahapan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Kolom Kontrol Status & Bukti Dokumen (1 Kolom) */}
        <div className="bg-white p-6 rounded-3xl border border-stone-200/70 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h2 className="font-bold text-stone-900 text-base">Status & Validasi Bukti</h2>

            {/* Selector Status Langsung */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Ubah Status Pekerjaan:
              </label>
              <select
                value={currentStatus}
                onChange={(e) => setCurrentStatus(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-stone-200 bg-stone-50 focus:ring-2 focus:ring-[#DF3B68]/20"
              >
                <option value="BELUM_DIKERJAKAN">Belum Mulai</option>
                <option value="ON_PROGRESS">On Progress (Sedang Dikerjakan)</option>
                <option value="TERKENDALA">Terkendala</option>
                <option value="SELESAI">Selesai</option>
              </select>
            </div>

            {/* Input Link Bukti */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Link Bukti Dukung (Wajib saat Selesai)
              </label>
              <div className="relative">
                <LinkIcon className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={evidenceLinkInput}
                  onChange={(e) => setEvidenceLinkInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20"
                />
              </div>
              {task.evidence_link && (
                <a
                  href={task.evidence_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-[#DF3B68] hover:underline mt-1.5"
                >
                  Buka Link Bukti Tersimpan <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Input Catatan Kendala */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Catatan / Kendala {currentStatus === 'TERKENDALA' && <span className="text-rose-500">*</span>}
              </label>
              <textarea
                rows={3}
                placeholder="Deskripsikan hambatan atau kendala eksekusi..."
                value={kendalaInput}
                onChange={(e) => setKendalaInput(e.target.value)}
                className="w-full p-2.5 text-xs bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20 resize-none"
              />
            </div>
          </div>

          {/* Tombol Simpan Perubahan Cepat */}
          <div className="space-y-2 pt-4 border-t border-stone-100">
            <button
              onClick={() => handleSaveChanges()}
              disabled={savingChanges}
              className="w-full py-2.5 px-4 bg-[#DF3B68] hover:bg-[#C72F58] disabled:bg-stone-200 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              {savingChanges ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Simpan Pembaruan Tugas
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
