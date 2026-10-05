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
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md border border-amber-200">
            Tambahan
          </span>
        );
      case 'IMPROVISASI':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md border border-purple-200">
            Improvisasi
          </span>
        );
      case 'TUSI':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200">
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

    // Filter Kategori (Tusi / Tambahan / Improvisasi)
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
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5" /> Selesai
        </span>
      );
    }

    const diffDays = getDaysDiff(task.deadline);
    const threshold = task.critical_days_threshold || 3;

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
    } else if (diffDays <= threshold) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
          Sisa {diffDays} hari (Kritis H-{threshold})
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
      {/* Header & Aksi Rekam */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Daftar Pekerjaan</h1>
          <p className="text-sm text-stone-500 mt-1">Pemantauan progres, klasifikasi tusi/tambahan/improvisasi, dan masa kritis.</p>
        </div>
        <Link
          href="/tasks/new"
          className="inline-flex items-center justify-center gap-2 bg-[#DF3B68] hover:bg-[#C72F58] text-white px-5 py-2.5 rounded-full font-semibold text-xs transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Rekam Tugas Baru
        </Link>
      </div>

      {/* FILTER BAR UTAMA */}
      <div className="flex flex-col gap-3 bg-white p-4 rounded-2xl border border-stone-200/70 shadow-sm">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari uraian tugas / unit kerja..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-stone-50/60 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20"
            />
          </div>

          {isSuperAdmin && (
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-stone-400 hidden sm:block" />
              <select
                value={selectedUnitFilter}
                onChange={(e) => setSelectedUnitFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-stone-50 rounded-xl border border-stone-200 text-stone-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20"
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

        {/* Baris Tab Filter: Status & Kategori Tugas */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pt-2 border-t border-stone-100">
          {/* Status Filter */}
          <div className="flex items-center gap-1 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0">
            {[
              { id: 'ALL', label: 'Semua Status' },
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
                    ? 'bg-stone-900 text-white shadow-sm'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Kategori Filter Chips */}
          <div className="flex items-center gap-1.5 self-end lg:self-auto">
            <span className="text-[11px] font-semibold text-stone-400 flex items-center gap-1 mr-1">
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
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* DAFTAR PEKERJAAN */}
      <div className="bg-white rounded-3xl border border-stone-200/70 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-sm text-stone-400">Memuat daftar tugas...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-stone-500 font-medium text-sm">Tidak ada tugas ditemukan pada parameter ini</p>
            <p className="text-stone-400 text-xs mt-1">
              Coba pilih siklus periode lain di pojok kanan atas atau ubah saringan status/jenis pekerjaan.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {filteredTasks.map((task) => {
              const isSubExpanded = expandedTaskIds.includes(task.id);
              const isDescExpanded = expandedDescIds.includes(task.id);
              const progressPct = getEffectiveProgress(task);
              const subtasksCount = task.subtasks?.length || 0;
              const hasLegalLink = !!task.legal_basis_link;
              const hasEvidence = !!task.evidence_link;

              return (
                <div key={task.id} className="transition-colors hover:bg-stone-50/40">
                  <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {renderCategoryBadge(task.category)}
                        {getUrgencyBadge(task)}
                        {getStatusBadge(task.status)}
                        
                        {task.unit && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md border border-stone-200">
                            <Building2 className="w-3 h-3 text-stone-500" />
                            {task.unit.name}
                          </span>
                        )}

                        <span className="text-[11px] font-semibold text-stone-600 bg-stone-50 px-2 py-0.5 rounded-md border border-stone-200">
                          {task.priority}
                        </span>
                        <span className="text-xs text-stone-400 flex items-center gap-1 font-mono">
                          <Calendar className="w-3.5 h-3.5" />
                          Tenggat: {parseSafeDate(task.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>

                      <h3 className="font-semibold text-stone-900 text-base">{task.title}</h3>
                      
                      {task.kendala_note && task.status === 'TERKENDALA' && (
                        <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-xl border border-rose-100">
                          <strong>Hambatan/Kendala:</strong> {task.kendala_note}
                        </p>
                      )}

                      <div className="flex items-center gap-3 pt-1 max-w-xs">
                        <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${getProgressBarColor(progressPct)}`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-stone-600">{progressPct}%</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-end md:self-center">
                      {(task.description || task.legal_basis || hasLegalLink) && (
                        <button
                          type="button"
                          onClick={() => toggleDescription(task.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors border ${
                            isDescExpanded
                              ? 'bg-amber-50 text-amber-900 border-amber-300'
                              : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                          }`}
                        >
                          <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                          <span>Dasar Hukum & Petunjuk</span>
                          {isDescExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => toggleSubtasks(task.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors border ${
                          isSubExpanded 
                            ? 'bg-stone-900 text-white border-stone-900' 
                            : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
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
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
                          title="Buka Tautan Regulasi / Dasar Hukum"
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
                          title="Buka Dokumen Bukti Penyelesaian di Google Drive / Cloud"
                        >
                          <FileText className="w-3 h-3" /> Bukti
                        </a>
                      )}

                      <Link
                        href={`/tasks/${task.id}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors"
                      >
                        Kelola
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>

                  {isDescExpanded && (
                    <div className="px-5 pb-4 pt-1 bg-amber-50/40 border-t border-amber-100 space-y-2 animate-in fade-in duration-150">
                      {task.legal_basis && (
                        <div className="flex flex-wrap items-center gap-2 text-xs text-stone-700">
                          <span className="font-bold text-amber-900">Dasar Hukum:</span>
                          <span className="font-mono bg-white px-2 py-0.5 rounded border border-stone-200">{task.legal_basis}</span>
                          {task.legal_basis_link && (
                            <a
                              href={task.legal_basis_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline"
                            >
                              <ExternalLink className="w-3 h-3" /> Buka Tautan Dokumen Regulasi
                            </a>
                          )}
                        </div>
                      )}

                      {task.description && (
                        <div className="p-3 bg-white rounded-xl border border-stone-200/70 text-xs text-stone-600 leading-relaxed">
                          <p className="font-bold text-stone-800 mb-1">Petunjuk Teknis & Deskripsi:</p>
                          {task.description}
                        </div>
                      )}
                    </div>
                  )}

                  {/* CHECKLIST SUB-PEKERJAAN */}
                  {isSubExpanded && (
                    <div className="px-5 pb-5 pt-2 border-t border-stone-100 bg-stone-50/50 space-y-3 animate-in fade-in duration-150">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#DF3B68]" />
                            <span>Tahapan Sub-Pekerjaan (Klik untuk mengubah progres):</span>
                          </p>
                          <Link
                            href={`/tasks/${task.id}`}
                            className="text-[11px] text-[#DF3B68] hover:underline font-semibold"
                          >
                            + Kelola Detail Sub-tugas
                          </Link>
                        </div>

                        {!task.subtasks || task.subtasks.length === 0 ? (
                          <div className="p-3 bg-white rounded-xl border border-stone-200 text-xs text-stone-400 italic">
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
                                      ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 shadow-2xs hover:bg-emerald-100/70'
                                      : 'bg-white border-stone-200 text-stone-800 hover:border-[#DF3B68]/40 hover:bg-rose-50/30'
                                  }`}
                                  title="Klik untuk menyelesaikan/membatalkan sub-tugas ini"
                                >
                                  <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                                    {isUpdating ? (
                                      <Loader2 className="w-4 h-4 text-[#DF3B68] animate-spin shrink-0" />
                                    ) : st.is_completed ? (
                                      <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0 group-hover:scale-110 transition-transform" />
                                    ) : (
                                      <Square className="w-4 h-4 text-stone-400 shrink-0 group-hover:text-[#DF3B68] group-hover:scale-110 transition-transform" />
                                    )}
                                    <span className={`truncate font-medium ${st.is_completed ? 'line-through text-stone-400' : 'text-stone-800'}`}>
                                      {idx + 1}. {st.title}
                                    </span>
                                  </div>

                                  {st.deadline && (
                                    <span className="shrink-0 text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 border border-stone-200">
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
