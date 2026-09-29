'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ListTodo, 
  RefreshCw 
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { MetricCard } from '@/components/dashboard/metric-card';
import { WorkloadCard } from '@/components/dashboard/workload-card';
import { UrgentTaskTable } from '@/components/dashboard/urgent-task-table';
import type { Task } from '@/types/database.types';

interface StaffWorkload {
  name: string;
  completedTasks: number;
  totalTasks: number;
}

interface ChartBarItem {
  label: string;
  val: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<'unit' | 'konsolidasi'>('unit');

  // Metrik states
  const [metrics, setMetrics] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    critical: 0,
  });

  const [workloadData, setWorkloadData] = useState<StaffWorkload[]>([]);
  const [chartBars, setChartBars] = useState<ChartBarItem[]>([]);
  const [urgentTasks, setUrgentTasks] = useState<Task[]>([]);

  useEffect(() => {
    fetchDashboardMetrics();
  }, [filterMode]);

  const fetchDashboardMetrics = async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    // 1. Ambil info profil & unit kerja user
    const { data: profile } = await supabase
      .from('profiles')
      .select('unit_id, role, unit:units(id, name, level, parent_id)')
      .eq('id', user.id)
      .single();

    if (!profile?.unit_id) {
      setLoading(false);
      return;
    }

    // 2. Tentukan cakupan Unit IDs berdasarkan mode filter
    let targetUnitIds: string[] = [profile.unit_id];

    if (filterMode === 'konsolidasi') {
      const userUnit = profile.unit as any;
      if (userUnit?.level === 'SEKSI' && userUnit.parent_id) {
        // Ambil semua seksi yang berada dalam KPPN induk yang sama
        const { data: siblingUnits } = await supabase
          .from('units')
          .select('id')
          .eq('parent_id', userUnit.parent_id);

        if (siblingUnits && siblingUnits.length > 0) {
          targetUnitIds = siblingUnits.map((u) => u.id);
        }
      } else if (userUnit?.level === 'ESELON_III' || userUnit?.level === 'ESELON_II') {
        // Ambil seluruh unit anak (sub-units)
        const { data: childUnits } = await supabase
          .from('units')
          .select('id')
          .eq('parent_id', userUnit.id);

        if (childUnits && childUnits.length > 0) {
          targetUnitIds = [userUnit.id, ...childUnits.map((u) => u.id)];
        }
      }
    }

    // 3. Ambil data tasks periode berjalan
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .in('unit_id', targetUnitIds)
      .order('deadline', { ascending: true });

    if (tasksError || !tasks) {
      setLoading(false);
      return;
    }

    // 4. Hitung Metrik & Tugas Kritis Berdasarkan Tanggal Hari Ini
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const threeDaysLater = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
    const threeDaysLaterStr = threeDaysLater.toISOString().split('T')[0];

    let completedCount = 0;
    let inProgressCount = 0;
    let criticalCount = 0;
    const criticalList: Task[] = [];

    tasks.forEach((t) => {
      const isCompleted = t.status === 'SELESAI';
      const isKendala = t.status === 'TERKENDALA';
      // Kritis jika terkendala ATAU belum selesai dan tenggat <= H-3 (termasuk yang lewat tenggat)
      const isOverdueOrH3 = !isCompleted && t.deadline <= threeDaysLaterStr;

      if (isCompleted) {
        completedCount++;
      } else if (t.status === 'ON_PROGRESS') {
        inProgressCount++;
      }

      if (isKendala || isOverdueOrH3) {
        criticalCount++;
        criticalList.push(t as Task);
      }
    });

    setMetrics({
      total: tasks.length,
      completed: completedCount,
      inProgress: inProgressCount,
      critical: criticalCount,
    });

    // Urutkan tugas kritis: yang paling lampau / mendekati tenggat di posisi teratas
    criticalList.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
    setUrgentTasks(criticalList.slice(0, 5)); // Tampilkan 5 tugas paling mendesak

    // 5. Hitung Distribusi Beban Kerja (Berdasarkan PIC Pegawai)
    const taskIds = tasks.map((t) => t.id);
    if (taskIds.length > 0) {
      const { data: pics } = await supabase
        .from('task_pics')
        .select(`
          user_id,
          task_id,
          profile:profiles(id, full_name)
        `)
        .in('task_id', taskIds);

      if (pics && pics.length > 0) {
        const staffMap = new Map<string, { name: string; completed: number; total: number }>();

        pics.forEach((item: any) => {
          const staffName = item.profile?.full_name || 'Pegawai';
          const relatedTask = tasks.find((t) => t.id === item.task_id);
          const isDone = relatedTask?.status === 'SELESAI';

          if (!staffMap.has(staffName)) {
            staffMap.set(staffName, { name: staffName, completed: 0, total: 0 });
          }

          const current = staffMap.get(staffName)!;
          current.total++;
          if (isDone) current.completed++;
        });

        const sortedWorkload = Array.from(staffMap.values()).sort(
          (a, b) => b.total - a.total
        );
        setWorkloadData(sortedWorkload.slice(0, 5));
      } else {
        setWorkloadData([]);
      }
    } else {
      setWorkloadData([]);
    }

    // 6. Hitung Ritme Capaian Per Bulan (Bulan 1 s.d. 8 / periode berjalan)
    const monthlyStats: { [key: number]: { total: number; completed: number } } = {};
    for (let m = 1; m <= 8; m++) {
      monthlyStats[m] = { total: 0, completed: 0 };
    }

    tasks.forEach((t) => {
      const m = t.period_month || (new Date(t.deadline).getMonth() + 1);
      if (m >= 1 && m <= 8) {
        monthlyStats[m].total++;
        if (t.status === 'SELESAI') monthlyStats[m].completed++;
      }
    });

    const computedBars: ChartBarItem[] = Object.keys(monthlyStats).map((key) => {
      const mNum = Number(key);
      const stat = monthlyStats[mNum];
      const pct = stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0;
      return {
        label: `B${mNum}`,
        val: `${Math.max(pct, 8)}%`, // Nilai minimal 8% agar bar tetap tampak rapi
      };
    });

    setChartBars(computedBars);
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Filter Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900 tracking-tight">Kinerja & Pemantauan Tusi</h1>
          <p className="text-xs text-stone-500 mt-0.5">Pemantauan progres pelaksanaan tugas berkala instansi</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab Switcher Scope */}
          <div className="bg-stone-100 p-1 rounded-full border border-stone-200/60 flex items-center text-xs">
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

          <button
            onClick={fetchDashboardMetrics}
            className="p-2 rounded-full border border-stone-200 bg-white hover:bg-stone-50 text-stone-500 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4 Kartu Metrik Ringkasan (Dengan Drill-Down Link Terfilter) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          label="Total Target Tusi" 
          value={loading ? '...' : metrics.total} 
          icon={ListTodo} 
          iconColor="text-blue-500" 
          subLabel="Target periode berjalan"
          onClick={() => router.push('/tasks?status=ALL')}
        />
        <MetricCard 
          label="Tuntas Selesai" 
          value={loading ? '...' : metrics.completed} 
          icon={CheckCircle2} 
          iconColor="text-emerald-500" 
          subLabel="Tervalidasi link bukti"
          onClick={() => router.push('/tasks?status=SELESAI')}
        />
        <MetricCard 
          label="Dalam Pengerjaan" 
          value={loading ? '...' : metrics.inProgress} 
          icon={Clock} 
          iconColor="text-amber-500" 
          subLabel="Tahapan sub-tugas aktif"
          onClick={() => router.push('/tasks?status=ON_PROGRESS')}
        />
        <MetricCard 
          label="Terkendala / Kritis" 
          value={loading ? '...' : metrics.critical} 
          icon={AlertTriangle} 
          iconColor="text-rose-500" 
          subLabel="H-3 atau perlu eskalasi"
          onClick={() => router.push('/tasks?status=KRITIS')}
        />
      </div>

      {/* Baris 2: Beban Kerja Pegawai & Grafik Ritme Penyelesaian */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WorkloadCard data={workloadData} />

        {/* Card Ritme / Distribusi Capaian Real-Time */}
        <div className="bg-white border border-stone-200/60 rounded-3xl p-6 shadow-soft space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-stone-900">Ritme Penyelesaian Tugas</h4>
            <span className="text-[11px] text-stone-400 font-medium">Bulan 1 s.d. 8</span>
          </div>

          <div className="h-40 flex items-end justify-between gap-3 pt-6 px-3">
            {chartBars.map((bar, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <div
                  className="w-full max-w-[26px] bg-primary rounded-t-lg hover:opacity-85 transition-all duration-200"
                  style={{ height: bar.val }}
                  title={`Capaian ${bar.label}: ${bar.val}`}
                />
                <span className="text-[10px] text-stone-400 font-mono">{bar.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Baris 3: Tabel Tugas Kritis Real-Time / H-3 */}
      <UrgentTaskTable tasks={urgentTasks} />
    </div>
  );
}
