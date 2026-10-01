'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ListTodo, 
  RefreshCw,
  Building2,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  ChevronRight,
  Eye
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { MetricCard } from '@/components/dashboard/metric-card';
import { WorkloadCard } from '@/components/dashboard/workload-card';
import { UrgentTaskTable } from '@/components/dashboard/urgent-task-table';
import type { Task } from '@/types/database.types';

type DashboardPerspective = 'STAF' | 'KEPALA_SEKSI' | 'KEPALA_UNIT' | 'KEPALA_KANWIL';

interface SectionHealth {
  id: string;
  name: string;
  total: number;
  completed: number;
  critical: number;
  percentage: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>('STAF');
  const [activePerspective, setActivePerspective] = useState<DashboardPerspective>('STAF');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Unit context
  const [userUnit, setUserUnit] = useState<any>(null);
  const [unitList, setUnitList] = useState<any[]>([]);
  const [simulatedUnitId, setSimulatedUnitId] = useState<string>('');

  // Metrics Data
  const [metrics, setMetrics] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    critical: 0,
  });

  const [urgentTasks, setUrgentTasks] = useState<Task[]>([]);
  const [workloadData, setWorkloadData] = useState<any[]>([]);
  const [sectionMatrix, setSectionMatrix] = useState<SectionHealth[]>([]);
  const [regionalLeaderboard, setRegionalLeaderboard] = useState<SectionHealth[]>([]);

  useEffect(() => {
    initDashboard();
  }, []);

  useEffect(() => {
    if (userUnit) {
      loadPerspectiveData(activePerspective, simulatedUnitId || userUnit.id);
    }
  }, [activePerspective, simulatedUnitId]);

  const initDashboard = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, role, unit_id, unit:units(id, name, level, parent_id)')
      .eq('id', user.id)
      .single();

    if (!profile) {
      setLoading(false);
      return;
    }

    const role = profile.role || 'STAF';
    setCurrentUserRole(role);
    setUserUnit(profile.unit);
    setSimulatedUnitId(profile.unit_id);

    const isAdmin = role === 'SUPER_ADMIN';
    setIsAdmin(isAdmin);

    // Tentukan default perspective berdasarkan role akun
    let initialPerspective: DashboardPerspective = 'STAF';
    if (isAdmin || (profile.unit as any)?.level === 'ESELON_II') {
      initialPerspective = 'KEPALA_KANWIL';
    } else if (role === 'KEPALA_UNIT' || (profile.unit as any)?.level === 'ESELON_III') {
      initialPerspective = 'KEPALA_UNIT';
    } else if (role === 'KEPALA_SEKSI') {
      initialPerspective = 'KEPALA_SEKSI';
    }

    setActivePerspective(initialPerspective);

    // Ambil daftar unit untuk switcher jika admin
    if (isAdmin) {
      const { data: allUnits } = await supabase.from('units').select('id, name, level').order('name');
      if (allUnits) setUnitList(allUnits);
    }

    await loadPerspectiveData(initialPerspective, profile.unit_id, profile.id);
  };

  const loadPerspectiveData = async (
    perspective: DashboardPerspective, 
    targetUnitId: string, 
    currentUserId?: string
  ) => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const userId = currentUserId || user?.id;

    const todayStr = new Date().toISOString().split('T')[0];
    const threeDaysLater = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // ==========================================
    // 1. PERSPEKTIF STAF (HANYA TUGAS PRIBADI)
    // ==========================================
    if (perspective === 'STAF') {
      // Ambil tugas di mana user terdaftar sebagai PIC
      const { data: picRecords } = await supabase
        .from('task_pics')
        .select('task_id')
        .eq('user_id', userId);

      const myTaskIds = (picRecords || []).map((p) => p.task_id);

      if (myTaskIds.length === 0) {
        setMetrics({ total: 0, completed: 0, inProgress: 0, critical: 0 });
        setUrgentTasks([]);
        setLoading(false);
        return;
      }

      const { data: myTasks } = await supabase
        .from('tasks')
        .select('*')
        .in('id', myTaskIds)
        .order('deadline', { ascending: true });

      const tasks = myTasks || [];
      const completed = tasks.filter((t) => t.status === 'SELESAI').length;
      const inProgress = tasks.filter((t) => t.status === 'ON_PROGRESS').length;
      const critical = tasks.filter(
        (t) => t.status === 'TERKENDALA' || (t.status !== 'SELESAI' && t.deadline <= threeDaysLater)
      );

      setMetrics({
        total: tasks.length,
        completed,
        inProgress,
        critical: critical.length,
      });
      setUrgentTasks(critical.slice(0, 5) as Task[]);
    }

    // ==========================================
    // 2. PERSPEKTIF KEPALA SEKSI (1 SEKSI)
    // ==========================================
    else if (perspective === 'KEPALA_SEKSI') {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('unit_id', targetUnitId)
        .order('deadline', { ascending: true });

      const allTasks = tasks || [];
      const completed = allTasks.filter((t) => t.status === 'SELESAI').length;
      const inProgress = allTasks.filter((t) => t.status === 'ON_PROGRESS').length;
      const critical = allTasks.filter(
        (t) => t.status === 'TERKENDALA' || (t.status !== 'SELESAI' && t.deadline <= threeDaysLater)
      );

      setMetrics({
        total: allTasks.length,
        completed,
        inProgress,
        critical: critical.length,
      });
      setUrgentTasks(critical.slice(0, 5) as Task[]);

      // Hitung Workload Staf dalam Seksi
      const taskIds = allTasks.map((t) => t.id);
      if (taskIds.length > 0) {
        const { data: pics } = await supabase
          .from('task_pics')
          .select('task_id, profile:profiles(full_name)')
          .in('task_id', taskIds);

        const staffMap = new Map<string, { name: string; completed: number; total: number }>();
        (pics || []).forEach((p: any) => {
          const name = p.profile?.full_name || 'Staf';
          const related = allTasks.find((t) => t.id === p.task_id);
          if (!staffMap.has(name)) staffMap.set(name, { name, completed: 0, total: 0 });
          const item = staffMap.get(name)!;
          item.total++;
          if (related?.status === 'SELESAI') item.completed++;
        });

        setWorkloadData(Array.from(staffMap.values()).sort((a, b) => b.total - a.total));
      } else {
        setWorkloadData([]);
      }
    }

    // ==========================================
    // 3. PERSPEKTIF KEPALA KANTOR / KAKPPN (LINTAS SEKSI)
    // ==========================================
    else if (perspective === 'KEPALA_UNIT') {
      // Ambil seluruh seksi di bawah kantor ini
      const { data: childUnits } = await supabase
        .from('units')
        .select('id, name')
        .eq('parent_id', targetUnitId);

      const unitIds = childUnits && childUnits.length > 0 
        ? [targetUnitId, ...childUnits.map((u) => u.id)]
        : [targetUnitId];

      const { data: allTasks } = await supabase
        .from('tasks')
        .select('*')
        .in('unit_id', unitIds)
        .order('deadline', { ascending: true });

      const tasks = allTasks || [];
      const completed = tasks.filter((t) => t.status === 'SELESAI').length;
      const inProgress = tasks.filter((t) => t.status === 'ON_PROGRESS').length;
      const critical = tasks.filter(
        (t) => t.status === 'TERKENDALA' || (t.status !== 'SELESAI' && t.deadline <= threeDaysLater)
      );

      setMetrics({
        total: tasks.length,
        completed,
        inProgress,
        critical: critical.length,
      });
      setUrgentTasks(critical.slice(0, 5) as Task[]);

      // Bangun Matriks Performa Antar-Seksi
      if (childUnits && childUnits.length > 0) {
        const matrix: SectionHealth[] = childUnits.map((u) => {
          const uTasks = tasks.filter((t) => t.unit_id === u.id);
          const uDone = uTasks.filter((t) => t.status === 'SELESAI').length;
          const uCrit = uTasks.filter(
            (t) => t.status === 'TERKENDALA' || (t.status !== 'SELESAI' && t.deadline <= threeDaysLater)
          ).length;
          const pct = uTasks.length > 0 ? Math.round((uDone / uTasks.length) * 100) : 0;
          return {
            id: u.id,
            name: u.name,
            total: uTasks.length,
            completed: uDone,
            critical: uCrit,
            percentage: pct,
          };
        });
        setSectionMatrix(matrix);
      }
    }

    // ==========================================
    // 4. PERSPEKTIF KEPALA KANWIL (REGIONAL SE-JATENG)
    // ==========================================
    else if (perspective === 'KEPALA_KANWIL') {
      const { data: allTasks } = await supabase
        .from('tasks')
        .select('*, unit:units(id, name, parent_id, level)')
        .order('deadline', { ascending: true });

      const tasks = allTasks || [];
      const completed = tasks.filter((t) => t.status === 'SELESAI').length;
      const inProgress = tasks.filter((t) => t.status === 'ON_PROGRESS').length;
      const critical = tasks.filter(
        (t) => t.status === 'TERKENDALA' || (t.status !== 'SELESAI' && t.deadline <= threeDaysLater)
      );

      setMetrics({
        total: tasks.length,
        completed,
        inProgress,
        critical: critical.length,
      });
      setUrgentTasks(critical.slice(0, 5) as Task[]);

      // Ambil Seluruh Eselon III (KPPN & Bidang) untuk Leaderboard Regional
      const { data: eselon3Units } = await supabase
        .from('units')
        .select('id, name')
        .eq('level', 'ESELON_III');

      if (eselon3Units) {
        // Ambil pemetaan seksi anak untuk mengagregasikan tugas ke KPPN induk
        const { data: seksiUnits } = await supabase
          .from('units')
          .select('id, parent_id')
          .eq('level', 'SEKSI');

        const parentMap = new Map<string, string>();
        (seksiUnits || []).forEach((s) => {
          if (s.parent_id) parentMap.set(s.id, s.parent_id);
        });

        const leaderboard: SectionHealth[] = eselon3Units.map((e3) => {
          const assignedTasks = tasks.filter(
            (t) => t.unit_id === e3.id || parentMap.get(t.unit_id) === e3.id
          );
          const done = assignedTasks.filter((t) => t.status === 'SELESAI').length;
          const crit = assignedTasks.filter(
            (t) => t.status === 'TERKENDALA' || (t.status !== 'SELESAI' && t.deadline <= threeDaysLater)
          ).length;
          const pct = assignedTasks.length > 0 ? Math.round((done / assignedTasks.length) * 100) : 0;

          return {
            id: e3.id,
            name: e3.name,
            total: assignedTasks.length,
            completed: done,
            critical: crit,
            percentage: pct,
          };
        });

        setRegionalLeaderboard(leaderboard.sort((a, b) => b.percentage - a.percentage));
      }
    }

    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* PERSPECTIVE SWITCHER (KHUSUS SUPER_ADMIN) */}
      {isSuperAdmin && (
        <div className="bg-stone-900 text-white p-4 rounded-3xl shadow-md space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#DF3B68]" />
              <span className="text-xs font-bold uppercase tracking-wider text-stone-300">
                Mode Pratinjau Super Admin:
              </span>
            </div>
            
            {/* Pilihan Level Perspektif */}
            <div className="flex flex-wrap items-center gap-1.5 bg-stone-800 p-1 rounded-2xl">
              {[
                { id: 'STAF', label: 'Staf' },
                { id: 'KEPALA_SEKSI', label: 'Kepala Seksi' },
                { id: 'KEPALA_UNIT', label: 'Kepala Kantor' },
                { id: 'KEPALA_KANWIL', label: 'Kepala Kanwil' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActivePerspective(tab.id as DashboardPerspective)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                    activePerspective === tab.id
                      ? 'bg-[#DF3B68] text-white shadow-sm'
                      : 'text-stone-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Unit Switcher jika ingin simulasi unit tertentu */}
          {activePerspective !== 'KEPALA_KANWIL' && unitList.length > 0 && (
            <div className="flex items-center gap-2 pt-2 border-t border-stone-800 text-xs">
              <span className="text-stone-400">Simulasikan Unit:</span>
              <select
                value={simulatedUnitId}
                onChange={(e) => setSimulatedUnitId(e.target.value)}
                className="bg-stone-800 text-stone-200 px-3 py-1 rounded-xl border border-stone-700 text-xs focus:outline-none"
              >
                {unitList.map((u) => (
                  <option key={u.id} value={u.id}>
                    [{u.level}] {u.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* HEADER DASHBOARD */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-stone-900 tracking-tight">
              {activePerspective === 'STAF' && 'Dashboard Kerja Saya'}
              {activePerspective === 'KEPALA_SEKSI' && 'Supervisory Cockpit Seksi'}
              {activePerspective === 'KEPALA_UNIT' && 'Executive Health Scorecard'}
              {activePerspective === 'KEPALA_KANWIL' && 'Regional Command Center Kanwil'}
            </h1>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
              {activePerspective}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            {activePerspective === 'STAF' && 'Pantau dan eksekusi tugas serta sub-tugas yang ditugaskan kepada Anda.'}
            {activePerspective === 'KEPALA_SEKSI' && 'Monitoring progres capaian seksi, beban kerja staf, dan mitigasi kendala.'}
            {activePerspective === 'KEPALA_UNIT' && 'Evaluasi kesehatan kinerja antar-seksi dan deteksi titik kritis kantor.'}
            {activePerspective === 'KEPALA_KANWIL' && 'Postur kepatuhan dan peringkat kinerja seluruh KPPN dan Bidang se-Wilayah.'}
          </p>
        </div>

        <button
          onClick={() => loadPerspectiveData(activePerspective, simulatedUnitId || userUnit?.id)}
          className="p-2 rounded-full border border-stone-200 bg-white hover:bg-stone-50 text-stone-500 transition-colors self-start sm:self-center"
          title="Segarkan Data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#DF3B68]' : ''}`} />
        </button>
      </div>

      {/* 4 KARTU METRIK RINGKASAN */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          label={activePerspective === 'STAF' ? 'Tugas Saya' : 'Total Target Tusi'} 
          value={loading ? '...' : metrics.total} 
          icon={ListTodo} 
          iconColor="text-blue-500" 
          subLabel="Beban periode berjalan"
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
          subLabel="H-3 atau butuh koordinasi"
          onClick={() => router.push('/tasks?status=KRITIS')}
        />
      </div>

      {/* ========================================================= */}
      {/* KONTEN LEVEL 1: STAF (HANYA TABEL TUGAS PRIBADI, NO CHARTS) */}
      {/* ========================================================= */}
      {activePerspective === 'STAF' && (
        <div className="space-y-6">
          <UrgentTaskTable 
            tasks={urgentTasks} 
            title="Tugas Saya yang Kritis / Mendekati Batas Waktu" 
          />
        </div>
      )}

      {/* ========================================================= */}
      {/* KONTEN LEVEL 2: KEPALA SEKSI (WORKLOAD STAF & RADAR KENDALA) */}
      {/* ========================================================= */}
      {activePerspective === 'KEPALA_SEKSI' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WorkloadCard data={workloadData} />
            <div className="bg-white border border-stone-200/60 rounded-3xl p-6 shadow-soft flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-stone-900">Indeks Kepatuhan Seksi</h4>
                <p className="text-xs text-stone-500 mt-1">Rasio penyelesaian tugas tepat waktu pada periode aktif.</p>
              </div>
              <div className="py-6 text-center">
                <p className="text-5xl font-black text-[#DF3B68]">
                  {metrics.total > 0 ? Math.round((metrics.completed / metrics.total) * 100) : 0}%
                </p>
                <p className="text-xs text-stone-400 mt-2 font-medium">
                  {metrics.completed} dari {metrics.total} tugas telah tuntas
                </p>
              </div>
              <Link 
                href="/tasks/new" 
                className="w-full py-2 bg-stone-900 text-white rounded-xl text-xs font-semibold text-center hover:bg-stone-800 transition-colors"
              >
                + Beri Penugasan Baru
              </Link>
            </div>
          </div>
          <UrgentTaskTable 
            tasks={urgentTasks} 
            title="Radar Tugas Seksi Terkendala & Kritis" 
          />
        </div>
      )}

      {/* ========================================================= */}
      {/* KONTEN LEVEL 3: KEPALA KANTOR (MATRIKS PERFORMA ANTAR-SEKSI) */}
      {/* ========================================================= */}
      {activePerspective === 'KEPALA_UNIT' && (
        <div className="space-y-6">
          {/* Matriks Antar Seksi */}
          <div className="bg-white border border-stone-200/60 rounded-3xl p-6 shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-stone-900">Matriks Kesehatan Kinerja Antar-Seksi</h4>
                <p className="text-xs text-stone-500">Komparasi capaian tusi dan titik kritis per unit kerja.</p>
              </div>
              <Building2 className="w-4 h-4 text-stone-400" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {sectionMatrix.map((sec) => (
                <div key={sec.id} className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-bold text-stone-900 leading-snug line-clamp-2">{sec.name}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      sec.percentage >= 80 ? 'bg-emerald-100 text-emerald-800' :
                      sec.percentage >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {sec.percentage}%
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-stone-600 font-medium">
                    <span>{sec.completed}/{sec.total} Selesai</span>
                    {sec.critical > 0 ? (
                      <span className="text-rose-600 font-bold">{sec.critical} Kritis</span>
                    ) : (
                      <span className="text-emerald-600">Nihil Kendala</span>
                    )}
                  </div>

                  <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${sec.percentage >= 80 ? 'bg-emerald-500' : sec.percentage >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                      style={{ width: `${sec.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <UrgentTaskTable 
            tasks={urgentTasks} 
            title="Eskalasi Manajerial: Tugas Kritis Seluruh Kantor" 
          />
        </div>
      )}

      {/* ========================================================= */}
      {/* KONTEN LEVEL 4: KEPALA KANWIL (LEADERBOARD REGIONAL SATKER) */}
      {/* ========================================================= */}
      {activePerspective === 'KEPALA_KANWIL' && (
        <div className="space-y-6">
          <div className="bg-white border border-stone-200/60 rounded-3xl p-6 shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-stone-900">Leaderboard Kepatuhan KPPN & Bidang se-Jawa Tengah</h4>
                <p className="text-xs text-stone-500">Peringkat kepatuhan dan kecepatan penyelesaian tusi regional.</p>
              </div>
              <TrendingUp className="w-4 h-4 text-[#DF3B68]" />
            </div>

            <div className="divide-y divide-stone-100">
              {regionalLeaderboard.map((unit, index) => (
                <div key={unit.id} className="py-3.5 flex items-center justify-between gap-4 hover:bg-stone-50/60 px-2 rounded-xl transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-amber-100 text-amber-800' :
                      index === 1 ? 'bg-stone-200 text-stone-800' :
                      index === 2 ? 'bg-orange-100 text-orange-800' : 'text-stone-400'
                    }`}>
                      {index + 1}
                    </span>
                    <div className="truncate">
                      <p className="text-xs font-bold text-stone-900 truncate">{unit.name}</p>
                      <p className="text-[11px] text-stone-500">{unit.completed} dari {unit.total} tugas tuntas ({unit.critical} kritis)</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-24 bg-stone-100 h-2 rounded-full overflow-hidden hidden sm:block">
                      <div 
                        className={`h-full ${unit.percentage >= 80 ? 'bg-emerald-500' : unit.percentage >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                        style={{ width: `${unit.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-stone-900 w-12 text-right">{unit.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <UrgentTaskTable 
            tasks={urgentTasks} 
            title="Radar Titik Kritis Regional Kanwil" 
          />
        </div>
      )}

    </div>
  );
}
