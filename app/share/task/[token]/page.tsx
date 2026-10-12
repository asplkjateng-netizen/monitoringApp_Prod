'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Building2, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ExternalLink, 
  BookOpen, 
  FileText, 
  Lock, 
  ShieldCheck, 
  Layers, 
  User, 
  CheckSquare, 
  Square,
  Loader2,
  Download,
  Share2,
  Tag
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { TaskCardExport } from '@/components/tasks/task-card-export';
import { toPng } from 'html-to-image';

function PublicTaskContent() {
  const params = useParams();
  const token = params?.token as string;
  const supabase = createClient();

  const [task, setTask] = useState<any>(null);
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [pics, setPics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingPng, setDownloadingPng] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Ref komponen tersembunyi untuk convert ke PNG
  const exportCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (token) {
      loadPublicTask();
    }
  }, [token]);

  const loadPublicTask = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);
      
      let query = supabase
        .from('tasks')
        .select('*, unit:units(id, name, level)')
        .eq('is_public_shared', true);

      if (isUUID) {
        query = query.or(`share_token.eq.${token},id.eq.${token}`);
      } else {
        query = query.eq('share_token', token);
      }

      const { data: taskData, error: taskError } = await query.maybeSingle();

      if (taskError || !taskData) {
        setErrorMsg('Tautan tidak valid, telah dinonaktifkan, atau otorisasi publik telah dicabut oleh unit pelaksana.');
        setLoading(false);
        return;
      }

      setTask(taskData);

      // Ambil Subtasks Terurut
      const { data: subData } = await supabase
        .from('subtasks')
        .select(`
          *,
          subtask_pics(
            user_id,
            profiles(id, full_name, role)
          )
        `)
        .eq('task_id', taskData.id)
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: true });

      setSubtasks(subData || []);

      // Ambil PIC Pelaksana
      const { data: picData } = await supabase
        .from('task_pics')
        .select('profile:profiles(id, full_name, nip, role)')
        .eq('task_id', taskData.id);

      if (picData) {
        setPics(picData.map((p: any) => p.profile));
      }
    } catch (err: any) {
      console.error('Error memuat data publik:', err);
      setErrorMsg('Terjadi kesalahan teknis saat memuat lembar pemantauan publik.');
    } finally {
      setLoading(false);
    }
  };

  const parseSafeDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1);
    return dt.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getProgressBarColor = (pct: number) => {
    if (pct >= 80) return 'bg-emerald-500';
    if (pct >= 31) return 'bg-amber-400';
    return 'bg-rose-500';
  };

  // Handler Unduh PNG Lembar Checklist
  const handleDownloadPng = async () => {
    if (!exportCardRef.current || downloadingPng) return;
    setDownloadingPng(true);

    try {
      const dataUrl = await toPng(exportCardRef.current, {
        cacheBust: true,
        pixelRatio: 2, // Resolusi Retina 2x Tajam
        quality: 0.95,
      });

      const safeTitle = (task.title || 'Checklist-Tugas')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .substring(0, 40);

      const link = document.createElement('a');
      link.download = `Checklist_${safeTitle}_${task.period_year || new Date().getFullYear()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err: any) {
      console.error('Gagal convert ke PNG:', err);
      alert('Gagal mengekspor gambar PNG. Silakan coba kembali.');
    } finally {
      setDownloadingPng(false);
    }
  };

  const effectiveProgress = task?.status === 'SELESAI' ? 100 : (task?.progress_pct || 0);
  const totalSub = subtasks.length;
  const completedSub = subtasks.filter((s) => s.is_completed).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas dark:bg-[#121212] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#DF3B68]" />
        <p className="text-xs font-semibold text-stone-500 dark:text-white/60 mt-3">
          Memverifikasi akses lembar pemantauan publik...
        </p>
      </div>
    );
  }

  // Layar Jika Tautan Dibatasi
  if (errorMsg || !task) {
    return (
      <div className="min-h-screen bg-canvas dark:bg-[#121212] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-[#1E1E1E] p-8 rounded-3xl border border-stone-200/80 dark:border-white/[0.08] shadow-xl text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-[#DF3B68] flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-900/50">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-stone-900 dark:text-white/90">Akses Tautan Dibatasi</h2>
          <p className="text-xs text-stone-500 dark:text-white/60 leading-relaxed">
            {errorMsg || 'Tugas ini tidak dibagikan ke publik atau otorisasi tautan telah dicabut.'}
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-900 hover:bg-stone-800 text-xs font-bold transition-colors"
            >
              Masuk dengan Akun Pegawai
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas dark:bg-[#121212] text-stone-900 dark:text-white/90 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* PUBLIC TOP NAV BAR */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#1E1E1E] px-5 py-3.5 rounded-2xl border border-stone-200/80 dark:border-white/[0.08] shadow-soft dark:shadow-dark-card">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#DF3B68] text-white font-bold flex items-center justify-center text-xs shadow-xs">
              GT
            </div>
            <div>
              <span className="text-xs font-bold text-stone-900 dark:text-white/90 block">Gov-Task-Monitor</span>
              <span className="text-[10px] text-stone-400 dark:text-white/40 font-mono">Portal Pemantauan Kinerja Vertikal</span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5" />
              Tervalidasi Publik
            </span>

            <button
              onClick={handleDownloadPng}
              disabled={downloadingPng}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#DF3B68] hover:bg-[#C72F58] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
              title="Unduh tabel checklist lengkap dalam format gambar PNG"
            >
              {downloadingPng ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>{downloadingPng ? 'Memproses...' : 'Unduh PNG'}</span>
            </button>
          </div>
        </header>

        {/* KARTU UTAMA LEMBAR TUGAS */}
        <div className="bg-white dark:bg-[#1E1E1E] p-6 sm:p-8 rounded-3xl border border-stone-200/80 dark:border-white/[0.08] shadow-soft dark:shadow-dark-card space-y-6">
          
          {/* Baris Badge Status */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 dark:border-white/[0.06] pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-stone-100 dark:bg-[#242424] text-stone-700 dark:text-white/70 border border-stone-200 dark:border-white/[0.08]">
                {task.category || 'TUSI POKOK'}
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-[#DF3B68] dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                Prioritas: {task.priority || 'SEDANG'}
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-stone-50 dark:bg-[#242424] text-stone-500 dark:text-white/60 border border-stone-200 dark:border-white/[0.08] font-mono">
                Periode: {task.period_type} {task.period_year}
              </span>
            </div>

            <div>
              <span className={`text-xs font-extrabold uppercase px-3 py-1 rounded-full ${
                task.status === 'SELESAI'
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                  : task.status === 'TERKENDALA'
                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                  : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
              }`}>
                {task.status === 'ON_PROGRESS' ? 'DALAM PENGERJAAN' : task.status}
              </span>
            </div>
          </div>

          {/* Judul & Deskripsi Singkat */}
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 dark:text-white/90 leading-snug">
              {task.title}
            </h1>

            {task.short_description && (
              <p className="text-xs sm:text-sm text-stone-600 dark:text-white/70 leading-relaxed font-normal">
                {task.short_description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-stone-600 dark:text-white/60 pt-1">
              {task.unit && (
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Building2 className="w-4 h-4 text-stone-400 dark:text-white/40" />
                  {task.unit.name}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 font-mono">
                <Calendar className="w-4 h-4 text-[#DF3B68] dark:text-rose-400" />
                Tenggat Waktu: {parseSafeDate(task.deadline)}
              </span>
            </div>
          </div>

          {/* Catatan Kendala jika Terkendala */}
          {task.kendala_note && task.status === 'TERKENDALA' && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block">Catatan Hambatan / Kendala:</strong>
                <p className="mt-0.5">{task.kendala_note}</p>
              </div>
            </div>
          )}

          {/* Progres Capaian */}
          <div className="space-y-2 pt-1">
            <div className="flex justify-between items-center text-xs font-bold text-stone-700 dark:text-white/70">
              <span>Capaian Progres Pelaksanaan</span>
              <span className="font-mono text-sm">{effectiveProgress}% ({completedSub}/{totalSub} Tahapan Selesai)</span>
            </div>
            <div className="w-full h-3 bg-stone-100 dark:bg-[#2C2C2C] rounded-full overflow-hidden border border-stone-200/60 dark:border-white/[0.06]">
              <div
                className={`h-full transition-all duration-300 rounded-full ${getProgressBarColor(effectiveProgress)}`}
                style={{ width: `${effectiveProgress}%` }}
              />
            </div>
          </div>

          {/* TABEL CHECKLIST TAHAPAN SUB-PEKERJAAN */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-white/[0.06] pb-2">
              <span className="text-xs font-bold text-stone-800 dark:text-white/90 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#DF3B68] dark:text-rose-400" />
                Tabel Tahapan Checklist & PIC Pelaksana
              </span>
              <span className="text-[10px] text-stone-400 dark:text-white/40 font-mono">
                {completedSub} dari {totalSub} Terverifikasi
              </span>
            </div>

            {subtasks.length === 0 ? (
              <p className="text-xs text-stone-400 dark:text-white/40 italic py-3 text-center bg-stone-50 dark:bg-[#242424] rounded-2xl">
                Tidak ada rincian tahapan sub-pekerjaan yang terdaftar.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-stone-200/80 dark:border-white/[0.08]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-stone-50 dark:bg-[#242424] text-stone-700 dark:text-white/70 font-semibold border-b border-stone-200/80 dark:border-white/[0.08] text-[11px]">
                      <th className="py-2.5 px-3 text-center w-12 border-r border-stone-200/80 dark:border-white/[0.08]">No</th>
                      <th className="py-2.5 px-3 border-r border-stone-200/80 dark:border-white/[0.08]">Uraian Tahapan Pekerjaan</th>
                      <th className="py-2.5 px-3 w-44 border-r border-stone-200/80 dark:border-white/[0.08]">PIC Pelaksana</th>
                      <th className="py-2.5 px-3 text-center w-32 border-r border-stone-200/80 dark:border-white/[0.08]">Batas Waktu</th>
                      <th className="py-2.5 px-3 text-center w-32">Status Verifikasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-white/[0.06]">
                    {subtasks.map((st, idx) => {
                      const picName = (st.subtask_pics && st.subtask_pics.length > 0)
                        ? st.subtask_pics[0]?.profiles?.full_name
                        : null;

                      return (
                        <tr 
                          key={st.id || idx}
                          className={st.is_completed ? 'bg-emerald-50/30 dark:bg-emerald-950/20' : 'hover:bg-stone-50/50 dark:hover:bg-[#242424]/40'}
                        >
                          <td className="py-2.5 px-3 text-center font-mono text-stone-500 dark:text-white/40 border-r border-stone-200/80 dark:border-white/[0.08]">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-stone-800 dark:text-white/90 border-r border-stone-200/80 dark:border-white/[0.08]">
                            <span className={st.is_completed ? 'line-through text-stone-400 dark:text-white/40' : ''}>
                              {st.title}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-stone-700 dark:text-white/80 border-r border-stone-200/80 dark:border-white/[0.08] text-[11px]">
                            {picName ? (
                              <span className="font-semibold text-stone-800 dark:text-white/90">{picName}</span>
                            ) : (
                              <span className="text-stone-400 dark:text-white/40 italic">Tim Pelaksana</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-[10px] text-stone-600 dark:text-white/60 border-r border-stone-200/80 dark:border-white/[0.08]">
                            {parseSafeDate(st.deadline)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {st.is_completed ? (
                              <span className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400 text-[10px] bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                                <CheckSquare className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Selesai
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-medium text-stone-500 dark:text-white/50 text-[10px] bg-stone-100 dark:bg-[#242424] px-2 py-0.5 rounded-full">
                                <Square className="w-3 h-3 text-stone-400 dark:text-white/40" /> Terjadwal
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Link Bukti Penyelesaian (Jika Ada) */}
          {task.evidence_link && (
            <div className="pt-2">
              <a
                href={task.evidence_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-[#DF3B68] dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span>Buka Dokumen Bukti Penyelesaian Cloud</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* PIC Pelaksana Utama */}
          {pics.length > 0 && (
            <div className="pt-2 border-t border-stone-100 dark:border-white/[0.06]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-white/40 block mb-1.5">
                PIC Tim Kerja Utama:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {pics.map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1.5 text-xs bg-stone-50 dark:bg-[#242424] border border-stone-200/80 dark:border-white/[0.08] px-3 py-1 rounded-full text-stone-700 dark:text-white/80"
                  >
                    <User className="w-3 h-3 text-stone-400 dark:text-white/40" />
                    {p.full_name} ({p.role})
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer Publik */}
        <footer className="text-center text-xs text-stone-400 dark:text-white/40 space-y-1">
          <p>© {new Date().getFullYear()} Gov-Task-Monitor • Portal Pemantauan Kinerja Vertikal</p>
          <p className="text-[10px]">Data diverifikasi secara aman & langsung dari database dinas.</p>
        </footer>

      </div>

      {/* ELEMEN OFF-SCREEN TERSEMBUNYI UNTUK GENERATE PNG BERKUALITAS TINGGI */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <TaskCardExport
          ref={exportCardRef}
          task={{
            ...task,
            subtasks,
            pics,
          }}
        />
      </div>
    </div>
  );
}

export default function PublicTaskPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-canvas dark:bg-[#121212] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#DF3B68]" />
      </div>
    }>
      <PublicTaskContent />
    </Suspense>
  );
}
