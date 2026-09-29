'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Search, 
  Plus, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink 
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface TaskItem {
  id: string;
  title: string;
  deadline: string;
  status: 'BELUM_DIKERJAKAN' | 'ON_PROGRESS' | 'TERKENDALA' | 'SELESAI';
  priority: 'TINGGI' | 'SEDANG' | 'RENDAH';
  progress_pct: number;
  evidence_link?: string;
  period_type?: string;
  period_month?: number;
  period_year: number;
  created_at: string;
}

function TasksContent() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') || 'ALL';
  const periodParam = searchParams.get('period') || 'CURRENT_MONTH';

  const supabase = createClient();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);

  useEffect(() => {
    if (searchParams.get('status')) {
      setStatusFilter(searchParams.get('status')!);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('unit_id')
        .eq('id', user.id)
        .single();

      let query = supabase
        .from('tasks')
        .select('*')
        .order('deadline', { ascending: true });

      if (profile?.unit_id) {
        query = query.eq('unit_id', profile.unit_id);
      }

      const { data, error } = await query;
      if (!error && data) {
        setTasks(data);
      }
    }
    setLoading(false);
  };

  const getDaysDiff = (deadlineStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dDate = new Date(deadlineStr);
    dDate.setHours(0, 0, 0, 0);
    return Math.round((dDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getProgressBarColor = (pct: number) => {
    if (pct >= 80) return 'bg-emerald-500';
    if (pct >= 31) return 'bg-amber-400';
    return 'bg-rose-500';
  };

  // Filter Tasks berdasarkan Search, Status Tab, dan Siklus Periode dari Topbar
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    // Filter Status
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'KRITIS') {
        const diffDays = getDaysDiff(t.deadline);
        const isKritis = t.status === 'TERKENDALA' || (t.status !== 'SELESAI' && diffDays <= 3);
        if (!isKritis) return false;
      } else if (t.status !== statusFilter) {
        return false;
      }
    }

    // Filter Siklus Periode (Sinkronisasi dengan Topbar)
    const taskDate = new Date(t.deadline);
    const taskMonth = t.period_month || (taskDate.getMonth() + 1);
    const currentMonth = new Date().getMonth() + 1;

    switch (periodParam) {
      case 'CURRENT_MONTH':
        return taskMonth === currentMonth;
      case 'TW_1':
        return [1, 2, 3].includes(taskMonth);
      case 'TW_2':
        return [4, 5, 6].includes(taskMonth);
      case 'TW_3':
        return [7, 8, 9].includes(taskMonth);
      case 'TW_4':
        return [10, 11, 12].includes(taskMonth);
      case 'SEMESTER_1':
        return [1, 2, 3, 4, 5, 6].includes(taskMonth);
      case 'SEMESTER_2':
        return [7, 8, 9, 10, 11, 12].includes(taskMonth);
      case 'TAHUNAN':
        return t.period_type === 'TAHUNAN';
      case 'ALL':
      default:
        return true;
    }
  });

  const getUrgencyBadge = (task: TaskItem) => {
    if (task.status === 'SELESAI') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5" /> Selesai
        </span>
      );
    }

    const diffDays = getDaysDiff(task.deadline);
    if (diffDays < 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-red-600 text-white shadow-xs">
          Terlambat {Math.abs(diffDays)} hari
        </span>
      );
    } else if (diffDays === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white">
          Batas Hari Ini
        </span>
      );
    } else if (diffDays <= 3) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
          Sisa {diffDays} hari
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-600 border border-stone-200">
          Sisa {diffDays} hari
        </span>
      );
    }
  };

  const getStatusBadge = (status: TaskItem['status']) => {
    switch (status) {
      case 'SELESAI':
        return null;
      case 'ON_PROGRESS':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">On Progress</span>;
      case 'TERKENDALA':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200"><AlertCircle className="w-3 h-3" /> Terkendala</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-stone-100 text-stone-600 border border-stone-200">Belum Mulai</span>;
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Daftar Pekerjaan</h1>
          <p className="text-sm text-stone-500 mt-1">Pemantauan progres dan penyelesaian tugas periode aktif unit kerja.</p>
        </div>
        <Link
          href="/tasks/new"
          className="inline-flex items-center justify-center gap-2 bg-[#DF3B68] hover:bg-[#C72F58] text-white px-5 py-2.5 rounded-full font-semibold text-xs transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Rekam Tugas Baru
        </Link>
      </div>

      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-stone-200/70 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari uraian tugas / tusi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-stone-50/60 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'ALL', label: 'Semua' },
            { id: 'KRITIS', label: 'Kritis / H-3' },
            { id: 'BELUM_DIKERJAKAN', label: 'Belum Mulai' },
            { id: 'ON_PROGRESS', label: 'Proses' },
            { id: 'TERKENDALA', label: 'Terkendala' },
            { id: 'SELESAI', label: 'Selesai' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === tab.id
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-stone-200/70 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-sm text-stone-400">Memuat daftar tugas...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-stone-500 font-medium text-sm">Tidak ada tugas ditemukan pada periode ini</p>
            <p className="text-stone-400 text-xs mt-1">Coba ganti filter periode di atas atau ubah status tugas.</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-stone-50/60 transition-colors"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {getUrgencyBadge(task)}
                    {getStatusBadge(task.status)}
                    <span className="text-[11px] font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
                      {task.priority}
                    </span>
                    <span className="text-xs text-stone-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Tenggat: {new Date(task.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <h3 className="font-semibold text-stone-900 text-base">{task.title}</h3>
                  
                  <div className="flex items-center gap-3 pt-1 max-w-xs">
                    <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${getProgressBarColor(task.progress_pct || 0)}`}
                        style={{ width: `${task.progress_pct || 0}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-stone-600">{task.progress_pct || 0}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <Link
                    href={`/tasks/${task.id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors"
                  >
                    Detail & Sub-tugas
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-stone-400">Memuat...</div>}>
      <TasksContent />
    </Suspense>
  );
}
