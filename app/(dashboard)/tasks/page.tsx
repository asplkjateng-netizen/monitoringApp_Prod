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
  ExternalLink,
  Building2,
  FileText,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  Layers,
  BookOpen,
  Link as LinkIcon,
  Loader2,
  Tag
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface SubtaskItem {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  deadline?: string | null;
  custom_evidence_link?: string;
}

interface TaskItem {
  id: string;
  unit_id: string;
  title: string;
  description?: string;
  category?: 'TUSI' | 'TAMBAHAN' | 'IMPROVISASI';
  legal_basis?: string;
  legal_basis_link?: string;
  deadline: string;
  critical_days_threshold?: number;
  status: 'BELUM_DIKERJAKAN' | 'ON_PROGRESS' | 'TERKENDALA' | 'SELESAI';
  priority: 'TINGGI' | 'SEDANG' | 'RENDAH';
  progress_pct: number;
  evidence_link?: string;
  kendala_note?: string;
  period_type?: string;
  period_month?: number;
  period_year: number;
  created_at: string;
  unit?: {
    id: string;
    name: string;
    level: string;
  };
  subtasks?: SubtaskItem[];
}

interface UnitOption {
  id: string;
  name: string;
  level: string;
}

function TasksContent() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') || 'ALL';
  const periodParam = searchParams.get('period') || 'ALL';

  const supabase = createClient();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Accordion Expand States
  const [expandedTaskIds, setExpandedTaskIds] = useState<string[]>([]);
  const [expandedDescIds, setExpandedDescIds] = useState<string[]>([]);

  // Subtask Updating State (ID yang sedang diproses)
  const [updatingSubtaskId, setUpdatingSubtaskId] = useState<string | null>(null);

  // Role & Multi-Unit State
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [unitList, setUnitList] = useState<UnitOption[]>([]);
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<string>('ALL_UNITS');
  const [userUnitId, setUserUnitId] = useState<string>('');

  useEffect(() => {
    if (searchParams.get('status')) {
      setStatusFilter(searchParams.get('status')!);
    }
  }, [searchParams]);

  useEffect(() => {
    initUserAndFetch();
  }, []);

  useEffect(() => {
    fetchTasks(selectedUnitFilter, userUnitId, isSuperAdmin);
  }, [selectedUnitFilter]);

  const initUserAndFetch = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('unit_id, role')
        .eq('id', user.id)
        .maybeSingle();

      let adminFlag = false;
      let currentUnitId = '';

      if (profile) {
        currentUnitId = profile.unit_id || '';
        setUserUnitId(currentUnitId);
        adminFlag = String(profile.role).toUpperCase() === 'SUPER_ADMIN';
        setIsSuperAdmin(adminFlag);

        if (adminFlag) {
          const { data: units } = await supabase
            .from('units')
            .select('id, name, level')
            .order('name');
          if (units) setUnitList(units);
          setSelectedUnitFilter('ALL_UNITS');
        } else {
          setSelectedUnitFilter('MY_UNIT');
        }
      }

      await fetchTasks(adminFlag ? 'ALL_UNITS' : 'MY_UNIT', currentUnitId, adminFlag);
    } catch (err) {
      console.error('Inisialisasi user gagal:', err);
      setLoading(false);
    }
  };

  const fetchTasks = async (filterUnit: string, myUnitId: string, isAdmin: boolean) => {
    setLoading(true);

    try {
      let query = supabase
        .from('tasks')
        .select('*, unit:units(id, name, level), subtasks(*)')
        .order('deadline', { ascending: true });

      if (filterUnit === 'MY_UNIT' && myUnitId) {
        query = query.eq('unit_id', myUnitId);
      } else if (filterUnit !== 'ALL_UNITS' && filterUnit !== 'MY_UNIT') {
        query = query.eq('unit_id', filterUnit);
      }

      const { data, error } = await query;
      if (!error && data) {
        setTasks(data as TaskItem[]);
      }
    } catch (e) {
      console.error('Exception on fetchTasks:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSubtask = async (subtaskId: string, currentStatus: boolean, taskId: string) => {
    setUpdatingSubtaskId(subtaskId);
    const newStatus = !currentStatus;

    setTasks((prevTasks) =>
      prevTasks.map((task) => {
        if (task.id !== taskId) return task;

        const updatedSubtasks = (task.subtasks || []).map((st) =>
          st.id === subtaskId ? { ...st, is_completed: newStatus } : st
        );

        const total = updatedSubtasks.length;
        const completed = updatedSubtasks.filter((st) => st.is_completed).length;
        const calculatedPct = total > 0 ? Math.round((completed / total) * 100) : task.progress_pct;

        let derivedStatus: TaskItem['status'] = task.status;
        if (task.status !== 'TERKENDALA') {
          if (calculatedPct === 100) derivedStatus = 'SELESAI';
          else if (calculatedPct > 0) derivedStatus = 'ON_PROGRESS';
          else derivedStatus = 'BELUM_DIKERJAKAN';
        }

        return {
          ...task,
          subtasks: updatedSubtasks,
          progress_pct: calculatedPct,
          status: derivedStatus,
        };
      })
    );

    try {
      const { error } = await supabase
        .from('subtasks')
        .update({ is_completed: newStatus, updated_at: new Date().toISOString() })
        .eq('id', subtaskId);

      if (error) {
        console.error('Gagal memperbarui sub-tugas:', error);
        fetchTasks(selectedUnitFilter, userUnitId, isSuperAdmin);
      }
    } catch (err) {
      console.error('Error saat update subtask:', err);
    } finally {
      setUpdatingSubtaskId(null);
    }
  };

  const toggleSubtasks = (taskId: string) => {
    setExpandedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const toggleDescription = (taskId: string) => {
    setExpandedDescIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const parseSafeDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };

  const getDaysDiff = (deadlineStr: string) => {
    if (!deadlineStr) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dDate = parseSafeDate(deadlineStr);
    dDate.setHours(0, 0, 0, 0);
    return Math.round((dDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getEffectiveProgress = (task: TaskItem): number => {
    if (task.status === 'SELESAI') return 100;
    return task.progress_pct || 0;
  };

  const getProgressBarColor = (pct: number) => {
    if (pct >= 80) return 'bg-emerald-500';
    if (pct >= 31) return 'bg-amber-400';
    return 'bg-rose-500';
  };

  const getTaskMonth = (t: TaskItem): number => {
    if (t.period_month && t.period_month >= 1 && t.period_month <= 12) {
      return t.period_month;
    }
    if (t.deadline) {
      const parts = t.deadline.split('-');
      if (parts.length >= 2) {
        const parsed = parseInt(parts[1], 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 12) return parsed;
      }
    }
    return new Date().getMonth() + 1;
  };

  const renderCategoryBadge = (category?: string) => {
    switch (category) {
      case 'TAMBAHAN':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
            Tambahan
          </span>
        );
      case 'IMPROVISASI':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-800">
            Improvisasi
          </span>
        );
      case 'TUSI':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
            Tusi
          </span>
        );
    }
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch = 
      t.title?.toLowerCase().includes(search.toLowerCase()) ||
      (t.unit?.name && t.unit.name.toLowerCase().includes(search.toLowerCase()));
      
    if (!matchesSearch) return false;

    if (categoryFilter !== 'ALL') {
      const cat = t.category || 'TUSI';
      if (cat !== categoryFilter) return false;
    }

    if (statusFilter !== 'ALL') {
      if (statusFilter === 'KRITIS') {
        const diffDays = getDaysDiff(t.deadline);
        const threshold = t.critical_days_threshold || 3;
        const isKritis = t.status === 'TERKENDALA' || (t.status !== 'SELESAI' && diffDays <= threshold);
        if (!isKritis) return false;
      } else if (t.status !== statusFilter) {
        return false;
      }
    }

    const taskMonth = getTaskMonth(t);
    const currentMonth = new Date().getMonth() + 1;

    switch (periodParam) {
      case 'CURRENT_MONTH': {
        if (taskMonth === currentMonth) return true;
        if (t.period_type === 'TRIWULANAN') {
          const currentQuarter = Math.ceil(currentMonth / 3);
          const taskQuarter = Math.ceil(taskMonth / 3);
          if (currentQuarter === taskQuarter) return true;
        }
        if (t.period_type === 'SEMESTERAN') {
          const currentSemester = currentMonth <= 6 ? 1 : 2;
          const taskSemester = taskMonth <= 6 ? 1 : 2;
          if (currentSemester === taskSemester) return true;
        }
        if (t.period_type === 'TAHUNAN') return true;
        return false;
      }
      case 'TW_1': return [1, 2, 3].includes(taskMonth);
      case 'TW_2': return [4, 5, 6].includes(taskMonth);
      case 'TW_3': return [7, 8, 9].includes(taskMonth);
      case 'TW_4': return [10, 11, 12].includes(taskMonth);
      case 'SEMESTER_1': return [1, 2, 3, 4, 5, 6].includes(taskMonth);
      case 'SEMESTER_2': return [7, 8, 9, 10, 11, 12].includes(taskMonth);
      case 'TAHUNAN': return t.period_type === 'TAHUNAN';
      case 'ALL':
      default:
        return true;
    }
  });

  const getUrgencyBadge = (task: TaskItem) => {
    if (task.status === 'SELESAI') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="w-3.5 h-3.5" /> Selesai
        </span>
      );
    }

    const diffDays = getDaysDiff(task.deadline);
    const threshold = task.critical_days_threshold || 3;

    if (diffDays < 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-red-600 dark:bg-rose-600 text-white shadow-xs">
          Terlambat {Math.abs(diffDays)} hari
        </span>
      );
    } else if (diffDays === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white">
          Batas Hari Ini
        </span>
      );
    } else if (diffDays <= threshold) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800">
          Sisa {diffDays} hari (Kritis H-{threshold})
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 border border-stone-200 dark:border-slate-700">
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
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            On Progress
          </span>
        );
      case 'TERKENDALA':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <AlertCircle className="w-3 h-3" /> Terkendala
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 border border-stone-200 dark:border-slate-700">
            Belum Mulai
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-5 md:space-y-6 max-w-7xl mx-auto">
      
      {/* HEADER & AKSI REKAM */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-slate-100 tracking-tight">Daftar Pekerjaan</h1>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-slate-400 mt-1">
            Pemantauan progres, klasifikasi tusi/tambahan/improvisasi, dan masa kritis.
          </p>
        </div>
        <Link
          href="/tasks/new"
          className="inline-flex items-center justify-center gap-2 bg-[#DF3B68] hover:bg-[#C72F58] text-white px-5 py-2.5 rounded-full font-semibold text-xs transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Rekam Tugas Baru
        </Link>
      </div>

      {/* FILTER BAR UTAMA */}
      <div className="flex flex-col gap-3 bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-stone-200/70 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari uraian tugas / unit kerja..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-stone-50/70 dark:bg-slate-800/80 rounded-xl border border-stone-200 dark:border-slate-700 text-stone-900 dark:text-slate-100 placeholder:text-stone-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/30"
            />
          </div>

          {isSuperAdmin && (
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-stone-400 dark:text-slate-500 hidden sm:block" />
              <select
                value={selectedUnitFilter}
                onChange={(e) => setSelectedUnitFilter(e.target.value)}
                className="w-full md:w-auto px-3 py-2 text-xs bg-stone-50 dark:bg-slate-800 rounded-xl border border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/30"
              >
                <option value="ALL_UNITS">🌐 Seluruh Unit (Regional se-Wilayah)</option>
                <option value="MY_UNIT">Unit Saya Saja</option>
                {unitList.map((u) => (
                  <option key={u.id} value={u.id}>
                    [{u.level}] {u.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Tab Filter Bar: Status & Kategori */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pt-2 border-t border-stone-100 dark:border-slate-800">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0 scrollbar-none">
            {[
              { id: 'ALL', label: 'Semua' },
              { id: 'KRITIS', label: 'Kritis (H-X)' },
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
                    ? 'bg-stone-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                    : 'text-stone-600 dark:text-slate-400 hover:bg-stone-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Kategori Filter Chips */}
          <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-end lg:self-auto">
            <span className="text-[11px] font-semibold text-stone-400 dark:text-slate-500 flex items-center gap-1 mr-1">
              <Tag className="w-3 h-3" /> Jenis:
            </span>
            {[
              { id: 'ALL', label: 'Semua' },
              { id: 'TUSI', label: 'Tusi Pokok' },
              { id: 'TAMBAHAN', label: 'Tambahan' },
              { id: 'IMPROVISASI', label: 'Improvisasi' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  categoryFilter === cat.id
                    ? 'bg-[#DF3B68] text-white font-semibold'
                    : 'bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* DAFTAR PEKERJAAN (ADAPTIVE VIEW) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-stone-200/70 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        {loading ? (
          <div className="py-20 text-center text-sm text-stone-400 dark:text-slate-500 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#DF3B68]" />
            <span>Memuat daftar tugas...</span>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-20 text-center px-4">
            <p className="text-stone-600 dark:text-slate-300 font-medium text-sm">Tidak ada tugas ditemukan pada parameter ini</p>
            <p className="text-stone-400 dark:text-slate-500 text-xs mt-1">
              Coba pilih siklus periode lain di menu atas atau sesuaikan saringan status/jenis pekerjaan.
            </p>
          </div>
        ) : (
          <div>
            {/* ------------------------------------------------------------- */}
            {/* VIEW 1: DESKTOP TABLE/LIST VIEW (Layar >= md)                  */}
            {/* ------------------------------------------------------------- */}
            <div className="hidden md:block divide-y divide-stone-100 dark:divide-slate-800/80">
              {filteredTasks.map((task) => {
                const isSubExpanded = expandedTaskIds.includes(task.id);
                const isDescExpanded = expandedDescIds.includes(task.id);
                const progressPct = getEffectiveProgress(task);
                const subtasksCount = task.subtasks?.length || 0;
                const hasLegalLink = !!task.legal_basis_link;
                const hasEvidence = !!task.evidence_link;

                return (
                  <div key={task.id} className="transition-colors hover:bg-stone-50/50 dark:hover:bg-slate-800/40">
                    <div className="p-5 flex items-center justify-between gap-4">
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {renderCategoryBadge(task.category)}
                          {getUrgencyBadge(task)}
                          {getStatusBadge(task.status)}
                          
                          {task.unit && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 px-2 py-0.5 rounded-md border border-stone-200 dark:border-slate-700">
                              <Building2 className="w-3 h-3 text-stone-500 dark:text-slate-400" />
                              {task.unit.name}
                            </span>
                          )}

                          <span className="text-[11px] font-semibold text-stone-600 dark:text-slate-400 bg-stone-50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md border border-stone-200 dark:border-slate-700">
                            {task.priority}
                          </span>
                          <span className="text-xs text-stone-400 dark:text-slate-500 flex items-center gap-1 font-mono">
                            <Calendar className="w-3.5 h-3.5" />
                            Tenggat: {parseSafeDate(task.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>

                        <h3 className="font-semibold text-stone-900 dark:text-slate-100 text-base">{task.title}</h3>
                        
                        {task.kendala_note && task.status === 'TERKENDALA' && (
                          <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-xl border border-rose-100 dark:border-rose-900/50">
                            <strong>Hambatan/Kendala:</strong> {task.kendala_note}
                          </p>
                        )}

                        <div className="flex items-center gap-3 pt-1 max-w-xs">
                          <div className="flex-1 h-2 bg-stone-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${getProgressBarColor(progressPct)}`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-stone-600 dark:text-slate-300">{progressPct}%</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {(task.description || task.legal_basis || hasLegalLink) && (
                          <button
                            type="button"
                            onClick={() => toggleDescription(task.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors border ${
                              isDescExpanded
                                ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                                : 'bg-white dark:bg-slate-800 text-stone-700 dark:text-slate-200 border-stone-200 dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-700'
                            }`}
                          >
                            <BookOpen className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            <span>Dasar Hukum & Petunjuk</span>
                            {isDescExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => toggleSubtasks(task.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors border ${
                            isSubExpanded 
                              ? 'bg-stone-900 dark:bg-slate-100 text-white dark:text-slate-900 border-stone-900 dark:border-slate-100' 
                              : 'bg-white dark:bg-slate-800 text-stone-700 dark:text-slate-200 border-stone-200 dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-700'
                          }`}
                        >
                          <Layers className="w-3.5 h-3.5 text-[#DF3B68]" />
                          <span>Sub-tugas ({subtasksCount})</span>
                          {isSubExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        {hasLegalLink && (
                          <a
                            href={task.legal_basis_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors"
                            title="Buka Dokumen Regulasi Cloud"
                          >
                            <LinkIcon className="w-3.5 h-3.5" /> Regulasi
                          </a>
                        )}

                        {hasEvidence && (
                          <a
                            href={task.evidence_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-[#DF3B68] bg-[#DF3B68]/10 hover:bg-[#DF3B68]/20 transition-colors"
                            title="Buka Dokumen Bukti Penyelesaian"
                          >
                            <FileText className="w-3 h-3" /> Bukti
                          </a>
                        )}

                        <Link
                          href={`/tasks/${task.id}`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-700 dark:text-slate-200 bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 transition-colors"
                        >
                          Kelola
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>

                    {/* Accordion Dasar Hukum Desktop */}
                    {isDescExpanded && (
                      <div className="px-5 pb-4 pt-1 bg-amber-50/40 dark:bg-amber-950/20 border-t border-amber-100 dark:border-amber-900/40 space-y-2 animate-in fade-in duration-150">
                        {task.legal_basis && (
                          <div className="flex flex-wrap items-center gap-2 text-xs text-stone-700 dark:text-slate-300">
                            <span className="font-bold text-amber-900 dark:text-amber-400">Dasar Hukum:</span>
                            <span className="font-mono bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-stone-200 dark:border-slate-700">{task.legal_basis}</span>
                            {task.legal_basis_link && (
                              <a
                                href={task.legal_basis_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                <ExternalLink className="w-3 h-3" /> Buka Tautan Dokumen Regulasi
                              </a>
                            )}
                          </div>
                        )}

                        {task.description && (
                          <div className="p-3 bg-white dark:bg-slate-800/90 rounded-xl border border-stone-200/70 dark:border-slate-700 text-xs text-stone-600 dark:text-slate-300 leading-relaxed">
                            <p className="font-bold text-stone-800 dark:text-slate-200 mb-1">Petunjuk Teknis & Deskripsi:</p>
                            {task.description}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Accordion Subtasks Desktop */}
                    {isSubExpanded && (
                      <div className="px-5 pb-5 pt-2 border-t border-stone-100 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-850 space-y-3 animate-in fade-in duration-150">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-stone-800 dark:text-slate-200 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#DF3B68]" />
                              <span>Tahapan Sub-Pekerjaan (Klik untuk mencentang progres):</span>
                            </p>
                            <Link
                              href={`/tasks/${task.id}`}
                              className="text-[11px] text-[#DF3B68] hover:underline font-semibold"
                            >
                              + Kelola Detail Sub-tugas
                            </Link>
                          </div>

                          {!task.subtasks || task.subtasks.length === 0 ? (
                            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-stone-200 dark:border-slate-700 text-xs text-stone-400 dark:text-slate-500 italic">
                              Belum ada sub-pekerjaan yang direkam untuk tugas ini.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {task.subtasks.map((st, idx) => {
                                const isUpdating = updatingSubtaskId === st.id;

                                return (
                                  <button
                                    type="button"
                                    key={st.id || idx}
                                    disabled={isUpdating}
                                    onClick={() => handleToggleSubtask(st.id, st.is_completed, task.id)}
                                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2.5 transition-all text-left group cursor-pointer ${
                                      st.is_completed
                                        ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-300 hover:bg-emerald-100/70'
                                        : 'bg-white dark:bg-slate-800 border-stone-200 dark:border-slate-700 text-stone-800 dark:text-slate-200 hover:border-[#DF3B68]/40 dark:hover:border-[#DF3B68]/60 hover:bg-rose-50/30'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                                      {isUpdating ? (
                                        <Loader2 className="w-4 h-4 text-[#DF3B68] animate-spin shrink-0" />
                                      ) : st.is_completed ? (
                                        <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
                                      ) : (
                                        <Square className="w-4 h-4 text-stone-400 dark:text-slate-500 shrink-0 group-hover:text-[#DF3B68] group-hover:scale-110 transition-transform" />
                                      )}
                                      <span className={`truncate font-medium ${st.is_completed ? 'line-through text-stone-400 dark:text-slate-500' : 'text-stone-800 dark:text-slate-200'}`}>
                                        {idx + 1}. {st.title}
                                      </span>
                                    </div>

                                    {st.deadline && (
                                      <span className="shrink-0 text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-stone-100 dark:bg-slate-700 text-stone-600 dark:text-slate-300 border border-stone-200 dark:border-slate-600">
                                        Batas: {st.deadline}
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>

            {/* ------------------------------------------------------------- */}
            {/* VIEW 2: MOBILE ADAPTIVE TASK CARDS (Layar < md)               */}
            {/* ------------------------------------------------------------- */}
            <div className="md:hidden divide-y divide-stone-100 dark:divide-slate-800">
              {filteredTasks.map((task) => {
                const isSubExpanded = expandedTaskIds.includes(task.id);
                const isDescExpanded = expandedDescIds.includes(task.id);
                const progressPct = getEffectiveProgress(task);
                const subtasksCount = task.subtasks?.length || 0;
                const hasLegalLink = !!task.legal_basis_link;
                const hasEvidence = !!task.evidence_link;

                return (
                  <div key={task.id} className="p-4 space-y-3.5 transition-colors">
                    {/* Baris Badge Mobile */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {renderCategoryBadge(task.category)}
                      {getUrgencyBadge(task)}
                      {getStatusBadge(task.status)}
                      <span className="text-[10px] font-semibold text-stone-600 dark:text-slate-400 bg-stone-50 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-stone-200 dark:border-slate-700">
                        {task.priority}
                      </span>
                    </div>

                    {/* Judul & Detail Unit */}
                    <div className="space-y-1">
                      <h3 className="font-bold text-stone-900 dark:text-slate-100 text-sm leading-snug">
                        {task.title}
                      </h3>
                      
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500 dark:text-slate-400 pt-0.5">
                        {task.unit && (
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-stone-400" />
                            {task.unit.name}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-stone-400" />
                          {parseSafeDate(task.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    {/* Hambatan Kendala Jika Ada */}
                    {task.kendala_note && task.status === 'TERKENDALA' && (
                      <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-100 dark:border-rose-900/50">
                        <strong>Kendala:</strong> {task.kendala_note}
                      </p>
                    )}

                    {/* Progress Bar Mobile */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold text-stone-600 dark:text-slate-300">
                        <span>Capaian Progres</span>
                        <span>{progressPct}%</span>
                      </div>
                      <div className="h-2 bg-stone-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${getProgressBarColor(progressPct)}`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Tombol Aksi Mobile Touch-Friendly */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => toggleSubtasks(task.id)}
                        className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-semibold border transition-colors ${
                          isSubExpanded 
                            ? 'bg-stone-900 dark:bg-slate-100 text-white dark:text-slate-900 border-stone-900 dark:border-slate-100' 
                            : 'bg-stone-50 dark:bg-slate-800 text-stone-700 dark:text-slate-200 border-stone-200 dark:border-slate-700'
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5 text-[#DF3B68]" />
                        <span>Subtugas ({subtasksCount})</span>
                        {isSubExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      <Link
                        href={`/tasks/${task.id}`}
                        className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-semibold bg-[#DF3B68] text-white hover:bg-[#C72F58] transition-colors shadow-xs"
                      >
                        Kelola
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>

                    {/* Tombol Sekunder Mobile: Dasar Hukum, Regulasi & Bukti */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                      {(task.description || task.legal_basis || hasLegalLink) && (
                        <button
                          type="button"
                          onClick={() => toggleDescription(task.id)}
                          className={`inline-flex items-center gap-1 py-1.5 px-2.5 rounded-lg text-[11px] font-semibold border whitespace-nowrap transition-colors ${
                            isDescExpanded 
                              ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border-amber-300' 
                              : 'bg-white dark:bg-slate-800 text-stone-700 dark:text-slate-300 border-stone-200 dark:border-slate-700'
                          }`}
                        >
                          <BookOpen className="w-3 h-3 text-amber-600" />
                          <span>Dasar Hukum</span>
                          {isDescExpanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                        </button>
                      )}

                      {hasLegalLink && (
                        <a
                          href={task.legal_basis_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 py-1.5 px-2.5 rounded-lg text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 whitespace-nowrap"
                        >
                          <LinkIcon className="w-3 h-3" /> Link Regulasi
                        </a>
                      )}

                      {hasEvidence && (
                        <a
                          href={task.evidence_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 py-1.5 px-2.5 rounded-lg text-[11px] font-semibold text-[#DF3B68] bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 whitespace-nowrap"
                        >
                          <FileText className="w-3 h-3" /> Bukti
                        </a>
                      )}
                    </div>

                    {/* Accordion Dasar Hukum Mobile */}
                    {isDescExpanded && (
                      <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 space-y-2 text-xs">
                        {task.legal_basis && (
                          <div>
                            <span className="font-bold text-amber-900 dark:text-amber-400 block mb-0.5">Dasar Hukum:</span>
                            <span className="font-mono bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-stone-200 dark:border-slate-700 block">
                              {task.legal_basis}
                            </span>
                          </div>
                        )}
                        {task.description && (
                          <div className="pt-1 text-stone-600 dark:text-slate-300 leading-relaxed">
                            <span className="font-bold text-stone-800 dark:text-slate-200 block mb-0.5">Petunjuk Teknis:</span>
                            {task.description}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Accordion Subtasks Mobile (Touch-Optimized) */}
                    {isSubExpanded && (
                      <div className="p-3 bg-stone-50 dark:bg-slate-800/60 rounded-2xl border border-stone-200 dark:border-slate-700 space-y-2.5 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-bold text-stone-800 dark:text-slate-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#DF3B68]" />
                            <span>Tahapan Checklist:</span>
                          </p>
                          <Link href={`/tasks/${task.id}`} className="text-[10px] text-[#DF3B68] font-bold hover:underline">
                            Detail &rarr;
                          </Link>
                        </div>

                        {!task.subtasks || task.subtasks.length === 0 ? (
                          <p className="text-xs text-stone-400 dark:text-slate-500 italic py-2 text-center">
                            Belum ada tahapan sub-pekerjaan.
                          </p>
                        ) : (
                          <div className="space-y-1.5">
                            {task.subtasks.map((st, idx) => {
                              const isUpdating = updatingSubtaskId === st.id;

                              return (
                                <button
                                  type="button"
                                  key={st.id || idx}
                                  disabled={isUpdating}
                                  onClick={() => handleToggleSubtask(st.id, st.is_completed, task.id)}
                                  className={`w-full p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 transition-all text-left ${
                                    st.is_completed
                                      ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-300'
                                      : 'bg-white dark:bg-slate-800 border-stone-200 dark:border-slate-700 text-stone-800 dark:text-slate-200'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                                    {isUpdating ? (
                                      <Loader2 className="w-4 h-4 text-[#DF3B68] animate-spin shrink-0" />
                                    ) : st.is_completed ? (
                                      <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                    ) : (
                                      <Square className="w-4 h-4 text-stone-400 dark:text-slate-500 shrink-0" />
                                    )}
                                    <span className={`truncate text-xs font-medium ${st.is_completed ? 'line-through text-stone-400 dark:text-slate-500' : 'text-stone-800 dark:text-slate-200'}`}>
                                      {idx + 1}. {st.title}
                                    </span>
                                  </div>

                                  {st.deadline && (
                                    <span className="shrink-0 text-[9px] font-mono font-medium px-1.5 py-0.5 rounded bg-stone-100 dark:bg-slate-700 text-stone-600 dark:text-slate-300 border border-stone-200 dark:border-slate-600">
                                      {st.deadline}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-stone-400 dark:text-slate-500">Memuat...</div>}>
      <TasksContent />
    </Suspense>
  );
}
