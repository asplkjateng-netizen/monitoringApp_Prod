'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
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
  CalendarDays, 
  Calendar,
  Info, 
  BookOpen, 
  Share2,
  Wrench,
  FileText,
  ListCollapse,
  User
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { TaskShareModal } from '@/components/tasks/task-share-modal';

interface LinkItem {
  name: string;
  url: string;
}

interface StaffProfile {
  id: string;
  full_name: string;
  nip: string;
  role: string;
}

interface DocSection {
  id: string;
  title: string;
  content: string;
}

// -------------------------------------------------------------
// KOMPONEN DAFTAR ISI INTERAKTIF RINGKAS (HIDE & SHOW ANTI-PANJANG)
// -------------------------------------------------------------
function NotionDocViewer({ rawContent }: { rawContent: string }) {
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  const sections: DocSection[] = useMemo(() => {
    if (!rawContent || !rawContent.trim()) return [];

    // Deteksi Tag H1 / H2 dari Editor Rich Text
    if (rawContent.includes('<h1') || rawContent.includes('<h2')) {
      const parts = rawContent.split(/<h[12][^>]*>/i);
      const result: DocSection[] = [];

      parts.forEach((part, index) => {
        if (!part.trim()) return;
        const closingIdx = part.search(/<\/h[12]>/i);
        if (closingIdx !== -1) {
          const title = part.substring(0, closingIdx).replace(/<[^>]+>/g, '').trim();
          const content = part.substring(closingIdx + 5).trim();
          result.push({
            id: `sec-${index}`,
            title: title || `Bagian ${index + 1}`,
            content: content
          });
        } else if (index === 0 && part.trim()) {
          result.push({
            id: `sec-intro`,
            title: 'Pengantar',
            content: part
          });
        }
      });
      return result;
    }

    // Deteksi Pola Judul Huruf Kapital (cth: "WAKTU PELAKSANAAN :", "RUANG LINGKUP :")
    const lines = rawContent.split('\n');
    const result: DocSection[] = [];
    let currentTitle = '';
    let currentBuffer: string[] = [];
    let sectionIdx = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      const isHeadingPattern = 
        (trimmed.endsWith(':') && trimmed.length < 60 && !trimmed.startsWith('http')) ||
        (i < lines.length - 1 && lines[i + 1]?.trim().startsWith('---')) ||
        /^[A-Z0-9\s.,()-]{4,45}:$/.test(trimmed);

      if (isHeadingPattern) {
        if (currentTitle || currentBuffer.length > 0) {
          result.push({
            id: `sec-${sectionIdx++}`,
            title: currentTitle || 'Pengantar',
            content: currentBuffer.join('\n').trim()
          });
          currentBuffer = [];
        }
        currentTitle = trimmed.replace(/:$/, '').replace(/-+$/, '').trim();
        if (i < lines.length - 1 && lines[i + 1]?.trim().startsWith('---')) {
          i++;
        }
      } else {
        currentBuffer.push(line);
      }
    }

    if (currentTitle || currentBuffer.length > 0) {
      result.push({
        id: `sec-${sectionIdx++}`,
        title: currentTitle || 'Uraian',
        content: currentBuffer.join('\n').trim()
      });
    }

    if (result.length === 0) {
      return [{ id: 'sec-all', title: 'Rincian Petunjuk Teknis', content: rawContent }];
    }

    return result;
  }, [rawContent]);

  if (sections.length <= 1 && sections[0]?.title === 'Rincian Petunjuk Teknis') {
    return (
      <div className="p-3.5 bg-stone-50/80 dark:bg-slate-800 rounded-2xl border border-stone-200/80 dark:border-slate-700 text-xs text-stone-700 dark:text-slate-200 leading-relaxed">
        {rawContent.includes('<') && rawContent.includes('>') ? (
          <div dangerouslySetInnerHTML={{ __html: rawContent }} />
        ) : (
          <div className="whitespace-pre-wrap">{rawContent}</div>
        )}
      </div>
    );
  }

  const activeSection = sections.find((s) => s.id === activeSectionId);

  return (
    <div className="space-y-2.5">
      <div className="p-3.5 bg-stone-50/90 dark:bg-slate-800 rounded-2xl border border-stone-200/90 dark:border-slate-700 shadow-2xs">
        <div className="flex items-center justify-between pb-2 border-b border-stone-200/70 dark:border-slate-700/60 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-stone-900 dark:text-slate-100">
            <ListCollapse className="w-3.5 h-3.5 text-[#DF3B68]" />
            <span>Daftar Isi Petunjuk Teknis ({sections.length} Bab)</span>
          </div>
          <span className="text-[11px] text-stone-400">
            {activeSectionId ? 'Klik bab aktif untuk menutup' : 'Pilih bab untuk melihat rincian'}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-2">
          {sections.map((sec, idx) => {
            const isActive = activeSectionId === sec.id;
            return (
              <button
                type="button"
                key={sec.id}
                onClick={() => setActiveSectionId(isActive ? null : sec.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-2xs ${
                  isActive
                    ? 'bg-[#DF3B68] text-white font-bold ring-2 ring-[#DF3B68]/30 shadow-xs'
                    : 'bg-white dark:bg-slate-700/60 text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-700 border border-stone-200 dark:border-slate-700'
                }`}
              >
                <span className={`text-[10px] ${isActive ? 'text-white/80' : 'text-stone-400'}`}>{idx + 1}.</span>
                <span>{sec.title}</span>
                <span className="text-[10px] ml-0.5 opacity-80">{isActive ? '▲' : '▼'}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeSection && (
        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-[#DF3B68]/30 dark:border-[#DF3B68]/40 shadow-sm animate-in fade-in slide-in-from-top-1 duration-150 space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-slate-700">
            <p className="font-extrabold text-[#DF3B68] text-xs uppercase tracking-wide flex items-center gap-1.5">
              <span>📖 {activeSection.title}</span>
            </p>
            <button
              type="button"
              onClick={() => setActiveSectionId(null)}
              className="text-[11px] text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 underline"
            >
              Tutup Uraian
            </button>
          </div>

          <div className="text-xs text-stone-800 dark:text-slate-200 leading-relaxed pt-1">
            {activeSection.content.includes('<') && activeSection.content.includes('>') ? (
              <div 
                className="space-y-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-1.5 [&_b]:font-bold"
                dangerouslySetInnerHTML={{ __html: activeSection.content }}
              />
            ) : (
              <div className="whitespace-pre-wrap leading-relaxed font-sans">
                {activeSection.content}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params?.id as string;
  const supabase = createClient();

  const [task, setTask] = useState<any>(null);
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [pics, setPics] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // State Modal Sharing Hub
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // States Tambah Subtask Baru
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskDeadline, setNewSubtaskDeadline] = useState('');
  const [newSubtaskPicId, setNewSubtaskPicId] = useState('');
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
  const [manualNotice, setManualNotice] = useState<string>('');

  useEffect(() => {
    if (taskId) {
      loadTaskDetails();
    }
  }, [taskId]);

  const loadTaskDetails = async () => {
    setLoading(true);
    setErrorMsg('');

    // 1. Ambil Data Tugas beserta Unit Kerja
    const { data: taskData, error: taskError } = await supabase
      .from('tasks')
      .select('*, unit:units(id, name, level)')
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

    // 2. Ambil Subtasks beserta relasi subtask_pics
    const { data: subData, error: subError } = await supabase
      .from('subtasks')
      .select(`
        *,
        subtask_pics(
          user_id,
          profiles(id, full_name, role)
        )
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (subError) {
      setErrorMsg('Gagal memuat sub-pekerjaan: ' + subError.message);
    } else {
      setSubtasks(subData || []);
    }

    // 3. Ambil PIC Utama Tugas
    const { data: picData } = await supabase
      .from('task_pics')
      .select('profile:profiles(id, full_name, nip, role)')
      .eq('task_id', taskId);

    if (picData) setPics(picData.map((p: any) => p.profile));

    // 4. Ambil Daftar Pegawai di Unit ini untuk opsi PIC subtask
    if (taskData.unit_id) {
      const { data: staffData } = await supabase
        .from('profiles')
        .select('id, full_name, nip, role')
        .eq('unit_id', taskData.unit_id)
        .eq('approval_status', 'APPROVED')
        .order('full_name', { ascending: true });

      if (staffData) setStaffList(staffData);
    }

    setLoading(false);
  };

  const getProgressBarColor = (pct: number) => {
    if (pct >= 80) return 'bg-emerald-500';
    if (pct >= 31) return 'bg-amber-400';
    return 'bg-rose-500';
  };

  const getRegulationsList = (): LinkItem[] => {
    if (!task) return [];
    if (task.regulations && Array.isArray(task.regulations) && task.regulations.length > 0) {
      return task.regulations.filter((r: LinkItem) => r.name || r.url);
    }
    if (task.legal_basis) {
      return [{ name: task.legal_basis, url: task.legal_basis_link || '' }];
    }
    return [];
  };

  const getToolsList = (): LinkItem[] => {
    if (!task) return [];
    if (task.tools && Array.isArray(task.tools) && task.tools.length > 0) {
      return task.tools.filter((t: LinkItem) => t.name || t.url);
    }
    return [];
  };

  const handleToggleSubtask = async (subtaskId: string, currentStatusVal: boolean) => {
    const nextVal = !currentStatusVal;

    const updatedSubtasks = subtasks.map((s) =>
      s.id === subtaskId ? { ...s, is_completed: nextVal } : s
    );
    const total = updatedSubtasks.length;
    const completed = updatedSubtasks.filter((s) => s.is_completed).length;
    const calcProgress = total > 0 ? Math.round((completed / total) * 100) : 0;

    let nextStatus = currentStatus;
    if (currentStatus !== 'TERKENDALA') {
      if (completed === total) {
        nextStatus = 'SELESAI';
      } else if (completed > 0) {
        nextStatus = 'ON_PROGRESS';
      } else {
        nextStatus = 'BELUM_DIKERJAKAN';
      }
    }

    const { error: subtaskErr } = await supabase
      .from('subtasks')
      .update({ is_completed: nextVal, updated_at: new Date().toISOString() })
      .eq('id', subtaskId);

    if (subtaskErr) {
      setErrorMsg('Gagal memperbarui checklist: ' + subtaskErr.message);
      return;
    }

    await supabase
      .from('tasks')
      .update({
        progress_pct: calcProgress,
        status: nextStatus,
        completed_at: nextStatus === 'SELESAI' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId);

    setCurrentStatus(nextStatus);
    setManualNotice('');

    if (nextStatus === 'SELESAI') {
      setSuccessMsg('Semua tahapan tuntas! Status otomatis beralih ke "Selesai".');
      setTimeout(() => setSuccessMsg(''), 4000);
    }

    await loadTaskDetails();
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;

    if (newSubtaskDeadline && currentDeadline && newSubtaskDeadline > currentDeadline) {
      setErrorMsg(`Batas waktu tahapan (${newSubtaskDeadline}) tidak boleh melebihi batas waktu tugas utama (${currentDeadline}).`);
      return;
    }

    setAddingSubtask(true);
    setErrorMsg('');

    const { data: createdSubtask, error: subtaskError } = await supabase
      .from('subtasks')
      .insert({
        task_id: taskId,
        title: newSubtaskTitle.trim(),
        deadline: newSubtaskDeadline || null,
        is_completed: false,
        evidence_link_type: 'INHERIT',
      })
      .select('id')
      .single();

    if (subtaskError || !createdSubtask) {
      setErrorMsg('Gagal menyimpan subtask: ' + (subtaskError?.message || ''));
    } else {
      // Jika PIC dipilih, rekam ke tabel subtask_pics
      if (newSubtaskPicId) {
        await supabase.from('subtask_pics').insert({
          subtask_id: createdSubtask.id,
          user_id: newSubtaskPicId,
        });
      }

      setNewSubtaskTitle('');
      setNewSubtaskDeadline('');
      setNewSubtaskPicId('');
      await loadTaskDetails();
    }
    setAddingSubtask(false);
  };

  // Handler ubah / pilih PIC sub-tugas yang sudah ada
  const handleUpdateSubtaskPic = async (subtaskId: string, targetPicId: string) => {
    try {
      await supabase.from('subtask_pics').delete().eq('subtask_id', subtaskId);

      if (targetPicId) {
        await supabase.from('subtask_pics').insert({
          subtask_id: subtaskId,
          user_id: targetPicId,
        });
      }

      await loadTaskDetails();
    } catch (err: any) {
      setErrorMsg('Gagal memperbarui PIC tahapan: ' + err.message);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    const { error } = await supabase.from('subtasks').delete().eq('id', subtaskId);
    if (error) {
      setErrorMsg('Gagal menghapus subtask: ' + error.message);
    } else {
      loadTaskDetails();
    }
  };

  const handleManualStatusChange = (val: string) => {
    setCurrentStatus(val);
    setManualNotice(`Perhatian: Anda mengubah status secara manual menjadi "${val}". Klik tombol "Simpan Pembaruan Tugas" untuk menerapkan.`);
  };

  const handleSaveChanges = async () => {
    setSavingChanges(true);
    setErrorMsg('');
    setSuccessMsg('');

    if (currentStatus === 'TERKENDALA' && (!kendalaInput || kendalaInput.trim() === '')) {
      setErrorMsg('Status "Terkendala" wajib mencantumkan catatan kendala.');
      setSavingChanges(false);
      return;
    }

    const isNewlyTerkendala = currentStatus === 'TERKENDALA' && task.status !== 'TERKENDALA';

    const { error } = await supabase
      .from('tasks')
      .update({
        status: currentStatus,
        deadline: currentDeadline,
        priority: currentPriority,
        evidence_link: evidenceLinkInput.trim() || null,
        kendala_note: currentStatus === 'TERKENDALA' ? kendalaInput.trim() : (kendalaInput.trim() || null),
        completed_at: currentStatus === 'SELESAI' ? (task?.completed_at || new Date().toISOString()) : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId);

    if (error) {
      setErrorMsg('Gagal menyimpan perubahan: ' + error.message);
    } else {
      if (isNewlyTerkendala) {
        try {
          const { data: leaders } = await supabase
            .from('profiles')
            .select('id')
            .eq('unit_id', task.unit_id)
            .in('role', ['KEPALA_SEKSI', 'KEPALA_UNIT', 'SUPER_ADMIN']);

          const targetUserIds = new Set<string>();
          if (leaders) leaders.forEach((l) => targetUserIds.add(l.id));
          if (task.created_by) targetUserIds.add(task.created_by);
          pics.forEach((p) => targetUserIds.add(p.id));

          if (targetUserIds.size > 0) {
            const notifPayloads = Array.from(targetUserIds).map((uid) => ({
              user_id: uid,
              title: `⚠️ Pekerjaan Terkendala: ${task.title}`,
              message: `Pekerjaan dilaporkan terkendala: "${kendalaInput.trim()}". Perlu arahan atau koordinasi penyelesaian.`,
              action_link: `/tasks/${taskId}`,
              is_read: false,
            }));
            await supabase.from('notifications').insert(notifPayloads);
          }
        } catch (notifErr) {
          console.warn('Gagal memicu notifikasi kendala:', notifErr);
        }
      }

      setSuccessMsg(`Status tugas berhasil diperbarui ke "${currentStatus}"!`);
      setManualNotice('');
      setTimeout(() => setSuccessMsg(''), 4000);
      loadTaskDetails();
    }
    setSavingChanges(false);
  };

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

  const getDeadlineStatusBadge = () => {
    if (!task) return null;
    if (task.status === 'SELESAI') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
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
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800">
          Sisa {diffDays} hari lagi
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 border border-stone-200 dark:border-slate-700">
          Sisa {diffDays} hari
        </span>
      );
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-sm text-stone-400 dark:text-slate-500">Memuat rincian tugas...</div>;
  }

  if (!task) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-stone-600 dark:text-slate-400">{errorMsg || 'Tugas tidak ditemukan'}</p>
        <Link href="/tasks" className="text-sm font-semibold text-[#DF3B68]">Kembali ke Daftar Tugas</Link>
      </div>
    );
  }

  const regList = getRegulationsList();
  const toolsList = getToolsList();
  const formattedDeadline = new Date(task.deadline).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      {/* MODAL SHARING HUB */}
      {task && (
        <TaskShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          task={{
            ...task,
            subtasks,
            pics,
          }}
          onShareStatusChanged={(isShared) => {
            setTask((prev: any) => ({ ...prev, is_public_shared: isShared }));
          }}
        />
      )}

      {/* Top Bar Navigasi & Aksi */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/tasks"
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar
        </Link>
        
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsShareModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-[#DF3B68] bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors shadow-xs"
          >
            <Share2 className="w-3.5 h-3.5" />
            Bagikan
          </button>

          <Link
            href={`/tasks/${taskId}/edit`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-stone-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-750 transition-colors shadow-xs"
          >
            <Edit3 className="w-3.5 h-3.5 text-stone-500" />
            Edit Lengkap
          </Link>

          <button
            onClick={handleDeleteTask}
            disabled={deletingTask}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            {deletingTask ? 'Menghapus...' : 'Hapus Tugas'}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {manualNotice && (
        <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-blue-800 dark:text-blue-300 text-xs flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
          <span>{manualNotice}</span>
        </div>
      )}

      {/* Header Rincian Tugas */}
      <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-stone-200/70 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* LENCANA TENGGAT MERAH BATA TEGAS */}
            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold bg-[#DF3B68] text-white px-3 py-1 rounded-full shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-white/90" />
              <span>Tenggat: {formattedDeadline}</span>
            </span>

            {getDeadlineStatusBadge()}
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold border bg-stone-50 dark:bg-slate-800 text-stone-700 dark:text-slate-300 border-stone-200 dark:border-slate-700">
              Periode {task.period_type} {task.period_month ? `(Bulan ${task.period_month}/${task.period_year})` : ''}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-400 dark:text-slate-500 font-medium">Prioritas:</span>
            <select
              value={currentPriority}
              onChange={(e) => setCurrentPriority(e.target.value)}
              className="text-xs font-bold px-2.5 py-1 rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 text-stone-800 dark:text-slate-200"
            >
              <option value="RENDAH">RENDAH</option>
              <option value="SEDANG">SEDANG</option>
              <option value="TINGGI">TINGGI</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-slate-100 leading-snug">
            {task.title}
          </h1>

          {/* DESKRIPSI SINGKAT MANUAL DARI INPUT FORMULIR */}
          {task.short_description && (
            <p className="text-xs sm:text-sm text-stone-600 dark:text-slate-300 leading-relaxed font-normal pt-0.5">
              {task.short_description}
            </p>
          )}
          
          <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-slate-400 pt-2">
            <CalendarDays className="w-4 h-4 text-[#DF3B68]" />
            <span className="font-semibold">Ubah Tenggat Waktu:</span>
            <input
              type="date"
              value={currentDeadline}
              onChange={(e) => setCurrentDeadline(e.target.value)}
              className="px-2 py-1 text-xs border border-stone-200 dark:border-slate-700 rounded-lg bg-stone-50 dark:bg-slate-800 text-stone-800 dark:text-slate-200 font-mono"
            />
          </div>
        </div>

        {/* Petunjuk Teknis & Deskripsi dengan NOTION DOC VIEWER (HIDE & SHOW) */}
        {task.description && (
          <div className="pt-2">
            <NotionDocViewer rawContent={task.description} />
          </div>
        )}

        {/* Dasar Hukum (Multi-Regulasi) */}
        {regList.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
            <span className="font-bold text-stone-800 dark:text-slate-200 flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-blue-600" /> Dasar Hukum:
            </span>
            {regList.map((reg, idx) => (
              <div key={idx} className="inline-flex items-center gap-1.5 bg-stone-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-stone-200 dark:border-slate-700 shadow-2xs">
                <span className="font-mono text-stone-800 dark:text-slate-200 font-semibold">{reg.name}</span>
                {reg.url && (
                  <a
                    href={reg.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 hover:underline"
                    title="Buka Tautan Regulasi"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Tools & Aplikasi Kerja */}
        {toolsList.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
            <span className="font-bold text-emerald-900 dark:text-emerald-400 flex items-center gap-1">
              <Wrench className="w-3.5 h-3.5 text-emerald-600" /> Tools & Kertas Kerja:
            </span>
            {toolsList.map((tool, idx) => (
              <a
                key={idx}
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 px-3 py-1 rounded-lg border border-emerald-300 dark:border-emerald-800 transition-colors font-semibold shadow-2xs"
              >
                <span>{tool.name}</span>
                <ExternalLink className="w-3 h-3 text-emerald-600" />
              </a>
            ))}
          </div>
        )}

        {pics.length > 0 && (
          <div className="pt-1 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-stone-500 dark:text-slate-400">PIC Utama Tugas:</span>
            {pics.map((p) => (
              <span key={p.id} className="text-[11px] bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 px-2.5 py-0.5 rounded-full font-medium border border-stone-200 dark:border-slate-700">
                {p.full_name} ({p.role})
              </span>
            ))}
          </div>
        )}

        {/* Progress Bar */}
        <div className="pt-2 space-y-1.5">
          <div className="flex justify-between text-xs font-semibold text-stone-700 dark:text-slate-300">
            <span>Kalkulasi Progres Pelaksanaan</span>
            <span className="font-mono">{task.progress_pct}%</span>
          </div>
          <div className="w-full h-3 bg-stone-100 dark:bg-slate-800 rounded-full overflow-hidden border border-stone-200/60 dark:border-slate-700">
            <div 
              className={`h-full transition-all duration-500 rounded-full ${getProgressBarColor(task.progress_pct || 0)}`}
              style={{ width: `${task.progress_pct || 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Subtasks (Kiri) & Kontrol Cepat (Kanan) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Kolom Subtasks */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-stone-200/70 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="font-bold text-stone-900 dark:text-slate-100 text-base">Checklist Sub-pekerjaan & PIC</h2>
              <p className="text-xs text-stone-500 dark:text-slate-400">Pilih PIC untuk tiap tahapan (opsional) atau tentukan kemudian.</p>
            </div>
            <span className="text-xs font-semibold text-stone-500 dark:text-slate-400 bg-stone-100 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-stone-200 dark:border-slate-700">
              {subtasks.filter(s => s.is_completed).length} / {subtasks.length} Selesai
            </span>
          </div>

          {/* Form Tambah Subtask dengan PIC Opsional */}
          <form onSubmit={handleAddSubtask} className="flex flex-col gap-2 p-3 bg-stone-50 dark:bg-slate-800/60 rounded-2xl border border-stone-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Ketik uraian tahapan sub-pekerjaan baru..."
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                className="flex-1 px-3 py-2 text-xs bg-white dark:bg-slate-800 text-stone-900 dark:text-slate-100 rounded-xl border border-stone-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/30"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Dropdown PIC Opsional */}
              <select
                value={newSubtaskPicId}
                onChange={(e) => setNewSubtaskPicId(e.target.value)}
                className="flex-1 min-w-[160px] px-2.5 py-2 text-xs bg-white dark:bg-slate-800 text-stone-700 dark:text-slate-200 rounded-xl border border-stone-200 dark:border-slate-700"
              >
                <option value="">-- Tanpa PIC (Kosong) --</option>
                {staffList.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.full_name} ({staff.role})
                  </option>
                ))}
              </select>

              <input
                type="date"
                max={currentDeadline || undefined}
                value={newSubtaskDeadline}
                onChange={(e) => setNewSubtaskDeadline(e.target.value)}
                className="px-2.5 py-2 text-xs bg-white dark:bg-slate-800 text-stone-800 dark:text-slate-200 rounded-xl border border-stone-200 dark:border-slate-700 font-mono"
                title="Batas waktu tahapan (opsional)"
              />

              <button
                type="submit"
                disabled={addingSubtask || !newSubtaskTitle.trim()}
                className="px-4 py-2 bg-stone-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl hover:bg-stone-800 disabled:opacity-50 transition-colors text-xs font-semibold flex items-center gap-1 shadow-2xs"
              >
                {addingSubtask ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Tambah
              </button>
            </div>
          </form>

          {/* List Subtasks dengan Penyesuaian PIC Cepat */}
          <div className="divide-y divide-stone-100 dark:divide-slate-800 pt-1">
            {subtasks.length === 0 ? (
              <div className="py-8 text-center text-xs text-stone-400 dark:text-slate-500">
                Belum ada tahapan sub-pekerjaan. Tambahkan tahapan pada formulir di atas.
              </div>
            ) : (
              subtasks.map((st, idx) => {
                const currentSubPicId = (st.subtask_pics && st.subtask_pics.length > 0)
                  ? st.subtask_pics[0]?.user_id
                  : '';

                return (
                  <div key={st.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
                    <label className="flex items-center gap-3 cursor-pointer flex-1 select-none">
                      <input
                        type="checkbox"
                        checked={st.is_completed}
                        onChange={() => handleToggleSubtask(st.id, st.is_completed)}
                        className="w-4 h-4 rounded text-[#DF3B68] focus:ring-[#DF3B68] border-stone-300 dark:border-slate-700 cursor-pointer"
                      />
                      <span className={`text-xs md:text-sm ${st.is_completed ? 'line-through text-stone-400 dark:text-slate-500 font-normal' : 'text-stone-800 dark:text-slate-200 font-medium'}`}>
                        {idx + 1}. {st.title}
                      </span>
                    </label>

                    <div className="flex items-center gap-2 pl-7 sm:pl-0">
                      {/* Dropdown Pengaturan / Pengubahan PIC Subtask Langsung */}
                      <div className="relative">
                        <select
                          value={currentSubPicId}
                          onChange={(e) => handleUpdateSubtaskPic(st.id, e.target.value)}
                          className="text-[11px] font-semibold py-1 px-2 pr-6 rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 text-stone-700 dark:text-slate-300 max-w-[140px] truncate"
                          title="Ubah PIC tahapan"
                        >
                          <option value="">-- Tanpa PIC --</option>
                          {staffList.map((staff) => (
                            <option key={staff.id} value={staff.id}>
                              {staff.full_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {st.deadline && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 border border-stone-200 dark:border-slate-700">
                          Batas: {st.deadline}
                        </span>
                      )}

                      <button
                        onClick={() => handleDeleteSubtask(st.id)}
                        className="p-1 text-stone-400 hover:text-rose-600 transition-colors"
                        title="Hapus tahapan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Kolom Kontrol Status & Bukti */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-stone-200/70 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between transition-colors">
          <div className="space-y-4">
            <h2 className="font-bold text-stone-900 dark:text-slate-100 text-base">Status & Validasi Bukti</h2>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300 mb-1">
                Ubah Status Pekerjaan:
              </label>
              <select
                value={currentStatus}
                onChange={(e) => handleManualStatusChange(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 text-stone-800 dark:text-slate-200 focus:ring-2 focus:ring-[#DF3B68]/30"
              >
                <option value="BELUM_DIKERJAKAN">Belum Mulai</option>
                <option value="ON_PROGRESS">On Progress (Sedang Dikerjakan)</option>
                <option value="TERKENDALA">Terkendala</option>
                <option value="SELESAI">Selesai</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300 mb-1">
                Link Bukti Dukung (Google Drive / Cloud)
              </label>
              <div className="relative">
                <LinkIcon className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={evidenceLinkInput}
                  onChange={(e) => setEvidenceLinkInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 dark:bg-slate-800 text-stone-800 dark:text-slate-200 rounded-xl border border-stone-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/30 font-mono"
                />
              </div>
              {task.evidence_link && (
                <a
                  href={task.evidence_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-[#DF3B68] hover:underline mt-1.5 font-semibold"
                >
                  Buka Link Bukti Tersimpan <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300 mb-1">
                Catatan / Kendala {currentStatus === 'TERKENDALA' && <span className="text-rose-500">*</span>}
              </label>
              <textarea
                rows={3}
                placeholder="Deskripsikan hambatan atau kendala eksekusi..."
                value={kendalaInput}
                onChange={(e) => setKendalaInput(e.target.value)}
                className="w-full p-2.5 text-xs bg-stone-50 dark:bg-slate-800 text-stone-800 dark:text-slate-200 rounded-xl border border-stone-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/30 resize-none"
              />
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-stone-100 dark:border-slate-800">
            <button
              onClick={handleSaveChanges}
              disabled={savingChanges}
              className="w-full py-2.5 px-4 bg-[#DF3B68] hover:bg-[#C72F58] disabled:opacity-50 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs"
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
