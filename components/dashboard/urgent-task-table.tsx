import React from 'react';
import Link from 'next/link';
import { ExternalLink, AlertCircle } from 'lucide-react';
import type { Task } from '@/types/database.types';

export function UrgentTaskTable({ tasks }: { tasks: Task[] }) {
  return (
    <div className="bg-white border border-stone-200/60 rounded-3xl p-6 shadow-soft space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-bold text-stone-900">Tugas Kritis & Mendekati Tenggat (H-3)</h4>
        </div>
        <Link href="/tasks" className="text-xs font-semibold text-primary hover:underline">
          Lihat Semua Tugas →
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-stone-100 text-stone-400 uppercase text-[10px] tracking-wider">
              <th className="pb-3 font-semibold">Nama Tugas / Tusi</th>
              <th className="pb-3 font-semibold">Tenggat Waktu</th>
              <th className="pb-3 font-semibold">Prioritas</th>
              <th className="pb-3 font-semibold">Status Capaian</th>
              <th className="pb-3 font-semibold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-stone-400">
                  Semua tugas berjalan tepat waktu. Tidak ada tugas kritis.
                </td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr key={task.id} className="hover:bg-stone-50/50 transition-colors">
                  <td className="py-3.5 font-medium text-stone-800 pr-4">{task.title}</td>
                  <td className="py-3.5 text-stone-500 font-mono text-[11px]">{task.deadline}</td>
                  <td className="py-3.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700">
                      {task.priority}
                    </span>
                  </td>
                  <td className="py-3.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-700">
                      {task.progress_pct}%
                    </span>
                  </td>
                  <td className="py-3.5 text-right">
                    <Link
                      href={`/tasks/${task.id}`}
                      className="inline-flex items-center text-primary font-semibold hover:underline"
                    >
                      Detail <ExternalLink className="w-3 h-3 ml-1" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
