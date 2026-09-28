'use client';
import { useState } from 'react';
import { CheckCircle2, Clock, AlertTriangle, ListTodo, BarChart2 } from 'lucide-react';
import { MetricCard } from '@/components/dashboard/metric-card';
import { WorkloadCard } from '@/components/dashboard/workload-card';
import { UrgentTaskTable } from '@/components/dashboard/urgent-task-table';
import type { Task } from '@/types/database.types';

export default function DashboardPage() {
  const [filterMode, setFilterMode] = useState<'unit' | 'konsolidasi'>('unit');

  // Data Distribusi Beban Kerja (Meniru ranking produk referensi)
  const dummyWorkload = [
    { name: 'Agung Rikhi Umboro', completedTasks: 8, totalTasks: 10 },
    { name: 'Seksi MSKI', completedTasks: 14, totalTasks: 15 },
    { name: 'Seksi Bank', completedTasks: 6, totalTasks: 9 },
    { name: 'Seksi Vera', completedTasks: 4, totalTasks: 8 },
  ];

  // Data Ritme Capaian Grafik Batang
  const chartBars = [
    { label: 'P1', val: '40%' },
    { label: 'P2', val: '65%' },
    { label: 'P3', val: '30%' },
    { label: 'P4', val: '85%' },
    { label: 'P5', val: '45%' },
    { label: 'P6', val: '100%' },
    { label: 'P7', val: '70%' },
    { label: 'P8', val: '55%' },
  ];

  // Data Tabel Tugas Kritis
  const dummyUrgentTasks: Task[] = [
    {
      id: '1',
      unit_id: 'u1',
      template_id: null,
      title: 'Laporan Rekonsiliasi Rekening Koran Triwulan I',
      description: null,
      legal_basis: null,
      period_type: 'TRIWULANAN',
      period_month: 3,
      period_year: 2026,
      deadline: '2026-03-31',
      status: 'ON_PROGRESS',
      priority: 'TINGGI',
      progress_pct: 65,
      evidence_link: null,
      kendala_note: null,
      completed_at: null,
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title & Filter Switcher */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-900 tracking-tight">Kinerja & Pemantauan Tusi</h1>
          <p className="text-xs text-stone-500 mt-0.5">Pemantauan progres pelaksanaan tugas berkala instansi</p>
        </div>

        {/* Tab Switcher */}
        <div className="bg-canvas-subtle p-1 rounded-full border border-stone-200/60 flex items-center text-xs">
          <button
            onClick={() => setFilterMode('unit')}
            className={`px-4 py-1.5 rounded-full font-medium transition-all ${
              filterMode === 'unit' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            Unit Saya
          </button>
          <button
            onClick={() => setFilterMode('konsolidasi')}
            className={`px-4 py-1.5 rounded-full font-medium transition-all ${
              filterMode === 'konsolidasi' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            Konsolidasi Kanwil/KPPN
          </button>
        </div>
      </div>

      {/* 4 Kartu Metrik Ringkasan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Target Tusi" value={29} icon={ListTodo} iconColor="text-blue-500" subLabel="Target periode berjalan" />
        <MetricCard label="Tuntas Selesai" value={18} icon={CheckCircle2} iconColor="text-emerald-500" subLabel="Tervalidasi link bukti" />
        <MetricCard label="Dalam Pengerjaan" value={9} icon={Clock} iconColor="text-amber-500" subLabel="Rata-rata 65% progres" />
        <MetricCard label="Terkendala / Kritis" value={2} icon={AlertTriangle} iconColor="text-primary" subLabel="Perlu perhatian atasan" />
      </div>

      {/* Baris 2: Beban Kerja Pegawai & Grafik Ritme Penyelesaian */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WorkloadCard data={dummyWorkload} />

        {/* Card Ritme / Distribusi Capaian (Sesuai Referensi Peak Ordering Time) */}
        <div className="bg-white border border-stone-200/60 rounded-3xl p-6 shadow-soft space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-stone-900">Ritme Penyelesaian Tugas</h4>
            <BarChart2 className="w-4 h-4 text-stone-400" />
          </div>

          <div className="h-40 flex items-end justify-between gap-3 pt-6 px-3">
            {chartBars.map((bar, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <div
                  className="w-full max-w-[26px] bg-blue-600 rounded-t-lg hover:bg-primary transition-all duration-200"
                  style={{ height: bar.val }}
                />
                <span className="text-[10px] text-stone-400 font-mono">{bar.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Baris 3: Tabel Tugas Kritis / H-3 */}
      <UrgentTaskTable tasks={dummyUrgentTasks} />
    </div>
  );
}
