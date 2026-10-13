'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  BookOpen, 
  Copy, 
  Plus, 
  Search, 
  CheckCircle2, 
  ShieldAlert, 
  Edit3, 
  Trash2, 
  X, 
  AlertCircle,
  Clock,
  RotateCw,
  Sparkles,
  Layers,
  Calendar,
  Power,
  PowerOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type PeriodType = 'BULANAN' | 'TRIWULANAN' | 'SEMESTERAN' | 'TAHUNAN' | 'INSIDENTIL';
type FilterTab = 'ALL' | 'RECURRING_ACTIVE' | 'RECURRING_PAUSED' | 'INCIDENTAL';

interface TemplateItem {
  id: string;
  tusi_type: string;
  title: string;
  category?: 'TUSI' | 'TAMBAHAN' | 'IMPROVISASI';
  description: string | null;
  legal_basis: string | null;
  period_type: PeriodType;
  deadline_rule?: string | null;
  exact_day?: number | null;
  critical_days_threshold?: number;
  is_recurring?: boolean;
  max_score_days_before?: number;
  created_by_unit: string;
  created_at: string;
  unit?: {
    name: string;
    code: string;
  } | null;
}

export default function TusiCatalogPage() {
  const router = useRouter();
  const supabase = createClient();

  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [userTusiType, setUserTusiType] = useState<string>('UMUM');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTusi, setSelectedTusi] = useState('ALL');
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false);

  // Modal Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editTusiType, setEditTusiType] = useState('ASPLK');
  const [editCategory, setEditCategory] = useState<'TUSI' | 'TAMBAHAN' | 'IMPROVISASI'>('TUSI');
  const [editIsRecurring, setEditIsRecurring] = useState(true);
  const [editPeriodType, setEditPeriodType] = useState<PeriodType>('BULANAN');
  const [editDeadlineRule, setEditDeadlineRule] = useState('NEXT_MONTH_DATE');
  const [editExactDay, setEditExactDay] = useState(15);
  const [editCustomDayInput, setEditCustomDayInput] = useState('15');
  const [editDescription, setEditDescription] = useState('');
  const [editLegalBasis, setEditLegalBasis] = useState('');

  // Info Siklus Waktu Berjalan Saat Ini
  const currentPeriodInfo = useMemo(() => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const quarter = Math.ceil(month / 3);
    const semester = month <= 6 ? 1 : 2;

    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const nextRunStr = `1 ${monthNames[nextMonth - 1]} ${nextYear}`;

    return {
      currentMonthName: monthNames[month - 1],
      currentMonthNum: month,
      currentYear: year,
      currentQuarter: quarter,
      currentSemester: semester,
      nextRunSchedule: nextRunStr,
    };
  }, []);

  useEffect(() => {
    loadUserAndTemplates();
  }, []);

  const loadUserAndTemplates = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let currentTusi = 'UMUM';
      let adminFlag = false;

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, role, unit_id, unit:units(id, name, code, tusi_type)')
          .eq('id', user.id)
          .single();

        if (profile) {
          setCurrentUserProfile(profile);
          currentTusi = (profile.unit as any)?.tusi_type || 'UMUM';
          adminFlag = String(profile.role).toUpperCase() === 'SUPER_ADMIN';
          
          setUserTusiType(currentTusi);
          setIsSuperAdmin(adminFlag);
          setSelectedTusi(adminFlag ? 'ALL' : currentTusi);
        }
      }

      await fetchTemplates();
    } catch (err: any) {
      console.error('Error load user/templates:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('task_templates')
        .select('*, unit:created_by_unit(name, code)')
        .order('created_at', { ascending: false });

      if (error) {
        const { data: fallbackData, error: fbError } = await supabase
          .from('task_templates')
          .select('*')
          .order('created_at', { ascending: false });

        if (fbError) throw fbError;
        if (fallbackData) setTemplates(fallbackData as TemplateItem[]);
      } else if (data) {
        setTemplates(data as TemplateItem[]);
      }
    } catch (err: any) {
      console.error('Fatal fetchTemplates error:', err.message);
      setErrorMsg(`Gagal memuat katalog tusi: ${err.message}`);
    }
  };

  const canManageTemplate = (template: TemplateItem) => {
    if (!currentUserProfile) return false;
    if (isSuperAdmin) return true;
    return currentUserProfile.unit_id === template.created_by_unit;
  };

  const handleToggleRecurring = async (template: TemplateItem) => {
    const newStatus = !(template.is_recurring ?? (template.period_type !== 'INSIDENTIL'));
    setTogglingId(template.id);

    const { error } = await supabase
      .from('task_templates')
      .update({ is_recurring: newStatus })
      .eq('id', template.id);

    setTogglingId(null);

    if (error) {
      setErrorMsg(`Gagal mengubah status siklus: ${error.message}`);
    } else {
      setSuccessMsg(
        newStatus 
          ? `Siklus "${template.title}" diaktifkan kembali. Sistem akan memproduksi tugas pada awal periode berikutnya.`
          : `Siklus "${template.title}" berhasil dihentikan. Pekerjaan ini TIDAK AKAN di-generate otomatis lagi.`
      );
      setTemplates(prev => prev.map(t => t.id === template.id ? { ...t, is_recurring: newStatus } : t));
      setTimeout(() => setSuccessMsg(''), 4500);
    }
  };

  const openEditModal = (template: TemplateItem) => {
    setEditingTemplateId(template.id);
    setEditTitle(template.title);
    setEditTusiType(template.tusi_type || 'ASPLK');
    setEditCategory(template.category || 'TUSI');
    setEditIsRecurring(template.is_recurring ?? (template.period_type !== 'INSIDENTIL'));
    setEditPeriodType(template.period_type || 'BULANAN');
    setEditDeadlineRule(template.deadline_rule || 'NEXT_MONTH_DATE');
    const day = template.exact_day || 15;
    setEditExactDay(day);
    setEditCustomDayInput(String(day));
    setEditDescription(template.description || '');
    setEditLegalBasis(template.legal_basis || '');
    setErrorMsg('');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplateId) return;

    if (!editTitle.trim()) {
      setErrorMsg('Judul tusi wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    const { error } = await supabase
      .from('task_templates')
      .update({
        title: editTitle.trim(),
        tusi_type: editTusiType.trim().toUpperCase(),
        category: editCategory,
        is_recurring: editPeriodType !== 'INSIDENTIL' && editIsRecurring,
        period_type: editPeriodType,
        deadline_rule: editPeriodType === 'INSIDENTIL' ? 'MANUAL' : editDeadlineRule,
        exact_day: editExactDay,
        description: editDescription.trim() || null,
        legal_basis: editLegalBasis.trim() || null,
      })
      .eq('id', editingTemplateId);

    setIsSubmitting(false);

    if (error) {
      setErrorMsg(`Gagal memperbarui tusi: ${error.message}`);
    } else {
      setIsEditModalOpen(false);
      setSuccessMsg('Master Tusi klerikal berhasil diperbarui!');
      await fetchTemplates();
      router.refresh();
      setTimeout(() => setSuccessMsg(''), 3500);
    }
  };

  const handleDeleteTemplate = async (templateId: string, title: string) => {
    const confirmed = window.confirm(
      `HAPUS MASTER PEKERJAAN KLERIKAL?\n\n"${title}"\n\nAkibat penghapusan:\n1. Master pekerjaan ini dihapus dari Bank Tusi.\n2. Sistem TIDAK AKAN PERNAH men-generate tugas ini lagi pada siklus-siklus mendatang.\n\nApakah Anda yakin ingin melanjutkan?`
    );
    if (!confirmed) return;

    const { error } = await supabase
      .from('task_templates')
      .delete()
      .eq('id', templateId);

    if (error) {
      alert(`Gagal menghapus template: ${error.message}`);
    } else {
      setSuccessMsg(`Pekerjaan klerikal "${title}" berhasil dihapus permanen dari sistem.`);
      await fetchTemplates();
      router.refresh();
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  const handleCleanDuplicates = async () => {
    const confirmed = window.confirm(
      'Apakah Anda ingin membersihkan seluruh duplikat Master Tusi?\n\nSistem akan mempertahankan satu master asli yang paling awal dan menghapus salinan tusi ganda yang identik di database.'
    );
    if (!confirmed) return;

    setIsCleaningDuplicates(true);
    try {
      const seen = new Set<string>();
      const idsToDelete: string[] = [];

      const sortedTemplates = [...templates].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      for (const t of sortedTemplates) {
        const key = `${t.title.trim().toLowerCase()}_${t.tusi_type?.toUpperCase()}_${t.period_type}`;
        if (seen.has(key)) {
          idsToDelete.push(t.id);
        } else {
          seen.add(key);
        }
      }

      if (idsToDelete.length === 0) {
        alert('Tidak ditemukan data duplikat pada Bank Tusi.');
      } else {
        const { error } = await supabase
          .from('task_templates')
          .delete()
          .in('id', idsToDelete);

        if (error) throw error;

        setSuccessMsg(`Berhasil membersihkan ${idsToDelete.length} master tusi duplikat.`);
        await fetchTemplates();
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(`Gagal membersihkan duplikat: ${err.message}`);
    } finally {
      setIsCleaningDuplicates(false);
      setTimeout(() => {
        setSuccessMsg('');
        setErrorMsg('');
      }, 4000);
    }
  };

  const calculateDeadlineForClone = (template: TemplateItem): string => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const rule = template.deadline_rule || 'END_OF_PERIOD';
    const day = template.exact_day || 31;

    let targetYear = currentYear;
    let targetMonth = currentMonth;

    if (template.period_type === 'BULANAN') {
      if (rule === 'NEXT_MONTH_DATE') {
        targetMonth = currentMonth + 1;
        if (targetMonth > 12) { targetMonth = 1; targetYear += 1; }
      }
    } else if (template.period_type === 'TRIWULANAN') {
      const currentQuarter = Math.ceil(currentMonth / 3);
      const qEnd = currentQuarter * 3;
      const qStart = (currentQuarter - 1) * 3 + 1;

      if (rule === 'END_OF_PERIOD') targetMonth = qEnd;
      else if (rule === 'NEXT_MONTH_DATE') {
        targetMonth = qEnd + 1;
        if (targetMonth > 12) { targetMonth = 1; targetYear += 1; }
      } else if (rule === 'SAME_MONTH_DATE') targetMonth = qStart;
    } else if (template.period_type === 'SEMESTERAN') {
      const isSem1 = currentMonth <= 6;
      const sEnd = isSem1 ? 6 : 12;
      const sStart = isSem1 ? 1 : 7;

      if (rule === 'END_OF_PERIOD') targetMonth = sEnd;
      else if (rule === 'NEXT_MONTH_DATE') {
        targetMonth = sEnd + 1;
        if (targetMonth > 12) { targetMonth = 1; targetYear += 1; }
      } else if (rule === 'SAME_MONTH_DATE') targetMonth = sStart;
    } else if (template.period_type === 'TAHUNAN') {
      if (rule === 'NEXT_MONTH_DATE') { targetMonth = 1; targetYear += 1; }
      else targetMonth = 12;
    }

    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    const finalDay = day >= 31 ? daysInMonth : Math.min(day, daysInMonth);
    return `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(finalDay).padStart(2, '0')}`;
  };

  // GENERATOR & ADOPSI TUGAS DENGAN DEEP CLONE SUB-PEKERJAAN TERUPDATE
  const handleCloneTask = async (template: TemplateItem) => {
    setCloningId(template.id);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !currentUserProfile?.unit_id) {
      setCloningId(null);
      setErrorMsg('Sesi tidak valid. Harap muat ulang halaman.');
      return;
    }

    const now = new Date();
    const deadlineStr = calculateDeadlineForClone(template);

    // Hitung Batas Waktu Nilai Maksimal (H-X) jika diatur pada template
    let maxScoreDeadlineStr: string | null = null;
    const daysBefore = template.max_score_days_before || 0;
    if (daysBefore > 0) {
      const d = new Date(deadlineStr);
      d.setDate(d.getDate() - daysBefore);
      maxScoreDeadlineStr = d.toISOString().split('T')[0];
    }

    let periodMonth = now.getMonth() + 1;
    if (template.period_type === 'TRIWULANAN') {
      periodMonth = Math.ceil(periodMonth / 3) * 3;
    } else if (template.period_type === 'SEMESTERAN') {
      periodMonth = periodMonth <= 6 ? 6 : 12;
    } else if (template.period_type === 'TAHUNAN') {
      periodMonth = 12;
    }

    // 1. CARI TUGAS SUMBER TERAKHIR (VERSI PALING MUTAKHIR DENGAN SUBTASK)
    // Prioritas 1: Tugas terakhir di unit sendiri
    const { data: latestUnitTask } = await supabase
      .from('tasks')
      .select('id, updated_at')
      .eq('template_id', template.id)
      .eq('unit_id', currentUserProfile.unit_id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let sourceTaskId = latestUnitTask?.id;

    // Prioritas 2: Jika belum pernah dibuat di unit sendiri, cari dari unit lain/pembuat template
    if (!sourceTaskId) {
      const { data: latestAnyTask } = await supabase
        .from('tasks')
        .select('id, updated_at')
        .eq('template_id', template.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      sourceTaskId = latestAnyTask?.id;
    }

    // 2. INSERT TUGAS UTAMA KE TABEL tasks
    const { data: newTask, error: taskError } = await supabase
      .from('tasks')
      .insert({
        unit_id: currentUserProfile.unit_id,
        template_id: template.id,
        title: template.title,
        category: template.category || 'TUSI',
        description: template.description,
        legal_basis: template.legal_basis,
        period_type: template.period_type,
        period_month: periodMonth,
        period_year: now.getFullYear(),
        deadline: deadlineStr,
        max_score_days_before: daysBefore,
        max_score_deadline: maxScoreDeadlineStr,
        critical_days_threshold: template.critical_days_threshold || 3,
        status: 'BELUM_DIKERJAKAN',
        progress_pct: 0,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (taskError || !newTask) {
      setCloningId(null);
      setErrorMsg(`Gagal mengkloning: ${taskError?.message || 'Kesalahan sistem'}`);
      return;
    }

    // 3. ASSIGN PIC UTAMA KE PEKERJAAN BARU
    await supabase.from('task_pics').insert({
      task_id: newTask.id,
      user_id: user.id,
    });

    // 4. DUPLIKASI SELURUH SUB-PEKERJAAN VERSI TERUPDATE (DEEP CLONE)
    let copiedSubtaskCount = 0;
    if (sourceTaskId) {
      const { data: sourceSubtasks } = await supabase
        .from('subtasks')
        .select('title, order_index, evidence_link_type')
        .eq('task_id', sourceTaskId)
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: true });

      if (sourceSubtasks && sourceSubtasks.length > 0) {
        const subtasksPayload = sourceSubtasks.map((st, idx) => ({
          task_id: newTask.id,
          title: st.title,
          is_completed: false,
          order_index: st.order_index ?? idx,
          evidence_link_type: st.evidence_link_type || 'INHERIT',
          custom_evidence_link: null,
        }));

        const { error: subtaskError } = await supabase
          .from('subtasks')
          .insert(subtasksPayload);

        if (subtaskError) {
          console.error('Peringatan: Gagal menyalin sub-pekerjaan:', subtaskError.message);
        } else {
          copiedSubtaskCount = subtasksPayload.length;
        }
      }
    }

    setCloningId(null);
    setSuccessMsg(
      copiedSubtaskCount > 0
        ? `Tusi "${template.title}" berhasil diadopsi bersama ${copiedSubtaskCount} tahapan sub-pekerjaan versi terbaru!`
        : `Tusi "${template.title}" berhasil diadopsi ke unit Anda dan terbit di daftar tugas aktif!`
    );
    setTimeout(() => setSuccessMsg(''), 4500);
  };

  const recurringStats = useMemo(() => {
    let activeRecurring = 0;
    let pausedRecurring = 0;
    let incidentalCount = 0;

    templates.forEach((t) => {
      if (t.period_type === 'INSIDENTIL') {
        incidentalCount++;
      } else {
        const isRec = t.is_recurring ?? true;
        if (isRec) activeRecurring++;
        else pausedRecurring++;
      }
    });

    return { activeRecurring, pausedRecurring, incidentalCount };
  }, [templates]);

  const dynamicTusiList = Array.from(
    new Set(['ALL', userTusiType, ...templates.map((t) => t.tusi_type?.toUpperCase()).filter(Boolean)])
  );

  const filtered = templates.filter((t) => {
    const matchSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.tusi_type?.toLowerCase().includes(search.toLowerCase()) ||
      t.legal_basis?.toLowerCase().includes(search.toLowerCase());

    if (!matchSearch) return false;

    if (!isSuperAdmin) {
      if (t.tusi_type?.toUpperCase() !== userTusiType.toUpperCase()) return false;
    } else if (selectedTusi !== 'ALL' && t.tusi_type?.toUpperCase() !== selectedTusi.toUpperCase()) {
      return false;
    }

    const isClerical = t.period_type !== 'INSIDENTIL';
    const isRec = t.is_recurring ?? isClerical;

    if (activeTab === 'RECURRING_ACTIVE') {
      return isClerical && isRec;
    }
    if (activeTab === 'RECURRING_PAUSED') {
      return isClerical && !isRec;
    }
    if (activeTab === 'INCIDENTAL') {
      return !isClerical;
    }

    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2 sm:p-4">
      {/* 1. STATUS WIDGET SIKLUS KLERIKAL BERJALAN & CRON GENERATOR */}
      <div className="bg-white dark:bg-[#1E1E1E] border border-stone-200/80 dark:border-white/[0.08] rounded-3xl p-5 md:p-6 shadow-soft dark:shadow-dark-card space-y-4 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 dark:bg-rose-500/10 flex items-center justify-center text-primary dark:text-rose-400 border border-primary/20 dark:border-rose-500/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-stone-900 dark:text-white/90">
                  Status Siklus Pekerjaan Klerikal Aktif
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  Engine Siap
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-white/60 mt-0.5">
                Periode yang sedang dipantau dan jadwal penerbitan otomatis ke daftar tugas aktif unit.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            {templates.length > 0 && (
              <button
                onClick={handleCleanDuplicates}
                disabled={isCleaningDuplicates}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-200 dark:border-white/[0.08] bg-stone-50 dark:bg-[#242424] hover:bg-stone-100 dark:hover:bg-[#2C2C2C] text-xs font-semibold text-stone-700 dark:text-white/80 transition-all disabled:opacity-50"
                title="Hapus master tusi yang terduplikasi di database"
              >
                <Layers className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>{isCleaningDuplicates ? 'Membersihkan...' : 'Bersihkan Duplikat'}</span>
              </button>
            )}

            <Link
              href="/tusi-catalog/new"
              className="inline-flex items-center gap-2 bg-[#DF3B68] hover:bg-[#C72F58] text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-xs transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Master Tusi</span>
            </Link>
          </div>
        </div>

        {/* Baris Status Siklus Real-Time */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-stone-100 dark:border-white/[0.06]">
          <div className="p-3 rounded-2xl bg-stone-50 dark:bg-[#242424] border border-stone-200/60 dark:border-white/[0.06]">
            <span className="text-[10px] font-medium text-stone-400 dark:text-white/40 block">Periode Berjalan</span>
            <span className="text-xs font-bold text-stone-900 dark:text-white/90">
              {currentPeriodInfo.currentMonthName} {currentPeriodInfo.currentYear}
            </span>
            <span className="text-[10px] text-stone-500 dark:text-white/60 block mt-0.5">
              TW {currentPeriodInfo.currentQuarter} • Sem {currentPeriodInfo.currentSemester}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-stone-50 dark:bg-[#242424] border border-stone-200/60 dark:border-white/[0.06]">
            <span className="text-[10px] font-medium text-stone-400 dark:text-white/40 block">Jadwal Generate Berikutnya</span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {currentPeriodInfo.nextRunSchedule}
            </span>
            <span className="text-[10px] text-stone-500 dark:text-white/60 block mt-0.5">
              Pukul 00:00 UTC (Awal Bulan)
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-stone-50 dark:bg-[#242424] border border-stone-200/60 dark:border-white/[0.06]">
            <span className="text-[10px] font-medium text-stone-400 dark:text-white/40 block">Klerikal Auto-Cycle Aktif</span>
            <span className="text-xs font-bold text-stone-900 dark:text-white/90">
              {recurringStats.activeRecurring} Pekerjaan
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block mt-0.5 font-medium">
              Siap terbit otomatis
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-stone-50 dark:bg-[#242424] border border-stone-200/60 dark:border-white/[0.06]">
            <span className="text-[10px] font-medium text-stone-400 dark:text-white/40 block">Klerikal Dihentikan / Nonaktif</span>
            <span className="text-xs font-bold text-stone-900 dark:text-white/90">
              {recurringStats.pausedRecurring} Pekerjaan
            </span>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 block mt-0.5 font-medium">
              Siklus dimatikan permanen/pause
            </span>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-2xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2. TAB NAVIGASI & FILTER KLERIKAL */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-[#1E1E1E] p-2.5 rounded-2xl border border-stone-200/80 dark:border-white/[0.08] shadow-soft dark:shadow-dark-card">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'ALL'
                ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 shadow-xs'
                : 'text-stone-600 dark:text-white/60 hover:bg-stone-100 dark:hover:bg-[#2C2C2C]'
            }`}
          >
            Semua Master ({templates.length})
          </button>
          <button
            onClick={() => setActiveTab('RECURRING_ACTIVE')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'RECURRING_ACTIVE'
                ? 'bg-[#DF3B68] text-white shadow-xs'
                : 'text-stone-600 dark:text-white/60 hover:bg-stone-100 dark:hover:bg-[#2C2C2C]'
            }`}
          >
            <RotateCw className="w-3 h-3" />
            <span>Klerikal Aktif ({recurringStats.activeRecurring})</span>
          </button>
          <button
            onClick={() => setActiveTab('RECURRING_PAUSED')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'RECURRING_PAUSED'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-stone-600 dark:text-white/60 hover:bg-stone-100 dark:hover:bg-[#2C2C2C]'
            }`}
          >
            <PowerOff className="w-3 h-3" />
            <span>Klerikal Dihentikan ({recurringStats.pausedRecurring})</span>
          </button>
          <button
            onClick={() => setActiveTab('INCIDENTAL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'INCIDENTAL'
                ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 shadow-xs'
                : 'text-stone-600 dark:text-white/60 hover:bg-stone-100 dark:hover:bg-[#2C2C2C]'
            }`}
          >
            Insidentil ({recurringStats.incidentalCount})
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-white/60 self-end sm:self-center pr-2">
          <Sparkles className="w-3.5 h-3.5 text-[#DF3B68]" />
          <span>Seksi: <strong>{userTusiType}</strong></span>
        </div>
      </div>

      {/* 3. PENCARIAN & FILTER SEKSI */}
      <div className="bg-white dark:bg-[#1E1E1E] border border-stone-200/70 dark:border-white/[0.08] rounded-3xl p-3 md:p-4 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 dark:text-white/40" />
          <input
            type="text"
            placeholder={`Cari nama pekerjaan klerikal atau dasar hukum...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-stone-50/60 dark:bg-[#242424] rounded-xl border border-stone-200 dark:border-white/[0.08] text-stone-900 dark:text-white/90 placeholder:text-stone-400 dark:placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20 focus:border-[#DF3B68]"
          />
        </div>

        {isSuperAdmin && (
          <div className="flex gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {dynamicTusiList.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedTusi(type)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedTusi === type 
                    ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 shadow-xs' 
                    : 'bg-stone-100 dark:bg-[#242424] text-stone-600 dark:text-white/60 hover:bg-stone-200 dark:hover:bg-[#2C2C2C]'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 4. GRID KATALOG TEMPLATE KLERIKAL */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full bg-white dark:bg-[#1E1E1E] border border-stone-200/60 dark:border-white/[0.08] rounded-3xl p-16 text-center text-xs text-stone-400 dark:text-white/40 shadow-sm">
            Memuat daftar master pekerjaan klerikal...
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full bg-white dark:bg-[#1E1E1E] border border-stone-200/60 dark:border-white/[0.08] rounded-3xl p-12 text-center space-y-2 shadow-sm">
            <ShieldAlert className="w-8 h-8 text-stone-300 dark:text-white/20 mx-auto" />
            <p className="text-xs font-semibold text-stone-700 dark:text-white/80">
              Tidak ada pekerjaan klerikal pada kriteria filter ini
            </p>
            <p className="text-[11px] text-stone-400 dark:text-white/40">
              Ubah kata kunci pencarian atau sesuaikan tab kategori klerikal.
            </p>
          </div>
        ) : (
          filtered.map((t) => {
            const hasManageAccess = canManageTemplate(t);
            const isClerical = t.period_type !== 'INSIDENTIL';
            const isRec = t.is_recurring ?? isClerical;

            return (
              <div
                key={t.id}
                className={`bg-white dark:bg-[#1E1E1E] border rounded-3xl p-5 shadow-soft dark:shadow-dark-card hover:shadow-md transition-all flex flex-col justify-between space-y-4 ${
                  !isRec && isClerical 
                    ? 'border-amber-200/80 dark:border-amber-500/20 bg-amber-50/20 dark:bg-amber-950/10' 
                    : 'border-stone-200/70 dark:border-white/[0.08]'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#DF3B68]/10 text-[#DF3B68] dark:bg-[#DF3B68]/20 dark:text-rose-400">
                        {t.tusi_type}
                      </span>
                      <span className="text-[10px] font-semibold text-stone-600 dark:text-white/70 bg-stone-100 dark:bg-[#2C2C2C] px-2 py-0.5 rounded-full">
                        {t.period_type}
                      </span>
                      {isClerical ? (
                        isRec ? (
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <RotateCw className="w-2.5 h-2.5" /> Auto-Cycle
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <PowerOff className="w-2.5 h-2.5" /> Siklus Dihentikan
                          </span>
                        )
                      ) : (
                        <span className="text-[10px] font-semibold text-stone-500 dark:text-white/50 bg-stone-100 dark:bg-[#2C2C2C] px-2 py-0.5 rounded-full">
                          Insidentil
                        </span>
                      )}
                    </div>

                    {hasManageAccess && (
                      <div className="flex items-center gap-1">
                        {isClerical && (
                          <button
                            type="button"
                            onClick={() => handleToggleRecurring(t)}
                            disabled={togglingId === t.id}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isRec 
                                ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50' 
                                : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                            }`}
                            title={isRec ? 'Hentikan siklus otomatis (Pekerjaan tidak akan muncul lagi)' : 'Aktifkan kembali siklus otomatis'}
                          >
                            {isRec ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEditModal(t)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-[#2C2C2C] transition-colors"
                          title="Edit Master Tusi"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(t.id, t.title)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                          title="Hapus Master Tusi (Permanen)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-stone-900 dark:text-white/90 leading-snug">{t.title}</h3>
                  
                  {t.description && (
                    <p className="text-xs text-stone-500 dark:text-white/60 line-clamp-2">{t.description}</p>
                  )}
                  {t.legal_basis && (
                    <p className="text-[11px] text-stone-400 dark:text-white/40 italic">Dasar: {t.legal_basis}</p>
                  )}

                  {t.period_type !== 'INSIDENTIL' && (
                    <div className="pt-1 flex items-center gap-1.5 text-[11px] font-medium text-stone-500 dark:text-white/60">
                      <Clock className="w-3 h-3 text-[#DF3B68] dark:text-rose-400" />
                      <span>
                        {`Batas: ${t.exact_day === 31 ? 'Akhir Bulan' : `Tgl ${t.exact_day}`} (${t.deadline_rule === 'NEXT_MONTH_DATE' ? 'M+1' : t.deadline_rule === 'SAME_MONTH_DATE' ? 'Awal Periode' : 'Akhir Periode'})`}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-stone-100 dark:border-white/[0.06] flex items-center justify-between">
                  <span className="text-[10px] text-stone-400 dark:text-white/40 truncate max-w-[130px]" title={t.unit?.name ?? 'Pusat'}>
                    Oleh: {t.unit?.name ?? 'Pusat'}
                  </span>
                  <button
                    onClick={() => handleCloneTask(t)}
                    disabled={cloningId === t.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-900 hover:bg-stone-800 dark:bg-white dark:hover:bg-stone-100 text-white dark:text-stone-900 text-[11px] font-medium disabled:opacity-50 transition-colors shadow-2xs"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {cloningId === t.id ? 'Mengadopsi...' : 'Adopsi Tugas'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. MODAL FORM EDIT MASTER TUSI KLERIKAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#1E1E1E] w-full max-w-lg rounded-3xl border border-stone-200/80 dark:border-white/[0.08] shadow-2xl p-6 md:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#DF3B68] dark:text-rose-400" />
                <h3 className="font-bold text-stone-900 dark:text-white/90 text-sm md:text-base">
                  Edit Master Tusi Klerikal
                </h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-full text-stone-400 dark:text-white/40 hover:bg-stone-100 dark:hover:bg-[#2C2C2C] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <Input
                label="Judul Tugas / Master Tusi *"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 text-left">
                  <label className="block text-xs font-semibold text-stone-600 dark:text-white/70">Tipe Tusi *</label>
                  <input
                    type="text"
                    value={editTusiType}
                    onChange={(e) => setEditTusiType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-white/[0.08] bg-white dark:bg-[#242424] text-xs text-stone-800 dark:text-white/90 uppercase focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20"
                    required
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="block text-xs font-semibold text-stone-600 dark:text-white/70">Siklus Periode *</label>
                  <select
                    value={editPeriodType}
                    onChange={(e) => setEditPeriodType(e.target.value as PeriodType)}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-white/[0.08] bg-white dark:bg-[#242424] text-xs text-stone-800 dark:text-white/90 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20"
                  >
                    <option value="BULANAN">Bulanan</option>
                    <option value="TRIWULANAN">Triwulanan</option>
                    <option value="SEMESTERAN">Semesteran</option>
                    <option value="TAHUNAN">Tahunan</option>
                    <option value="INSIDENTIL">Insidentil</option>
                  </select>
                </div>
              </div>

              {editPeriodType !== 'INSIDENTIL' && (
                <div className="p-3 bg-stone-50 dark:bg-[#242424] rounded-xl border border-stone-200 dark:border-white/[0.08] flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-stone-800 dark:text-white/90 block">Auto-Cycle Otomatis Tiap Periode:</span>
                    <span className="text-[11px] text-stone-500 dark:text-white/60">Pekerjaan ini akan otomatis dibuat oleh sistem pada awal siklus</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={editIsRecurring}
                    onChange={(e) => setEditIsRecurring(e.target.checked)}
                    className="w-4 h-4 text-[#DF3B68] rounded focus:ring-[#DF3B68] cursor-pointer"
                  />
                </div>
              )}

              {editPeriodType !== 'INSIDENTIL' && (
                <div className="p-3.5 bg-stone-50 dark:bg-[#242424] rounded-xl border border-stone-200 dark:border-white/[0.08] space-y-2.5">
                  <span className="text-xs font-bold text-stone-800 dark:text-white/90 block">Formula Batas Tenggat Siklus:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-stone-500 dark:text-white/50 mb-0.5">1. Posisi Bulan:</label>
                      <select
                        value={editDeadlineRule}
                        onChange={(e) => setEditDeadlineRule(e.target.value)}
                        className="w-full p-2 rounded-lg border border-stone-200 dark:border-white/[0.08] bg-white dark:bg-[#1E1E1E] text-stone-800 dark:text-white/90 text-xs"
                      >
                        <option value="NEXT_MONTH_DATE">Bulan Berikutnya (M+1)</option>
                        <option value="END_OF_PERIOD">Bulan Terakhir Periode</option>
                        <option value="SAME_MONTH_DATE">Awal Periode</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-stone-500 dark:text-white/50 mb-0.5">2. Tanggal:</label>
                      <div className="flex gap-1.5">
                        <select
                          value={editExactDay === 31 ? '31' : [5, 10, 15, 20, 25].includes(editExactDay) ? String(editExactDay) : 'CUSTOM'}
                          onChange={(e) => {
                            if (e.target.value === 'CUSTOM') {
                              setEditExactDay(15);
                              setEditCustomDayInput('15');
                            } else {
                              const val = Number(e.target.value);
                              setEditExactDay(val);
                              setEditCustomDayInput(String(val));
                            }
                          }}
                          className="w-1/2 p-2 rounded-lg border border-stone-200 dark:border-white/[0.08] bg-white dark:bg-[#1E1E1E] text-stone-800 dark:text-white/90 text-xs"
                        >
                          <option value="31">Akhir Bulan</option>
                          <option value="5">Tgl 5</option>
                          <option value="10">Tgl 10</option>
                          <option value="15">Tgl 15</option>
                          <option value="20">Tgl 20</option>
                          <option value="25">Tgl 25</option>
                          <option value="CUSTOM">Bebas</option>
                        </select>

                        <input
                          type="number"
                          min={1}
                          max={31}
                          value={editCustomDayInput}
                          onChange={(e) => {
                            setEditCustomDayInput(e.target.value);
                            const val = Number(e.target.value);
                            if (val >= 1 && val <= 31) setEditExactDay(val);
                          }}
                          className="w-1/2 p-2 rounded-lg border border-stone-200 dark:border-white/[0.08] bg-white dark:bg-[#1E1E1E] text-stone-800 dark:text-white/90 text-xs font-mono text-center"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1 text-left">
                <label className="block text-xs font-semibold text-stone-600 dark:text-white/70">Dasar Hukum (Opsional)</label>
                <input
                  type="text"
                  value={editLegalBasis}
                  onChange={(e) => setEditLegalBasis(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-white/[0.08] bg-white dark:bg-[#242424] text-xs text-stone-800 dark:text-white/90 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20"
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="block text-xs font-semibold text-stone-600 dark:text-white/70">Deskripsi / Prosedur (Opsional)</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full p-3 rounded-xl border border-stone-200 dark:border-white/[0.08] bg-white dark:bg-[#242424] text-xs text-stone-800 dark:text-white/90 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100 dark:border-white/[0.06]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  isLoading={isSubmitting}
                  className="bg-[#DF3B68] hover:bg-[#C72F58] text-white font-semibold"
                >
                  Simpan Perubahan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
