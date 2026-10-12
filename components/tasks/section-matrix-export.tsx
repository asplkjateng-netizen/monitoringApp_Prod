'use client';

import { forwardRef } from 'react';
import { 
  Calendar, 
  Building2, 
  CheckSquare, 
  Square, 
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle
} from 'lucide-react';

export interface MatrixSubtask {
  id: string;
  title: string;
  is_completed: boolean;
  deadline?: string | null;
  subtask_pics?: Array<{
    profiles?: {
      full_name: string;
    } | null;
  }>;
}

export interface MatrixTask {
  id: string;
  title: string;
  short_description?: string | null;
  category?: string;
  priority?: string;
  deadline: string;
  status: 'BELUM_DIKERJAKAN' | 'ON_PROGRESS' | 'TERKENDALA' | 'SELESAI';
  progress_pct: number;
  subtasks?: MatrixSubtask[];
}

interface SectionMatrixExportProps {
  unitName: string;
  periodLabel?: string;
  tasks: MatrixTask[];
}

export const SectionMatrixExport = forwardRef<HTMLDivElement, SectionMatrixExportProps>(
  ({ unitName, periodLabel, tasks }, ref) => {
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

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'SELESAI').length;
    const inProgressTasks = tasks.filter((t) => t.status === 'ON_PROGRESS').length;
    const criticalTasks = tasks.filter((t) => t.status === 'TERKENDALA').length;

    const totalProgressSum = tasks.reduce((sum, t) => sum + (t.status === 'SELESAI' ? 100 : (t.progress_pct || 0)), 0);
    const aggregateProgress = totalTasks > 0 ? Math.round(totalProgressSum / totalTasks) : 0;

    const totalAllSubtasks = tasks.reduce((acc, t) => acc + (t.subtasks?.length || 0), 0);
    const completedAllSubtasks = tasks.reduce((acc, t) => acc + (t.subtasks?.filter(s => s.is_completed).length || 0), 0);

    return (
      <div
        ref={ref}
        style={{ width: '1020px', minHeight: 'auto', backgroundColor: '#FFFFFF' }}
        className="text-stone-900 p-8 rounded-2xl border-2 border-stone-300 font-sans space-y-6 shadow-none"
      >
        {/* 1. KOP RESMI DINAS KEMENTERIAN KEUANGAN */}
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
                {unitName || 'DIREKTORAT JENDERAL PERBENDAHARAAN'}
              </h2>
            </div>
          </div>
          <p className="text-[10px] text-stone-600 font-mono tracking-wider uppercase mt-1">
            MATRIKS KOMPREHENSIF MONITORING CAPAIAN TUSI & CHECKLIST SUB-PEKERJAAN
          </p>
          <div className="absolute -bottom-[5px] left-0 right-0 h-[1px] bg-stone-900" />
        </div>

        {/* 2. REKAPITULASI CAPAIAN AGREGAT SEKSI */}
        <div className="grid grid-cols-4 gap-3 bg-stone-50 p-4 rounded-2xl border border-stone-200 text-xs">
          <div>
            <span className="text-[10px] text-stone-500 block uppercase font-mono">Beban Pekerjaan:</span>
            <span className="text-base font-extrabold text-stone-900">{totalTasks} Tugas Aktif</span>
            <span className="text-[10px] text-stone-500 block">{totalAllSubtasks} Total Tahapan</span>
          </div>

          <div>
            <span className="text-[10px] text-stone-500 block uppercase font-mono">Status Capaian:</span>
            <span className="text-base font-extrabold text-emerald-700">{completedTasks} Tuntas</span>
            <span className="text-[10px] text-amber-600 block">{inProgressTasks} Dalam Proses • {criticalTasks} Terkendala</span>
          </div>

          <div>
            <span className="text-[10px] text-stone-500 block uppercase font-mono">Tahapan Selesai:</span>
            <span className="text-base font-extrabold text-blue-700">{completedAllSubtasks} / {totalAllSubtasks}</span>
            <span className="text-[10px] text-stone-500 block">Checklist Terverifikasi</span>
          </div>

          <div>
            <span className="text-[10px] text-stone-500 block uppercase font-mono">Indeks Kinerja Seksi:</span>
            <span className="text-base font-black text-[#DF3B68]">{aggregateProgress}%</span>
            <div className="w-full bg-stone-200 h-1.5 rounded-full mt-1 overflow-hidden">
              <div 
                className="bg-[#DF3B68] h-full rounded-full" 
                style={{ width: `${aggregateProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* 3. TABEL MATRIKS UTAMA SELURUH PEKERJAAN & CHECKLIST */}
        <div className="space-y-2">
          <table className="w-full text-left text-xs border border-stone-300 rounded-lg overflow-hidden border-collapse">
            <thead>
              <tr className="bg-stone-100 text-stone-800 font-bold border-b border-stone-300 text-[11px]">
                <th className="py-2.5 px-2 text-center w-10 border-r border-stone-300">No</th>
                <th className="py-2.5 px-3 border-r border-stone-300 w-52">Uraian Pekerjaan / Tusi</th>
                <th className="py-2.5 px-3 border-r border-stone-300 w-28 text-center">Tenggat Waktu</th>
                <th className="py-2.5 px-3 border-r border-stone-300 w-28 text-center">Status & Progres</th>
                <th className="py-2.5 px-3">Rincian Tahapan Checklist & PIC Pelaksana</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-stone-400 italic bg-stone-50">
                    Tidak ada pekerjaan aktif yang terdaftar pada periode ini.
                  </td>
                </tr>
              ) : (
                tasks.map((task, idx) => {
                  const effectivePct = task.status === 'SELESAI' ? 100 : (task.progress_pct || 0);
                  const subCount = task.subtasks?.length || 0;
                  const doneCount = task.subtasks?.filter(s => s.is_completed).length || 0;

                  return (
                    <tr 
                      key={task.id || idx}
                      className={idx % 2 === 0 ? 'bg-white' : 'bg-stone-50/40'}
                    >
                      <td className="py-3 px-2 text-center font-mono text-stone-600 align-top border-r border-stone-200">
                        {idx + 1}
                      </td>

                      <td className="py-3 px-3 align-top border-r border-stone-200 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-stone-100 text-stone-700 border border-stone-300">
                            {task.category || 'TUSI'}
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-50 text-[#DF3B68]">
                            {task.priority || 'SEDANG'}
                          </span>
                        </div>
                        <p className="font-bold text-stone-900 leading-snug text-xs">
                          {task.title}
                        </p>
                        {task.short_description && (
                          <p className="text-[10px] text-stone-500 italic line-clamp-2">
                            {task.short_description}
                          </p>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center align-top border-r border-stone-200 font-mono text-[10px] text-stone-700">
                        {parseSafeDate(task.deadline)}
                      </td>

                      <td className="py-3 px-3 text-center align-top border-r border-stone-200 space-y-1.5">
                        <span className={`inline-block text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${
                          task.status === 'SELESAI'
                            ? 'bg-emerald-100 text-emerald-800'
                            : task.status === 'TERKENDALA'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {task.status === 'ON_PROGRESS' ? 'PROSES' : task.status}
                        </span>
                        <div>
                          <span className="font-mono font-bold text-[11px] block">{effectivePct}%</span>
                          <div className="w-16 mx-auto bg-stone-200 h-1.5 rounded-full overflow-hidden mt-0.5">
                            <div 
                              className={`h-full ${effectivePct >= 80 ? 'bg-emerald-500' : effectivePct >= 31 ? 'bg-amber-500' : 'bg-rose-500'}`}
                              style={{ width: `${effectivePct}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-[9px] text-stone-500 block">
                          {doneCount}/{subCount} Checklist
                        </span>
                      </td>

                      <td className="py-3 px-3 align-top">
                        {!task.subtasks || task.subtasks.length === 0 ? (
                          <span className="text-[10px] text-stone-400 italic">Tidak ada rincian tahapan.</span>
                        ) : (
                          <div className="space-y-1">
                            {task.subtasks.map((st, sIdx) => {
                              const picName = st.subtask_pics && st.subtask_pics.length > 0
                                ? st.subtask_pics[0]?.profiles?.full_name
                                : null;

                              return (
                                <div 
                                  key={st.id || sIdx}
                                  className="flex items-center justify-between gap-2 text-[10px] border-b border-stone-100 pb-0.5 last:border-none"
                                >
                                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                    {st.is_completed ? (
                                      <CheckSquare className="w-3 h-3 text-emerald-600 shrink-0" />
                                    ) : (
                                      <Square className="w-3 h-3 text-stone-400 shrink-0" />
                                    )}
                                    <span className={`truncate ${st.is_completed ? 'line-through text-stone-400' : 'text-stone-800 font-medium'}`}>
                                      {sIdx + 1}. {st.title}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    {picName && (
                                      <span className="text-stone-600 font-semibold bg-stone-100 px-1 rounded text-[9px]">
                                        {picName}
                                      </span>
                                    )}
                                    {st.deadline && (
                                      <span className="font-mono text-stone-400 text-[9px]">
                                        {parseSafeDate(st.deadline)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4. FOOTER RESMI & STEMPEL SISTEM */}
        <div className="pt-3 border-t border-stone-300 flex items-center justify-between text-[10px] text-stone-500 font-mono">
          <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Lembar Matriks Kinerja Diekspor Resmi dari Gov-Task-Monitor</span>
          </div>
          <span>Tanggal Cetak: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
      </div>
    );
  }
);

SectionMatrixExport.displayName = 'SectionMatrixExport';
