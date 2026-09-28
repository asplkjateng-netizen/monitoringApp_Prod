import React from 'react';

interface StaffWorkload {
  name: string;
  completedTasks: number;
  totalTasks: number;
}

export function WorkloadCard({ data }: { data: StaffWorkload[] }) {
  return (
    <div className="bg-white border border-stone-200/60 rounded-3xl p-6 shadow-soft space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-stone-900">Distribusi Beban Kerja Pegawai</h4>
        <span className="text-[11px] text-stone-400 font-medium">Realisasi Tugas</span>
      </div>

      <div className="space-y-3 pt-2">
        {data.length === 0 ? (
          <p className="text-xs text-stone-400 text-center py-6">Belum ada data tugas pegawai</p>
        ) : (
          data.map((staff, idx) => {
            const percentage = staff.totalTasks > 0
              ? Math.round((staff.completedTasks / staff.totalTasks) * 100)
              : 0;
            return (
              <div key={staff.name} className="flex items-center justify-between gap-4 text-xs">
                <span className="w-5 text-stone-400 font-mono">{idx + 1}</span>
                <span className="flex-1 font-semibold text-stone-800 truncate">{staff.name}</span>
                <div className="w-32 bg-stone-100 rounded-full h-2 overflow-hidden flex-shrink-0">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="w-16 text-right font-medium text-stone-600 text-[11px]">
                  {staff.completedTasks}/{staff.totalTasks} Selesai
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
