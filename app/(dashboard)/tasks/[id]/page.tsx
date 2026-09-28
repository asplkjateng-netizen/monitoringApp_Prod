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
  Save
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params?.id as string;
  const supabase = createClient();

  const [task, setTask] = useState<any>(null);
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [evidenceLinkInput, setEvidenceLinkInput] = useState('');
  const [kendalaInput, setKendalaInput] = useState('');
  const [savingEvidence, setSavingEvidence] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (taskId) {
      loadTaskDetails();
    }
  }, [taskId]);

  const loadTaskDetails = async () => {
    setLoading(true);
    // 1. Ambil data Task
    const { data: taskData, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (taskError || !taskData) {
      setErrorMsg('Tugas tidak ditemukan');
      setLoading(false);
      return;
    }

    setTask(taskData);
    setEvidenceLinkInput(taskData.evidence_link || '');
    setKendalaInput(taskData.kendala_note || '');

    // 2. Ambil data Subtasks
    const { data: subData } = await supabase
      .from('subtasks')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (subData) setSubtasks(subData);
    setLoading(false);
  };

  // Toggle checklist subtask -> memicu trigger otomatis update progress_pct di tasks
  const handleToggleSubtask = async (subtaskId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('subtasks')
      .update({ is_completed: !currentStatus, updated_at: new Date().toISOString() })
      .eq('id', subtaskId);

    if (!error) {
      // Reload untuk mendapatkan persentase hasil trigger DB
      loadTaskDetails();
    }
  };

  // Tambah subtask baru
  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;

    const { error } = await supabase
      .from('subtasks')
      .insert({
        task_id: taskId,
        title: newSubtaskTitle.trim(),
        is_completed: false
      });

    if (!error) {
      setNewSubtaskTitle('');
      loadTaskDetails();
    }
  };

  // Hapus subtask
  const handleDeleteSubtask = async (subtaskId: string) => {
    const { error } = await supabase.from('subtasks').delete().eq('id', subtaskId);
    if (!error) loadTaskDetails();
  };

  // Simpan Bukti Link Dokumen & Selesaikan Tugas
  const handleSaveEvidenceAndStatus = async (targetStatus?: string) => {
    setSavingEvidence(true);
    setErrorMsg('');

    const newStatus = targetStatus || task.status;

    // Validasi aturan skema: Selesai wajib menyertakan evidence_link
    if (newStatus === 'SELESAI' && (!evidenceLinkInput || evidenceLinkInput.trim() === '')) {
      setErrorMsg('Tugas tidak dapat diselesaikan tanpa Link Bukti Dukung (Google Drive/Cloud Storage)!');
      setSavingEvidence(false);
      return;
    }

    const { error } = await supabase
      .from('tasks')
      .update({
        evidence_link: evidenceLinkInput.trim() || null,
        kendala_note: kendalaInput.trim() || null,
        status: newStatus,
        completed_at: newStatus === 'SELESAI' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId);

    if (error) {
      setErrorMsg(error.message);
    } else {
      loadTaskDetails();
    }
    setSavingEvidence(false);
  };

  if (loading) {
    return <div className="p-12 text-center text-sm text-stone-400">Memuat detail tugas...</div>;
  }

  if (!task) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-stone-600">{errorMsg || 'Data tidak ditemukan'}</p>
        <Link href="/tasks" className="text-sm font-semibold text-[#DF3B68]">Kembali ke Daftar Tugas</Link>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/tasks"
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full font-semibold border bg-stone-100 text-stone-700">
            Prioritas: {task.priority}
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full font-semibold border bg-stone-100 text-stone-700">
            Status: {task.status}
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Task Header Card */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-stone-200/70 shadow-sm space-y-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <Calendar className="w-3.5 h-3.5" />
            Tenggat Waktu: {new Date(task.deadline).toLocaleDateString('id-ID', { dateStyle: 'long' })}
          </div>
          <h1 className="text-2xl font-bold text-stone-900">{task.title}</h1>
        </div>

        {task.description && (
          <p className="text-sm text-stone-600 leading-relaxed bg-stone-50/70 p-4 rounded-2xl border border-stone-100">
            {task.description}
          </p>
        )}

        {task.legal_basis && (
          <div className="text-xs text-stone-500">
            <span className="font-semibold text-stone-700">Dasar Hukum: </span>
            {task.legal_basis}
          </div>
        )}

        {/* Progress Bar Header */}
        <div className="pt-2 space-y-1.5">
          <div className="flex justify-between text-xs font-semibold text-stone-700">
            <span>Penyelesaian Sub-pekerjaan</span>
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

      {/* Grid: Subtasks (Kiri) & Evidence/Action (Kanan) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Kolom Subtasks (2 Kolom) */}
        <div className="md:col-span-2 bg-white p-6 rounded-3xl border border-stone-200/70 shadow-sm space-y-4">
          <h2 className="font-bold text-stone-900 text-base">Checklist Sub-pekerjaan</h2>
          <p className="text-xs text-stone-500">Centang sub-tugas yang telah selesai untuk mengalkulasi progres otomatis.</p>

          {/* Form Quick Add Subtask */}
          <form onSubmit={handleAddSubtask} className="flex gap-2">
            <input
              type="text"
              placeholder="Tambahkan tahapan/sub-pekerjaan baru..."
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              className="flex-1 px-3.5 py-2 text-sm bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20 focus:border-[#DF3B68]"
            />
            <button
              type="submit"
              className="px-3 py-2 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors text-xs font-medium flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Tambah
            </button>
          </form>

          {/* Subtask Items */}
          <div className="divide-y divide-stone-100 pt-2">
            {subtasks.length === 0 ? (
              <p className="text-xs text-stone-400 py-6 text-center">Belum ada tahapan sub-pekerjaan.</p>
            ) : (
              subtasks.map((st) => (
                <div key={st.id} className="py-3 flex items-center justify-between gap-3 group">
                  <label className="flex items-center gap-3 cursor-pointer flex-1 select-none">
                    <input
                      type="checkbox"
                      checked={st.is_completed}
                      onChange={() => handleToggleSubtask(st.id, st.is_completed)}
                      className="w-4 h-4 rounded text-[#DF3B68] focus:ring-[#DF3B68] border-stone-300 cursor-pointer"
                    />
                    <span className={`text-sm ${st.is_completed ? 'line-through text-stone-400' : 'text-stone-800'}`}>
                      {st.title}
                    </span>
                  </label>
                  <button
                    onClick={() => handleDeleteSubtask(st.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-rose-600 transition-opacity"
                    title="Hapus"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Kolom Bukti & Eksekusi Status (1 Kolom) */}
        <div className="bg-white p-6 rounded-3xl border border-stone-200/70 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h2 className="font-bold text-stone-900 text-base">Validasi Dokumen Bukti</h2>
            
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
                  className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20 focus:border-[#DF3B68]"
                />
              </div>
              {task.evidence_link && (
                <a
                  href={task.evidence_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-[#DF3B68] hover:underline mt-1.5"
                >
                  Buka Link Bukti <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Catatan / Kendala</label>
              <textarea
                rows={3}
                placeholder="Tuliskan kendala jika ada..."
                value={kendalaInput}
                onChange={(e) => setKendalaInput(e.target.value)}
                className="w-full p-2.5 text-xs bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20 focus:border-[#DF3B68]"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-4 border-t border-stone-100">
            <button
              onClick={() => handleSaveEvidenceAndStatus('SELESAI')}
              disabled={savingEvidence || !evidenceLinkInput.trim()}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-200 disabled:text-stone-400 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              Selesaikan Tugas (Validasi)
            </button>

            <button
              onClick={() => handleSaveEvidenceAndStatus('TERKENDALA')}
              disabled={savingEvidence}
              className="w-full py-2 px-4 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <AlertCircle className="w-4 h-4 text-amber-600" />
              Tandai Terkendala
            </button>

            <button
              onClick={() => handleSaveEvidenceAndStatus()}
              disabled={savingEvidence}
              className="w-full py-2 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              Simpan Perubahan
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
