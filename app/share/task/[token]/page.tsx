'use client';

import { useState, useEffect, Suspense } from 'react';
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
  Share2
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

function PublicTaskContent() {
  const params = useParams();
  const token = params?.token as string;
  const supabase = createClient();

  const [task, setTask] = useState<any>(null);
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [pics, setPics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (token) {
      loadPublicTask();
    }
  }, [token]);

  const loadPublicTask = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      // 1. Ambil data tugas berdasarkan share_token atau id tugas (wajib is_public_shared = true)
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
        setErrorMsg('Tautan tidak valid, telah dinonaktifkan, atau akses publik telah ditutup.');
        setLoading(false);
        return;
      }

      setTask(taskData);

      // 2. Ambil Subtasks Terkait
      const { data: subData } = await supabase
        .from('subtasks')
        .select('*')
        .eq('task_id', taskData.id)
        .order('created_at', { ascending: true });

      setSubtasks(subData || []);

      // 3. Ambil PIC Pelaksana
      const { data: picData } = await supabase
        .from('task_pics')
        .select('profile:profiles(id, full_name, nip, role)')
        .eq('task_id', taskData.id);

      if (picData) {
        setPics(picData.map((p: any) => p.profile));
      }
    } catch (err: any) {
      console.error('Error memuat data publik:', err);
      setErrorMsg('Terjadi kesalahan saat memuat lembar pemantauan publik.');
    } finally {
      setLoading(false);
    }
  };

  const parseSafeDate = (dateStr: string) => {
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

  const effectiveProgress = task?.status === 'SELESAI' ? 100 : (task?.progress_pct || 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F6F0] dark:bg-[#090D16] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#DF3B68]" />
        <p className="text-xs font-semibold text-stone-500 dark:text-slate-400 mt-3">
          Memverifikasi akses lembar pemantauan...
        </p>
      </div>
    );
  }

  // Layar Jika Tautan Ditutup / Tidak Valid
  if (errorMsg || !task) {
    return (
      <div className="min-h-screen bg-[#F9F6F0] dark:bg-[#090D16] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 p-8 rounded-3xl border border-stone-200 dark:border-slate-800 shadow-xl text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-[#DF3B68] flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-900/50">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-stone-900 dark:text-slate-100">Akses Tautan Dibatasi</h2>
          <p className="text-xs text-stone-500 dark:text-slate-400 leading-relaxed">
            {errorMsg || 'Tugas ini tidak dibagikan ke publik atau otorisasi tautan telah dicabut oleh unit pelaksana.'}
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-stone-900 dark:bg-slate-100 hover:bg-stone-800 text-white dark:text-slate-900 text-xs font-bold transition-colors"
            >
              Masuk dengan Akun Pegawai
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F6F0] dark:bg-[#090D16] text-stone-900 dark:text-slate-100 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* PUBLIC TOP NAV BAR */}
        <header className="flex items-center justify-between bg-white dark:bg-slate-900 px-5 py-3.5 rounded-2xl border border-stone-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#DF3B68] text-white font-bold flex items-center justify-center text-xs">
              GT
            </div>
            <div>
              <span className="text-xs font-bold text-stone-900 dark:text-slate-100 block">Gov-Task-Monitor</span>
              <span className="text-[10px] text-stone-400 dark:text-slate-500 font-mono">Portal Monitoring Kinerja Vertikal</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5" />
              Tervalidasi Publik (Read-Only)
            </span>
          </div>
        </header>

        {/* KARTU UTAMA TUGAS */}
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-stone-200 dark:border-slate-800 shadow-sm space-y-6">
          
          {/* Baris Badge Status */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 dark:border-slate-800 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 border border-stone-200 dark:border-slate-700">
                {task.category || 'TUSI'}
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 border border-stone-200 dark:border-slate-700">
                Prioritas: {task.priority}
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-stone-50 dark:bg-slate-800/60 text-stone-500 dark:text-slate-400 border border-stone-200 dark:border-slate-700 font-mono">
                Periode: {task.period_type} {task.period_year}
              </span>
            </div>

            <div>
              <span className={`text-xs font-extrabold uppercase px-3 py-1 rounded-full ${
                task.status === 'SELESAI'
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : task.status === 'TERKENDALA'
                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
              }`}>
                {task.status === 'ON_PROGRESS' ? 'DALAM PROSES' : task.status}
              </span>
            </div>
          </div>

          {/* Judul & Meta */}
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 dark:text-slate-100 leading-snug">
              {task.title}
            </h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-stone-600 dark:text-slate-400 pt-1">
              {task.unit && (
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Building2 className="w-4 h-4 text-stone-400" />
                  {task.unit.name}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 font-mono">
                <Calendar className="w-4 h-4 text-[#DF3B68]" />
                Tenggat Waktu: {parseSafeDate(task.deadline)}
              </span>
            </div>
          </div>

          {/* Deskripsi & Petunjuk Teknis */}
          {task.description && (
            <div className="p-4 rounded-2xl bg-stone-50/80 dark:bg-slate-800/60 border border-stone-200/80 dark:border-slate-700/80 text-xs sm:text-sm text-stone-600 dark:text-slate-300 leading-relaxed">
              <strong className="block text-stone-900 dark:text-slate-100 mb-1">Deskripsi Pekerjaan:</strong>
              {task.description}
            </div>
          )}

          {/* Dasar Hukum */}
          {task.legal_basis && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-stone-800 dark:text-slate-200">Dasar Hukum:</span>
              <span className="bg-stone-100 dark:bg-slate-800 px-2.5 py-0.5 rounded font-mono text-stone-700 dark:text-slate-300 border border-stone-200 dark:border-slate-700">
                {task.legal_basis}
              </span>
              {task.legal_basis_link && (
                <a
                  href={task.legal_basis_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" /> Buka Regulasi
                </a>
              )}
            </div>
          )}

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
          <div className="space-y-2 pt-2">
            <div className="flex justify-between items-center text-xs font-bold text-stone-700 dark:text-slate-300">
              <span>Capaian Progres Pelaksanaan</span>
              <span className="font-mono text-sm">{effectiveProgress}%</span>
            </div>
            <div className="w-full h-3 bg-stone-100 dark:bg-slate-800 rounded-full overflow-hidden border border-stone-200/60 dark:border-slate-700">
              <div
                className={`h-full transition-all duration-300 rounded-full ${getProgressBarColor(effectiveProgress)}`}
                style={{ width: `${effectiveProgress}%` }}
              />
            </div>
          </div>

          {/* Checklist Tahapan Sub-Pekerjaan (Read-Only) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-2">
              <span className="text-xs font-bold text-stone-800 dark:text-slate-200 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#DF3B68]" />
                Tahapan Checklist ({subtasks.filter(s => s.is_completed).length} dari {subtasks.length} Selesai)
              </span>
              <span className="text-[10px] text-stone-400 dark:text-slate-500 font-mono">
                Status Verifikasi
              </span>
            </div>

            {subtasks.length === 0 ? (
              <p className="text-xs text-stone-400 dark:text-slate-500 italic py-2">
                Tidak ada rincian tahapan sub-pekerjaan yang direkam.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {subtasks.map((st, idx) => (
                  <div
                    key={st.id || idx}
                    className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2.5 select-none ${
                      st.is_completed
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-300'
                        : 'bg-stone-50/60 dark:bg-slate-800/60 border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                      {st.is_completed ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-stone-400 dark:text-slate-500 shrink-0" />
                      )}
                      <span className={`truncate font-medium ${st.is_completed ? 'line-through text-stone-400 dark:text-slate-500' : ''}`}>
                        {idx + 1}. {st.title}
                      </span>
                    </div>

                    {st.deadline && (
                      <span className="shrink-0 text-[10px] font-mono px-2 py-0.5 rounded bg-white dark:bg-slate-900 text-stone-600 dark:text-slate-300 border border-stone-200 dark:border-slate-700">
                        {st.deadline}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Link Bukti Penyelesaian (Jika Tersedia) */}
          {task.evidence_link && (
            <div className="pt-2">
              <a
                href={task.evidence_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-[#DF3B68] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span>Buka Dokumen Bukti Penyelesaian Cloud</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* PIC Pelaksana */}
          {pics.length > 0 && (
            <div className="pt-2 border-t border-stone-100 dark:border-slate-800">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-slate-500 block mb-1.5">
                Pelaksana / Tim Kerja:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {pics.map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1.5 text-xs bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 px-3 py-1 rounded-full text-stone-700 dark:text-slate-300"
                  >
                    <User className="w-3 h-3 text-stone-400" />
                    {p.full_name} ({p.role})
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer Publik */}
        <footer className="text-center text-xs text-stone-400 dark:text-slate-500 space-y-1">
          <p>© {new Date().getFullYear()} Gov-Task-Monitor • Sistem Monitoring Kinerja Instansi Vertikal</p>
          <p className="text-[10px]">Data disinkronkan secara aman dan langsung dari sistem pemantauan.</p>
        </footer>

      </div>
    </div>
  );
}

export default function PublicTaskPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F9F6F0] dark:bg-[#090D16] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#DF3B68]" />
      </div>
    }>
      <PublicTaskContent />
    </Suspense>
  );
}
