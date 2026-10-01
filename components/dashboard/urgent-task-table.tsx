'use client';

import React from 'react';
import Link from 'next/link';
import { ExternalLink, AlertCircle, CheckCircle2, FileText } from 'lucide-react';
import type { Task } from '@/types/database.types';

export function UrgentTaskTable({ 
  tasks, 
  title = "Tugas Kritis & Mendekati Tenggat (H-3)",
  viewAllLink = "/tasks?status=KRITIS" 
}: { 
  tasks: Task[];
  title?: string;
  viewAllLink?: string;
}) {
  const renderDeadlineBadge = (task: Task) => {
    if (task.status === 'SELESAI') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
          <CheckCircle2 className="w-3 h-3" /> Selesai
        </span>
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(task.deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-red-600 text-white shadow-xs">
          Terlambat {Math.abs(diffDays)} hari
        </span>
      );
    } else if (diffDays === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-white">
          Batas Hari Ini
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
          Sisa {diffDays} hari
        </span>
      );
    }
  };

  const renderStatusBadge = (status: Task['status']) => {
    switch (status) {
      case 'SELESAI':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Selesai</span>;
      case 'ON_PROGRESS':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">On Progress</span>;
      case 'TERKENDALA':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Terkendala</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-stone-100 text-stone-600 border border-stone-200">Belum Mulai</span>;
    }
  };

  return (
    <div className="bg-white border border-stone-200/60 rounded-3xl p-6 shadow-soft space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-[#DF3B68]" />
          <h4 className="text-sm font-bold text-stone-900">{title}</h4>
        </div>
        <Link href={viewAllLink} className="text-xs font-semibold text-[#DF3B68] hover:underline">
          Lihat Semua →
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-stone-100 text-stone-400 uppercase text-[10px] tracking-wider">
              <th className="pb-3 font-semibold">Nama Tugas / Tusi</th>
              <th className="pb-3 font-semibold">Urgensi Tenggat</th>
              <th className="pb-3 font-semibold">Status</th>
              <th className="pb-3 font-semibold">Prioritas</th>
              <th className="pb-3 font-semibold">Progres</th>
              <th className="pb-3 font-semibold text-center">Bukti Dukung</th>
              <th className="pb-3 font-semibold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-stone-400">
                  Tidak ada tugas kritis pada periode ini.
                </td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr key={task.id} className="hover:bg-stone-50/50 transition-colors">
                  <td className="py-3.5 font-medium text-stone-800 pr-4">
                    <div>
                      <p className="font-semibold text-stone-900">{task.title}</p>
                      {task.kendala_note && task.status === 'TERKENDALA' && (
                        <p className="text-[11px] text-rose-600 mt-0.5 font-normal">
                          Kendala: {task.kendala_note}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 whitespace-nowrap">
                    <div className="flex flex-col gap-0.5">
                      {renderDeadlineBadge(task)}
                      <span className="text-[10px] text-stone-400 font-mono">{task.deadline}</span>
                    </div>
                  </td>
                  <td className="py-3.5 whitespace-nowrap">{renderStatusBadge(task.status)}</td>
                  <td className="py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      task.priority === 'TINGGI' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="py-3.5 font-semibold text-stone-700">{task.progress_pct}%</td>
                  
                  {/* Akses Link Bukti Langsung (Bisa dibuka PIC & Seluruh Atasan) */}
                  <td className="py-3.5 text-center whitespace-nowrap">
                    {task.evidence_link ? (
                      <a
                        href={task.evidence_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-[#DF3B68] bg-[#DF3B68]/10 hover:bg-[#DF3B68]/20 transition-colors"
                        title="Buka Dokumen Bukti Penyelesaian di Google Drive / Cloud"
                      >
                        <FileText className="w-3 h-3" /> Buka Bukti
                      </a>
                    ) : (
                      <span className="text-stone-300 text-[11px]">-</span>
                    )}
                  </td>

                  <td className="py-3.5 text-right whitespace-nowrap">
                    <Link
                      href={`/tasks/${task.id}`}
                      className="inline-flex items-center text-[#DF3B68] font-semibold hover:underline"
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
