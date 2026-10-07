'use client';

import { forwardRef } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Calendar, 
  Building2, 
  User, 
  Layers, 
  BookOpen,
  CheckSquare,
  Square
} from 'lucide-react';

export interface TaskExportData {
  id: string;
  title: string;
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
  }>;
  share_url?: string;
}

interface TaskCardExportProps {
  task: TaskExportData;
}

export const TaskCardExport = forwardRef<HTMLDivElement, TaskCardExportProps>(
  ({ task }, ref) => {
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

    const getStatusText = (status: string) => {
      switch (status) {
        case 'SELESAI': return 'SELESAI';
        case 'ON_PROGRESS': return 'DALAM PROSES';
        case 'TERKENDALA': return 'TERKENDALA';
        default: return 'BELUM DIKERJAKAN';
      }
    };

    const getProgressBarColor = (pct: number) => {
      if (pct >= 80) return 'bg-emerald-500';
      if (pct >= 31) return 'bg-amber-400';
      return 'bg-rose-500';
    };

    const totalSub = task.subtasks?.length || 0;
    const completedSub = task.subtasks?.filter((s) => s.is_completed).length || 0;
    const effectivePct = task.status === 'SELESAI' ? 100 : (task.progress_pct || 0);

    return (
      <div
        ref={ref}
        style={{ width: '760px', minHeight: 'auto' }}
        className="bg-white text-stone-900 p-8 rounded-3xl border border-stone-200 shadow-sm font-sans space-y-6"
      >
        {/* KOP RESMI DINAS */}
        <div className="border-b-2 border-stone-900 pb-4 text-center relative">
          <div className="flex items-center justify-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-[#DF3B68] text-white font-bold flex items-center justify-center text-sm shadow-xs">
              GT
            </div>
            <div>
              <h4 className="text-[11px] font-bold tracking-widest uppercase text-stone-500">
                KEMENTERIAN KEUANGAN REPUBLIK INDONESIA
              </h4>
              <h2 className="text-base font-extrabold uppercase tracking-tight text-stone-900">
                {task.unit?.name || 'DIREKTORAT JENDERAL PERBENDAHARAAN'}
              </h2>
            </div>
          </div>
          <p className="text-[10px] text-stone-400 font-mono tracking-wider mt-0.5">
            LEMBAR KONTROL & PEMANTAUAN KINERJA PEKERJAAN
          </p>
          <div className="absolute -bottom-[5px] left-0 right-0 h-[1px] bg-stone-900" />
        </div>

        {/* HEADER DOKUMEN TUGAS */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200">
                {task.category || 'TUSI'}
              </span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-rose-50 text-[#DF3B68] border border-rose-200">
                Prioritas: {task.priority || 'SEDANG'}
              </span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-stone-100 text-stone-600 border border-stone-200 font-mono">
                {task.period_type || 'BULANAN'} {task.period_year ? `TAHUN ${task.period_year}` : ''}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-stone-400 block uppercase font-mono">Status Capaian</span>
              <span className={`text-xs font-black uppercase px-2.5 py-0.5 rounded-md ${
                task.status === 'SELESAI' 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : task.status === 'TERKENDALA' 
                  ? 'bg-rose-100 text-rose-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {getStatusText(task.status)}
              </span>
            </div>
          </div>

          <h1 className="text-xl font-extrabold text-stone-900 leading-snug">
            {task.title}
          </h1>

          <div className="grid grid-cols-2 gap-3 text-xs text-stone-600 bg-stone-50/80 p-3.5 rounded-2xl border border-stone-200/80">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#DF3B68]" />
              <span><strong>Batas Tenggat:</strong> {parseSafeDate(task.deadline)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-stone-500" />
              <span><strong>Unit Kerja:</strong> {task.unit?.name || '-'}</span>
            </div>
          </div>
        </div>

        {/* DASAR HUKUM JIKA ADA */}
        {task.legal_basis && (
          <div className="text-xs bg-amber-50/60 p-3 rounded-xl border border-amber-200 text-amber-900 flex items-start gap-2">
            <BookOpen className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-amber-950">Dasar Hukum & Regulasi Acuan:</strong>
              <p className="font-mono text-[11px] mt-0.5 text-stone-700">{task.legal_basis}</p>
            </div>
          </div>
        )}

        {/* CATATAN KENDALA JIKA TERKENDALA */}
        {task.kendala_note && task.status === 'TERKENDALA' && (
          <div className="text-xs bg-rose-50 p-3 rounded-xl border border-rose-200 text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-rose-900">Catatan Hambatan / Kendala:</strong>
              <p className="mt-0.5 text-stone-700">{task.kendala_note}</p>
            </div>
          </div>
        )}

        {/* PROGRESS BAR & INDIKATOR */}
        <div className="space-y-2 pt-1">
          <div className="flex justify-between items-center text-xs font-bold text-stone-700">
            <span>Kalkulasi Progres Pelaksanaan</span>
            <span className="font-mono text-sm">{effectivePct}%</span>
          </div>
          <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden border border-stone-200">
            <div
              className={`h-full transition-all duration-300 rounded-full ${getProgressBarColor(effectivePct)}`}
              style={{ width: `${effectivePct}%` }}
            />
          </div>
        </div>

        {/* REKAPITULASI CHECKLIST SUBTASKS */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs font-bold text-stone-800 border-b border-stone-200 pb-1.5">
            <span className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#DF3B68]" />
              Tahapan Pekerjaan ({completedSub} dari {totalSub} Selesai)
            </span>
            <span className="font-mono text-stone-500 text-[11px]">
              Verifikasi Checklist
            </span>
          </div>

          {!task.subtasks || task.subtasks.length === 0 ? (
            <p className="text-xs text-stone-400 italic py-2 text-center bg-stone-50 rounded-xl">
              Tidak ada rincian tahapan sub-pekerjaan terdaftar.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 pt-1">
              {task.subtasks.map((st, idx) => (
                <div
                  key={st.id || idx}
                  className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                    st.is_completed
                      ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900'
                      : 'bg-white border-stone-200 text-stone-700'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                    {st.is_completed ? (
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    )}
                    <span className={`truncate ${st.is_completed ? 'line-through text-stone-400 font-normal' : 'font-medium'}`}>
                      {idx + 1}. {st.title}
                    </span>
                  </div>
                  {st.deadline && (
                    <span className="shrink-0 text-[9px] font-mono px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200">
                      {st.deadline}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PIC & PENANGGUNG JAWAB */}
        {task.pics && task.pics.length > 0 && (
          <div className="pt-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
              PIC Pelaksana Terdaftar:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {task.pics.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1.5 text-xs bg-stone-50 border border-stone-200 px-3 py-1 rounded-full text-stone-700 font-medium"
                >
                  <User className="w-3 h-3 text-stone-400" />
                  {p.full_name} {p.nip ? `(${p.nip})` : ''}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* FOOTER INFORMASI SISTEM & TANGGAL CETAK */}
        <div className="pt-4 border-t border-stone-200 flex items-center justify-between text-[10px] text-stone-400 font-mono">
          <span>Dicetak secara otomatis melalui Gov-Task-Monitor Portal</span>
          <span>Waktu Capture: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
      </div>
    );
  }
);

TaskCardExport.displayName = 'TaskCardExport';
