'use client';

import { forwardRef } from 'react';
import { 
  CheckCircle2, 
  Calendar, 
  Building2, 
  User, 
  BookOpen, 
  CheckSquare, 
  Square, 
  ExternalLink,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

export interface TaskExportData {
  id: string;
  title: string;
  short_description?: string | null;
  category?: 'TUSI' | 'TAMBAHAN' | 'IMPROVISASI';
  priority?: string;
  status: 'BELUM_DIKERJAKAN' | 'ON_PROGRESS' | 'TERKENDALA' | 'SELESAI';
  progress_pct: number;
  deadline: string;
  period_type?: string;
  period_month?: number;
  period_year?: number;
  legal_basis?: string;
  kendala_note?: string;
  evidence_link?: string;
  unit?: {
    name: string;
    level?: string;
  };
  pics?: Array<{
    id: string;
    full_name: string;
    nip?: string;
    role?: string;
  }>;
  subtasks?: Array<{
    id: string;
    title: string;
    is_completed: boolean;
    deadline?: string | null;
    custom_evidence_link?: string | null;
    subtask_pics?: Array<{
      profiles?: {
        full_name: string;
      } | null;
    }>;
  }>;
  share_url?: string;
}

interface TaskCardExportProps {
  task: TaskExportData;
}

export const TaskCardExport = forwardRef<HTMLDivElement, TaskCardExportProps>(
  ({ task }, ref) => {
    const parseSafeDate = (dateStr?: string | null) => {
      if (!dateStr) return '-';
      const [y, m, d] = dateStr.split('-').map(Number);
      const dt = new Date(y, (m || 1) - 1, d || 1);
      return dt.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    };

    const getStatusText = (status: string) => {
      switch (status) {
        case 'SELESAI': return 'TUNTAS SELESAI';
        case 'ON_PROGRESS': return 'DALAM PENGERJAAN';
        case 'TERKENDALA': return 'TERKENDALA';
        default: return 'BELUM DIKERJAKAN';
      }
    };

    const getProgressBarColor = (pct: number) => {
      if (pct >= 80) return '#10B981'; // emerald-500
      if (pct >= 31) return '#F59E0B'; // amber-500
      return '#EF4444'; // rose-500
    };

    const totalSub = task.subtasks?.length || 0;
    const completedSub = task.subtasks?.filter((s) => s.is_completed).length || 0;
    const effectivePct = task.status === 'SELESAI' ? 100 : (task.progress_pct || 0);

    return (
      <div
        ref={ref}
        style={{ width: '840px', minHeight: 'auto', backgroundColor: '#FFFFFF' }}
        className="text-stone-900 p-8 rounded-2xl border-2 border-stone-300 font-sans space-y-5 shadow-none"
      >
        {/* 1. KOP DINAS RESMI KEMENTERIAN */}
        <div className="border-b-2 border-stone-900 pb-3 text-center relative">
          <div className="flex items-center justify-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[#DF3B68] text-white font-bold flex items-center justify-center text-sm shadow-xs">
              GT
            </div>
            <div className="text-left">
              <h4 className="text-[10px] font-bold tracking-widest uppercase text-stone-500">
                KEMENTERIAN KEUANGAN REPUBLIK INDONESIA
              </h4>
              <h2 className="text-sm font-extrabold uppercase tracking-tight text-stone-900">
                {task.unit?.name || 'DIREKTORAT JENDERAL PERBENDAHARAAN'}
              </h2>
            </div>
          </div>
          <p className="text-[10px] text-stone-600 font-mono tracking-wider uppercase mt-1">
            LEMBAR MONITORING & TABEL CHECKLIST PENYELESAIAN TUGAS
          </p>
          <div className="absolute -bottom-[5px] left-0 right-0 h-[1px] bg-stone-900" />
        </div>

        {/* 2. IDENTITAS & META TUGAS */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-stone-100 text-stone-800 border border-stone-300">
                {task.category || 'TUSI POKOK'}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-[#DF3B68] border border-rose-200">
                PRIORITAS: {task.priority || 'SEDANG'}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-300 font-mono">
                {task.period_type || 'BULANAN'} {task.period_year ? `TAHUN ${task.period_year}` : ''}
              </span>
            </div>

            <div className="text-right flex items-center gap-2">
              <span className="text-[10px] text-stone-500 uppercase font-mono">Status:</span>
              <span 
                className={`text-[11px] font-black uppercase px-2.5 py-0.5 rounded ${
                  task.status === 'SELESAI' 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                    : task.status === 'TERKENDALA' 
                    ? 'bg-rose-100 text-rose-800 border border-rose-300' 
                    : 'bg-blue-100 text-blue-800 border border-blue-300'
                }`}
              >
                {getStatusText(task.status)}
              </span>
            </div>
          </div>

          <h1 className="text-lg font-extrabold text-stone-900 leading-snug">
            {task.title}
          </h1>

          {task.short_description && (
            <p className="text-xs text-stone-600 italic leading-relaxed">
              &quot;{task.short_description}&quot;
            </p>
          )}

          {/* Metadata Bar */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-stone-50 p-2.5 rounded-xl border border-stone-200">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-[#DF3B68]" />
              <span><strong>Batas Tenggat:</strong> {parseSafeDate(task.deadline)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-stone-500" />
              <span><strong>Unit Kerja:</strong> {task.unit?.name || '-'}</span>
            </div>
          </div>
        </div>

        {/* DASAR HUKUM */}
        {task.legal_basis && (
          <div className="text-xs bg-amber-50/70 p-2.5 rounded-xl border border-amber-200 text-amber-950 flex items-start gap-2">
            <BookOpen className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="block text-[11px]">Dasar Hukum / Regulasi Acuan:</strong>
              <p className="font-mono text-[10px] mt-0.5 text-stone-800">{task.legal_basis}</p>
            </div>
          </div>
        )}

        {/* CATATAN HAMBATAN/KENDALA */}
        {task.kendala_note && task.status === 'TERKENDALA' && (
          <div className="text-xs bg-rose-50 p-2.5 rounded-xl border border-rose-200 text-rose-900 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-[11px]">Catatan Kendala & Hambatan:</strong>
              <p className="text-[11px] mt-0.5 text-rose-800">{task.kendala_note}</p>
            </div>
          </div>
        )}

        {/* 3. PROGRES BAR EKSEKUTIF */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between items-center text-xs font-bold text-stone-700">
            <span>Kalkulasi Progres Riil Penyelesaian</span>
            <span className="font-mono text-sm">{effectivePct}% ({completedSub}/{totalSub} Tahapan Selesai)</span>
          </div>
          <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden border border-stone-200">
            <div
              style={{ width: `${effectivePct}%`, backgroundColor: getProgressBarColor(effectivePct) }}
              className="h-full rounded-full transition-all duration-300"
            />
          </div>
        </div>

        {/* 4. TABEL CHECKLIST PEKERJAAN BERSTRUKTUR RESMI */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs font-bold text-stone-900 border-b border-stone-300 pb-1.5">
            <span>TABEL TAHAPAN SUB-PEKERJAAN & PIC PELAKSANA</span>
            <span className="text-[10px] font-mono text-stone-500">
              Total: {totalSub} Item Checklist
            </span>
          </div>

          <table className="w-full text-left text-xs border border-stone-300 rounded-lg overflow-hidden border-collapse">
            <thead>
              <tr className="bg-stone-100 text-stone-800 font-bold border-b border-stone-300 text-[11px]">
                <th className="py-2 px-2 text-center w-10 border-r border-stone-300">No</th>
                <th className="py-2 px-3 border-r border-stone-300">Uraian Tahapan Pekerjaan</th>
                <th className="py-2 px-3 w-40 border-r border-stone-300">PIC Pelaksana</th>
                <th className="py-2 px-2 text-center w-28 border-r border-stone-300">Batas Waktu</th>
                <th className="py-2 px-2 text-center w-28">Status Verifikasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {!task.subtasks || task.subtasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-stone-400 italic bg-stone-50">
                    Tidak ada rincian tahapan sub-pekerjaan yang terdaftar.
                  </td>
                </tr>
              ) : (
                task.subtasks.map((st, idx) => {
                  const picName = st.subtask_pics && st.subtask_pics.length > 0
                    ? st.subtask_pics[0]?.profiles?.full_name
                    : null;

                  return (
                    <tr 
                      key={st.id || idx} 
                      className={st.is_completed ? 'bg-emerald-50/40' : 'bg-white'}
                    >
                      <td className="py-2 px-2 text-center font-mono text-stone-600 border-r border-stone-200">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 font-medium text-stone-800 border-r border-stone-200">
                        <span className={st.is_completed ? 'line-through text-stone-500' : ''}>
                          {st.title}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-stone-700 border-r border-stone-200 text-[11px]">
                        {picName ? (
                          <span className="font-semibold text-stone-800">{picName}</span>
                        ) : (
                          <span className="text-stone-400 italic">Sesuai Tim Kerja</span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center font-mono text-[10px] text-stone-600 border-r border-stone-200">
                        {parseSafeDate(st.deadline)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {st.is_completed ? (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-700 text-[10px] bg-emerald-100/80 px-2 py-0.5 rounded">
                            <CheckSquare className="w-3 h-3 text-emerald-600" /> Selesai
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-medium text-stone-500 text-[10px] bg-stone-100 px-2 py-0.5 rounded">
                            <Square className="w-3 h-3 text-stone-400" /> Terjadwal
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. TAUTAN BUKTI DUKUNG PENYELESAIAN (JIKA ADA) */}
        {task.evidence_link && (
          <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between text-xs">
            <span className="font-bold text-stone-700">Tautan Dokumen Bukti Penyelesaian Cloud:</span>
            <span className="font-mono text-blue-700 text-[11px] truncate max-w-[400px]">
              {task.evidence_link}
            </span>
          </div>
        )}

        {/* 6. TIM PELAKSANA (PIC UTAMA) */}
        {task.pics && task.pics.length > 0 && (
          <div className="pt-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
              PIC Tim Kerja Utama:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {task.pics.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1 text-[11px] bg-stone-100 border border-stone-200 px-2.5 py-0.5 rounded-full text-stone-800 font-medium"
                >
                  <User className="w-3 h-3 text-stone-500" />
                  {p.full_name} {p.nip ? `(${p.nip})` : ''}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 7. FOOTER PENGESAHAN ELEKTRONIK & STEMPEL SISTEM */}
        <div className="pt-3 border-t border-stone-300 flex items-center justify-between text-[10px] text-stone-500 font-mono">
          <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Dokumen ini disinkronkan & diekspor resmi dari Gov-Task-Monitor</span>
          </div>
          <span>Tanggal Generate: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
      </div>
    );
  }
);

TaskCardExport.displayName = 'TaskCardExport';
