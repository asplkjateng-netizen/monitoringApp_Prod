import React from 'react';

export interface StaffWorkload {
  name: string;
  completed?: number;
  completedTasks?: number;
  inProgress?: number;
  inProgressTasks?: number;
  total?: number;
  totalTasks?: number;
  percentage?: number;
}

export function WorkloadCard({ data }: { data: StaffWorkload[] }) {
  return (
    <div className="bg-white dark:bg-[#1E1E1E] border border-stone-200/60 dark:border-white/[0.08] rounded-3xl p-6 shadow-soft dark:shadow-dark-card space-y-4 transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-stone-900 dark:text-white/90">Distribusi Beban Kerja Pegawai</h4>
          <p className="text-[11px] text-stone-400 dark:text-white/40">Realisasi progres riil tugas & sub-tugas staf</p>
        </div>
        <span className="text-[11px] font-semibold text-primary dark:text-rose-400 bg-primary/10 dark:bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-primary/20 dark:border-rose-500/20">
          Progres Riil
        </span>
      </div>

      <div className="space-y-3.5 pt-1">
        {(!data || data.length === 0) ? (
          <p className="text-xs text-stone-400 dark:text-white/40 text-center py-6">Belum ada data tugas pegawai</p>
        ) : (
          data.map((staff, idx) => {
            const total = staff.total ?? staff.totalTasks ?? 0;
            const completed = staff.completed ?? staff.completedTasks ?? 0;
            
            // Prioritaskan persentase riil (yang sudah memperhitungkan sub-pekerjaan berjalan)
            const percentage = typeof staff.percentage === 'number'
              ? staff.percentage
              : (total > 0 ? Math.round((completed / total) * 100) : 0);

            return (
              <div key={staff.name} className="flex items-center justify-between gap-3 text-xs">
                <span className="w-4 text-stone-400 dark:text-white/40 font-mono text-[11px]">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-semibold text-stone-800 dark:text-white/90 truncate">{staff.name}</span>
                    <span className="text-[11px] font-bold text-stone-900 dark:text-white/90">{percentage}%</span>
                  </div>
                  {/* Progress Bar Dinamis Mengikuti Sub-pekerjaan */}
                  <div className="w-full bg-stone-100 dark:bg-[#2C2C2C] rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        percentage >= 80 ? 'bg-emerald-500 dark:bg-emerald-400' :
                        percentage >= 40 ? 'bg-primary dark:bg-rose-500' :
                        percentage > 0 ? 'bg-amber-500 dark:bg-amber-400' :
                        'bg-stone-300 dark:bg-stone-700'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
                <div className="w-20 text-right flex-shrink-0">
                  <span className="font-medium text-stone-500 dark:text-white/60 text-[11px]">
                    {completed}/{total} Tuntas
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
