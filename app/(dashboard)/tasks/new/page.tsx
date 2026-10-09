'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Users, 
  CheckCircle2, 
  FileText, 
  Sparkles, 
  AlertCircle, 
  BookmarkPlus, 
  Clock, 
  Calendar, 
  Radio, 
  Search, 
  UserX, 
  UserCheck, 
  Building, 
  Link as LinkIcon, 
  Tag, 
  BellRing,
  RotateCw,
  Wrench,
  BookOpen
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/ui/rich-text-editor';

interface LinkItem {
  name: string;
  url: string;
}

interface StaffProfile {
  id: string;
  full_name: string;
  nip: string;
  role: string;
  unit_id?: string;
  unit?: {
    id: string;
    name: string;
    level: string;
  };
}

interface TaskTemplate {
  id: string;
  tusi_type: string;
  title: string;
  category?: 'TUSI' | 'TAMBAHAN' | 'IMPROVISASI';
  description: string | null;
  legal_basis: string | null;
  legal_basis_link?: string | null;
  regulations?: LinkItem[] | null;
  tools?: LinkItem[] | null;
  period_type: 'BULANAN' | 'TRIWULANAN' | 'SEMESTERAN' | 'TAHUNAN' | 'INSIDENTIL';
  deadline_rule?: string;
  exact_day?: number;
  critical_days_threshold?: number;
  is_recurring?: boolean;
}

interface SubtaskDraft {
  title: string;
  deadline?: string;
  pic_id?: string;
}

export default function NewTaskPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Identitas sesi & unit
  const [userId, setUserId] = useState<string | null>(null);
  const [unitId, setUnitId] = useState<string | null>(null);
  const [userUnitInfo, setUserUnitInfo] = useState<any>(null);
  const [userTusiType, setUserTusiType] = useState<string>('UMUM');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Sumber data pendukung
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);

  // State Form Pokok
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [saveAsTemplate, setSaveAsTemplate] = useState<boolean>(false);
  const [category, setCategory] = useState<'TUSI' | 'TAMBAHAN' | 'IMPROVISASI'>('TUSI');
  const [isClericalRecurring, setIsClericalRecurring] = useState<boolean>(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Multi-Link Regulasi & Tools
  const [regulations, setRegulations] = useState<LinkItem[]>([{ name: '', url: '' }]);
  const [tools, setTools] = useState<LinkItem[]>([]);

  const [periodType, setPeriodType] = useState<'BULANAN' | 'TRIWULANAN' | 'SEMESTERAN' | 'TAHUNAN' | 'INSIDENTIL'>('TRIWULANAN');
  
  // State Pemilih Periode Spesifik
  const [selectedQuarter, setSelectedQuarter] = useState<number>(1);
  const [selectedSemester, setSelectedSemester] = useState<number>(1);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Fleksibilitas Deadline Lintas Bulan
  const [deadlineMode, setDeadlineMode] = useState<'FORMULA' | 'CUSTOM'>('FORMULA');
  const [deadlineRule, setDeadlineRule] = useState<'END_OF_PERIOD' | 'NEXT_MONTH_DATE' | 'SAME_MONTH_DATE'>('NEXT_MONTH_DATE');
  const [exactDay, setExactDay] = useState<number>(15);
  const [customDayInput, setCustomDayInput] = useState<string>('15');
  const [deadline, setDeadline] = useState('');

  // Pengaturan Masa Kritis Kustom (H-X)
  const [criticalDaysThreshold, setCriticalDaysThreshold] = useState<number>(3);
  const [priority, setPriority] = useState<'TINGGI' | 'SEDANG' | 'RENDAH'>('SEDANG');

  // Mode Penugasan
  const [assignmentMode, setAssignmentMode] = useState<'MANUAL' | 'BROADCAST'>('MANUAL');
  const [broadcastScope, setBroadcastScope] = useState<'SEKSI' | 'KANTOR' | 'WILAYAH'>('SEKSI');
  const [broadcastStaffList, setBroadcastStaffList] = useState<StaffProfile[]>([]);
  const [excludedPicIds, setExcludedPicIds] = useState<string[]>([]);
  const [exclusionSearch, setExclusionSearch] = useState('');
  const [loadingBroadcastStaff, setLoadingBroadcastStaff] = useState(false);

  // Multi-PIC Manual & Subtasks
  const [selectedPics, setSelectedPics] = useState<string[]>([]);
  const [subtasks, setSubtasks] = useState<SubtaskDraft[]>([{ title: '', deadline: '', pic_id: '' }]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (periodType === 'INSIDENTIL') {
      setIsClericalRecurring(false);
    }
  }, [periodType]);

  useEffect(() => {
    if (periodType !== 'INSIDENTIL' && deadlineMode === 'FORMULA') {
      calculateRecurringDeadline();
    }
  }, [periodType, selectedQuarter, selectedSemester, selectedMonth, selectedYear, deadlineRule, exactDay, deadlineMode]);

  useEffect(() => {
    if (assignmentMode === 'BROADCAST') {
      loadBroadcastStaff(broadcastScope);
    }
  }, [assignmentMode, broadcastScope, unitId]);

  const calculateRecurringDeadline = () => {
    let targetYear = selectedYear;
    let targetMonth = 1;

    if (periodType === 'BULANAN') {
      if (deadlineRule === 'NEXT_MONTH_DATE') {
        targetMonth = selectedMonth + 1;
        if (targetMonth > 12) {
          targetMonth = 1;
          targetYear += 1;
        }
      } else {
        targetMonth = selectedMonth;
      }
    } else if (periodType === 'TRIWULANAN') {
      const quarterEndMonth = selectedQuarter * 3;
      const quarterStartMonth = (selectedQuarter - 1) * 3 + 1;

      if (deadlineRule === 'END_OF_PERIOD') {
        targetMonth = quarterEndMonth;
      } else if (deadlineRule === 'NEXT_MONTH_DATE') {
        targetMonth = quarterEndMonth + 1;
        if (targetMonth > 12) {
          targetMonth = 1;
          targetYear += 1;
        }
      } else if (deadlineRule === 'SAME_MONTH_DATE') {
        targetMonth = quarterStartMonth;
      }
    } else if (periodType === 'SEMESTERAN') {
      const semEndMonth = selectedSemester === 1 ? 6 : 12;
      const semStartMonth = selectedSemester === 1 ? 1 : 7;

      if (deadlineRule === 'END_OF_PERIOD') {
        targetMonth = semEndMonth;
      } else if (deadlineRule === 'NEXT_MONTH_DATE') {
        targetMonth = semEndMonth + 1;
        if (targetMonth > 12) {
          targetMonth = 1;
          targetYear += 1;
        }
      } else if (deadlineRule === 'SAME_MONTH_DATE') {
        targetMonth = semStartMonth;
      }
    } else if (periodType === 'TAHUNAN') {
      if (deadlineRule === 'END_OF_PERIOD') {
        targetMonth = 12;
      } else if (deadlineRule === 'NEXT_MONTH_DATE') {
        targetMonth = 1;
        targetYear += 1;
      } else if (deadlineRule === 'SAME_MONTH_DATE') {
        targetMonth = 1;
      }
    }

    const daysInTargetMonth = new Date(targetYear, targetMonth, 0).getDate();
    const effectiveDay = exactDay >= 31 ? daysInTargetMonth : Math.min(exactDay, daysInTargetMonth);

    const formattedMonth = String(targetMonth).padStart(2, '0');
    const formattedDay = String(effectiveDay).padStart(2, '0');
    setDeadline(`${targetYear}-${formattedMonth}-${formattedDay}`);
  };

  const getPeriodMonthValue = (): number => {
    if (periodType === 'BULANAN') return selectedMonth;
    if (periodType === 'TRIWULANAN') return selectedQuarter * 3;
    if (periodType === 'SEMESTERAN') return selectedSemester === 1 ? 6 : 12;
    if (periodType === 'TAHUNAN') return 12;
    return new Date().getMonth() + 1;
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      setUserId(user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('*, unit:units(*)')
        .eq('id', user.id)
        .maybeSingle();

      let targetUnitId = profile?.unit_id;
      if (!targetUnitId) {
        const { data: firstUnit } = await supabase.from('units').select('id, name, level').limit(1).single();
        if (firstUnit) targetUnitId = firstUnit.id;
      }

      setUnitId(targetUnitId || null);
      setUserUnitInfo(profile?.unit || null);

      const rawTusi = (profile?.unit as any)?.tusi_type || 'UMUM';
      const cleanTusi = rawTusi.trim().toUpperCase();
      setUserTusiType(cleanTusi);

      const roleUpper = String(profile?.role || 'STAF').toUpperCase();
      setIsSuperAdmin(roleUpper === 'SUPER_ADMIN');

      let loadedStaff: StaffProfile[] = [];
      if (targetUnitId) {
        const { data: staffData } = await supabase
          .from('profiles')
          .select('id, full_name, nip, role, unit_id')
          .eq('unit_id', targetUnitId)
          .order('full_name', { ascending: true });

        if (staffData && staffData.length > 0) loadedStaff = staffData;
      }

      const userAlreadyInList = loadedStaff.some((s) => s.id === user.id);
      if (!userAlreadyInList) {
        loadedStaff.unshift({
          id: user.id,
          full_name: profile?.full_name || user.email || 'Pegawai (Saya)',
          nip: profile?.nip || '-',
          role: profile?.role || 'STAF',
          unit_id: targetUnitId,
        });
      }

      setStaffList(loadedStaff);
      setSelectedPics([user.id]);

      let tplQuery = supabase.from('task_templates').select('*').order('title', { ascending: true });
      if (cleanTusi && cleanTusi !== 'UMUM') {
        tplQuery = tplQuery.ilike('tusi_type', cleanTusi);
      }

      const { data: tpl, error: tplError } = await tplQuery;
      if (!tplError && tpl) {
        setTemplates(tpl as TaskTemplate[]);
      }
    } catch (err: any) {
      console.error('Error inisialisasi formulir:', err);
    } finally {
      setLoading(false);
    }
  };

  const deduplicatedTemplates = useMemo(() => {
    const map = new Map<string, TaskTemplate>();
    for (const t of templates) {
      const normalizedKey = `${t.title.trim().toLowerCase()}_${t.period_type}_${t.category || 'TUSI'}`;
      if (!map.has(normalizedKey)) {
        map.set(normalizedKey, t);
      }
    }
    return Array.from(map.values());
  }, [templates]);

  const loadBroadcastStaff = async (scope: 'SEKSI' | 'KANTOR' | 'WILAYAH') => {
    setLoadingBroadcastStaff(true);
    try {
      let targetUnitIds: string[] = [];

      if (scope === 'SEKSI') {
        if (unitId) targetUnitIds = [unitId];
      } else if (scope === 'KANTOR') {
        const currentLevel = userUnitInfo?.level;
        const parentId = userUnitInfo?.parent_id;
        const officeId = currentLevel === 'SEKSI' && parentId ? parentId : unitId;

        const { data: childUnits } = await supabase
          .from('units')
          .select('id')
          .eq('parent_id', officeId);

        targetUnitIds = officeId ? [officeId, ...(childUnits || []).map((u) => u.id)] : [];
      }

      let query = supabase
        .from('profiles')
        .select('id, full_name, nip, role, unit:units(id, name, level)')
        .order('full_name', { ascending: true });

      if (scope !== 'WILAYAH' && targetUnitIds.length > 0) {
        query = query.in('unit_id', targetUnitIds);
      }

      const { data: staffData } = await query;
      if (staffData && staffData.length > 0) {
        setBroadcastStaffList(staffData as any[]);
      } else {
        setBroadcastStaffList(staffList);
      }
    } catch (err) {
      console.error('Error broadcast staff:', err);
      setBroadcastStaffList(staffList);
    } finally {
      setLoadingBroadcastStaff(false);
    }
  };

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) {
      setSaveAsTemplate(false);
      return;
    }

    setSaveAsTemplate(false);
    const tpl = templates.find((t) => t.id === templateId);
    if (tpl) {
      setTitle(tpl.title);
      if (tpl.category) setCategory(tpl.category);
      setDescription(tpl.description || '');

      if (tpl.regulations && Array.isArray(tpl.regulations) && tpl.regulations.length > 0) {
        setRegulations(tpl.regulations);
      } else if (tpl.legal_basis) {
        setRegulations([{ name: tpl.legal_basis, url: tpl.legal_basis_link || '' }]);
      } else {
        setRegulations([{ name: '', url: '' }]);
      }

      if (tpl.tools && Array.isArray(tpl.tools) && tpl.tools.length > 0) {
        setTools(tpl.tools);
      } else {
        setTools([]);
      }

      setPeriodType(tpl.period_type);
      setIsClericalRecurring(tpl.is_recurring ?? (tpl.period_type !== 'INSIDENTIL'));
      if (tpl.critical_days_threshold) setCriticalDaysThreshold(tpl.critical_days_threshold);
      if (tpl.deadline_rule) setDeadlineRule(tpl.deadline_rule as any);
      if (tpl.exact_day) {
        setExactDay(tpl.exact_day);
        setCustomDayInput(String(tpl.exact_day));
      }
    }
  };

  const handleAddRegulation = () => setRegulations((prev) => [...prev, { name: '', url: '' }]);
  const handleRemoveRegulation = (idx: number) => setRegulations((prev) => prev.filter((_, i) => i !== idx));
  const handleRegulationChange = (idx: number, field: 'name' | 'url', val: string) => {
    setRegulations((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const handleAddTool = () => setTools((prev) => [...prev, { name: '', url: '' }]);
  const handleRemoveTool = (idx: number) => setTools((prev) => prev.filter((_, i) => i !== idx));
  const handleToolChange = (idx: number, field: 'name' | 'url', val: string) => {
    setTools((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const togglePic = (picId: string) => {
    setSelectedPics((prev) =>
      prev.includes(picId) ? prev.filter((id) => id !== picId) : [...prev, picId]
    );
  };

  const toggleExclusion = (staffId: string) => {
    setExcludedPicIds((prev) =>
      prev.includes(staffId) ? prev.filter((id) => id !== staffId) : [...prev, staffId]
    );
  };

  // HANDLER SUB-TUGAS & PIC OPSIONAL
  const handleAddSubtask = () => setSubtasks((prev) => [...prev, { title: '', deadline: '', pic_id: '' }]);
  const handleRemoveSubtask = (index: number) => setSubtasks((prev) => prev.filter((_, i) => i !== index));
  const handleSubtaskTitleChange = (index: number, val: string) => {
    setSubtasks((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], title: val };
      return updated;
    });
  };
  const handleSubtaskDeadlineChange = (index: number, val: string) => {
    if (deadline && val && val > deadline) {
      alert(`Peringatan: Batas waktu tahapan (${val}) tidak boleh melebihi batas waktu tugas utama (${deadline}).`);
      return;
    }
    setSubtasks((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], deadline: val };
      return updated;
    });
  };
  const handleSubtaskPicChange = (index: number, picId: string) => {
    setSubtasks((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], pic_id: picId };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const activeUserId = userId;
    let activeUnitId = unitId;

    if (!activeUserId) {
      setErrorMessage('Sesi autentikasi telah berakhir. Harap login kembali.');
      return;
    }

    if (!activeUnitId) {
      const { data: fallbackUnit } = await supabase.from('units').select('id').limit(1).single();
      if (fallbackUnit) activeUnitId = fallbackUnit.id;
      else {
        setErrorMessage('Unit kerja belum terdaftar pada sistem.');
        return;
      }
    }

    if (!title.trim()) {
      setErrorMessage('Judul tugas wajib diisi.');
      return;
    }
    if (!deadline) {
      setErrorMessage('Tenggat waktu wajib ditentukan.');
      return;
    }

    for (const st of subtasks) {
      if (st.deadline && deadline && st.deadline > deadline) {
        setErrorMessage(`Tenggat tahapan "${st.title}" (${st.deadline}) melampaui batas akhir tugas utama (${deadline}).`);
        return;
      }
    }

    let finalPics: string[] = [];
    if (assignmentMode === 'BROADCAST') {
      finalPics = broadcastStaffList
        .filter((s) => !excludedPicIds.includes(s.id))
        .map((s) => s.id);

      if (finalPics.length === 0) {
        setErrorMessage('Tidak ada pegawai penerima tugas. Seluruh pegawai pada lingkup ini dikecualikan.');
        return;
      }
    } else {
      finalPics = selectedPics.length > 0 ? selectedPics : [activeUserId];
    }

    setSubmitting(true);

    try {
      let createdTemplateId = selectedTemplateId || null;

      const validRegulations = regulations.filter((r) => r.name.trim() || r.url.trim());
      const validTools = tools.filter((t) => t.name.trim() || t.url.trim());
      const primaryLegalBasis = validRegulations.length > 0 ? validRegulations[0].name : null;
      const primaryLegalBasisLink = validRegulations.length > 0 ? validRegulations[0].url : null;

      // 1. Simpan Master Tusi jika opsi dipilih
      if (saveAsTemplate && !createdTemplateId) {
        const { data: existingTpl } = await supabase
          .from('task_templates')
          .select('id')
          .ilike('title', title.trim())
          .ilike('tusi_type', userTusiType)
          .maybeSingle();

        if (existingTpl) {
          createdTemplateId = existingTpl.id;
        } else {
          const { data: newTpl } = await supabase
            .from('task_templates')
            .insert({
              tusi_type: userTusiType.toUpperCase(),
              title: title.trim(),
              category,
              description: description.trim() || null,
              legal_basis: primaryLegalBasis,
              legal_basis_link: primaryLegalBasisLink,
              regulations: validRegulations,
              tools: validTools,
              period_type: periodType,
              deadline_rule: deadlineMode === 'CUSTOM' || periodType === 'INSIDENTIL' ? 'MANUAL' : deadlineRule,
              exact_day: exactDay,
              critical_days_threshold: Number(criticalDaysThreshold) || 3,
              is_recurring: periodType !== 'INSIDENTIL' && isClericalRecurring,
              created_by_unit: activeUnitId
            })
            .select('id')
            .single();

          if (newTpl) createdTemplateId = newTpl.id;
        }
      }

      // 2. Simpan Tugas Utama
      const { data: newTask, error: taskError } = await supabase
        .from('tasks')
        .insert({
          unit_id: activeUnitId,
          template_id: createdTemplateId,
          title: title.trim(),
          category,
          description: description.trim() || null,
          legal_basis: primaryLegalBasis,
          legal_basis_link: primaryLegalBasisLink,
          regulations: validRegulations,
          tools: validTools,
          period_type: periodType,
          period_month: getPeriodMonthValue(),
          period_year: selectedYear,
          deadline,
          critical_days_threshold: Number(criticalDaysThreshold) || 3,
          priority,
          status: 'BELUM_DIKERJAKAN',
          progress_pct: 0,
          created_by: activeUserId,
        })
        .select('id')
        .single();

      if (taskError || !newTask) {
        throw new Error(taskError?.message || 'Gagal menyimpan tugas baru.');
      }

      const taskId = newTask.id;

      // 3. Simpan PIC Pelaksana Tugas Utama & Notifikasi
      if (finalPics.length > 0) {
        const picPayloads = finalPics.map((picUserId) => ({
          task_id: taskId,
          user_id: picUserId,
        }));
        await supabase.from('task_pics').insert(picPayloads);

        const notifPayloads = finalPics.map((picUserId) => ({
          user_id: picUserId,
          title: assignmentMode === 'BROADCAST' ? '📢 Penugasan Massal Satker' : '📋 Penugasan Tugas Baru',
          message: `Anda ditetapkan sebagai PIC untuk: "${title.trim()}". Batas tenggat: ${deadline}.`,
          action_link: `/tasks/${taskId}`,
          is_read: false,
        }));
        await supabase.from('notifications').insert(notifPayloads);
      }

      // 4. Simpan Subtasks & Subtask PICs (Opsional)
      const validSubtasks = subtasks.filter((s) => s.title.trim().length > 0);
      if (validSubtasks.length > 0) {
        for (const st of validSubtasks) {
          const { data: createdSubtask } = await supabase
            .from('subtasks')
            .insert({
              task_id: taskId,
              title: st.title.trim(),
              deadline: st.deadline || null,
              is_completed: false,
              evidence_link_type: 'INHERIT',
            })
            .select('id')
            .single();

          if (createdSubtask && st.pic_id) {
            await supabase.from('subtask_pics').insert({
              subtask_id: createdSubtask.id,
              user_id: st.pic_id,
            });
          }
        }
      }

      router.push('/tasks');
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat menyimpan tugas.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-sm text-stone-500">Menyiapkan formulir rekam tugas...</div>;
  }

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const filteredBroadcastStaff = broadcastStaffList.filter((s) =>
    s.full_name?.toLowerCase().includes(exclusionSearch.toLowerCase()) ||
    s.nip?.includes(exclusionSearch) ||
    (s.unit?.name && s.unit.name.toLowerCase().includes(exclusionSearch.toLowerCase()))
  );

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Link
          href="/tasks"
          className="p-2 rounded-xl border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Rekam Tugas Baru</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Daftarkan tugas tusi, petunjuk berstruktur daftar isi, multi-regulasi, tools, dan PIC tahapan.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Template Selector */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200/70 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-stone-800 font-semibold text-sm">
              <Sparkles className="w-4 h-4 text-[#DF3B68]" />
              <span>Pilih dari Master Bank Tusi (Opsional)</span>
            </div>
            <span className="text-[11px] text-stone-500 font-medium">
              Lingkup Seksi: <strong className="text-stone-800 font-bold">{userTusiType}</strong>
            </span>
          </div>

          <select
            value={selectedTemplateId}
            onChange={(e) => handleSelectTemplate(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20"
          >
            <option value="">-- Buat Tugas Mandiri Baru --</option>
            {deduplicatedTemplates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.title} ({tpl.category || 'TUSI'} - {tpl.period_type}) {tpl.is_recurring ? '• 🤖 Auto-Cycle' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Rincian Informasi Tugas */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200/70 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2 text-stone-800 font-bold text-sm">
              <FileText className="w-4 h-4 text-[#DF3B68]" />
              <span>Rincian Informasi Tugas</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!selectedTemplateId ? (
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-200 px-3 py-1.5 rounded-xl transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={saveAsTemplate}
                    onChange={(e) => setSaveAsTemplate(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-[#DF3B68] focus:ring-[#DF3B68] cursor-pointer"
                  />
                  <BookmarkPlus className="w-3.5 h-3.5 text-[#DF3B68]" />
                  <span>Simpan ke Master Katalog Tusi</span>
                </label>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Katalog Tusi Terpilih
                </span>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {/* Klasifikasi Jenis Pekerjaan */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#DF3B68]" />
                <span>Pilih Jenis Pekerjaan *</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  { id: 'TUSI', label: 'Tusi Pokok', desc: 'Sesuai regulasi & tusi unit' },
                  { id: 'TAMBAHAN', label: 'Tugas Tambahan', desc: 'Penugasan khusus / Pokja' },
                  { id: 'IMPROVISASI', label: 'Improvisasi', desc: 'Inovasi mandiri penunjang kerja' },
                ].map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setCategory(item.id as any)}
                    className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all ${
                      category === item.id
                        ? 'border-[#DF3B68] bg-[#DF3B68]/10 text-stone-900 font-bold'
                        : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{item.label}</span>
                      <div className={`w-3.5 h-3.5 rounded-full border ${category === item.id ? 'border-[#DF3B68] bg-[#DF3B68]' : 'border-stone-300'}`} />
                    </div>
                    <p className="text-[10px] text-stone-400 font-normal mt-0.5">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <Input
              label="Judul / Uraian Tugas *"
              placeholder="Contoh: Telaah LK-BLU Tahap IV"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            {/* MULTI-DASAR HUKUM */}
            <div className="p-4 bg-stone-50/70 rounded-2xl border border-stone-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-[#DF3B68]" />
                  <span>Dasar Hukum & Tautan Regulasi (Bisa Lebih Dari Satu)</span>
                </label>
                <button
                  type="button"
                  onClick={handleAddRegulation}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#DF3B68] hover:text-[#C72F58]"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Dasar Hukum
                </button>
              </div>

              <div className="space-y-2">
                {regulations.map((reg, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      placeholder="Nomor Regulasi (contoh: PER-28/PB/2019)"
                      value={reg.name}
                      onChange={(e) => handleRegulationChange(idx, 'name', e.target.value)}
                      className="w-full sm:w-1/2 px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs font-mono"
                    />
                    <div className="flex items-center gap-1.5 w-full sm:w-1/2">
                      <div className="relative flex-1">
                        <LinkIcon className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="url"
                          placeholder="https://jdih.kemenkeu.go.id/..."
                          value={reg.url}
                          onChange={(e) => handleRegulationChange(idx, 'url', e.target.value)}
                          className="w-full pl-8 pr-3 py-2 rounded-xl border border-stone-200 bg-white text-xs font-mono"
                        />
                      </div>
                      {regulations.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRegulation(idx)}
                          className="p-2 text-stone-400 hover:text-rose-500 rounded-lg hover:bg-rose-50"
                          title="Hapus regulasi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* MULTI-TOOLS & APLIKASI KERJA */}
            <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <Wrench className="w-4 h-4 text-emerald-600" />
                    <span>Tools & Alat Kerja / Kertas Kerja (Label: Tools)</span>
                  </label>
                  <p className="text-[11px] text-emerald-700/80 mt-0.5">
                    Tautkan aplikasi kedinasan atau spreadsheet kerja (misal: E-Rekon&LK, Sakti, Kertas Kerja BLU).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddTool}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Tools
                </button>
              </div>

              {tools.length === 0 ? (
                <p className="text-xs text-stone-400 italic">Belum ada tools ditambahkan. Klik tombol di atas jika diperlukan.</p>
              ) : (
                <div className="space-y-2">
                  {tools.map((tool, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        type="text"
                        placeholder="Nama Alat / Aplikasi (contoh: Aplikasi E-Rekon&LK)"
                        value={tool.name}
                        onChange={(e) => handleToolChange(idx, 'name', e.target.value)}
                        className="w-full sm:w-1/2 px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs font-semibold"
                      />
                      <div className="flex items-center gap-1.5 w-full sm:w-1/2">
                        <div className="relative flex-1">
                          <LinkIcon className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="url"
                            placeholder="https://erekon-lk.kemenkeu.go.id/..."
                            value={tool.url}
                            onChange={(e) => handleToolChange(idx, 'url', e.target.value)}
                            className="w-full pl-8 pr-3 py-2 rounded-xl border border-stone-200 bg-white text-xs font-mono"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveTool(idx)}
                          className="p-2 text-stone-400 hover:text-rose-500 rounded-lg hover:bg-rose-50"
                          title="Hapus tools"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* EDITOR DESKRIPSI H1 & DAFTAR ISI */}
            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#DF3B68]" />
                <span>Petunjuk Teknis & Deskripsi Tugas (Gunakan Tombol H1 / + Seksi Bab untuk membuat Daftar Isi)</span>
              </label>
              <RichTextEditor
                value={description}
                onChange={setDescription}
                placeholder="Tuliskan petunjuk teknis, formula IKU, ruang lingkup, dan waktu pelaksanaan secara rapi..."
              />
            </div>
          </div>

          {/* SIKLUS & TENGGAT */}
          <div className="bg-stone-50/80 p-5 rounded-2xl border border-stone-200/80 space-y-4">
            <div className="p-3.5 bg-white rounded-xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
                  <RotateCw className="w-3.5 h-3.5 text-[#DF3B68]" />
                  <span>Sifat Tugas & Otomasi Periode (Klerikal vs Non-Klerikal)</span>
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Tugas klerikal rutin akan digenerate otomatis oleh cron setiap awal siklus.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={periodType === 'INSIDENTIL'}
                  onClick={() => setIsClericalRecurring(true)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isClericalRecurring && periodType !== 'INSIDENTIL'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200 disabled:opacity-40'
                  }`}
                >
                  <span>🤖 Klerikal (Auto-Generate)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsClericalRecurring(false)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    !isClericalRecurring || periodType === 'INSIDENTIL'
                      ? 'bg-stone-800 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  <span>✋ Non-Klerikal (Manual)</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Jenis Siklus Pekerjaan *</label>
                <select
                  value={periodType}
                  onChange={(e) => setPeriodType(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-stone-800"
                >
                  <option value="TRIWULANAN">Triwulanan (TW I s.d. TW IV)</option>
                  <option value="BULANAN">Bulanan (Rutin)</option>
                  <option value="SEMESTERAN">Semesteran (Semester I & II)</option>
                  <option value="TAHUNAN">Tahunan</option>
                  <option value="INSIDENTIL">Insidentil (Ad-Hoc / Non-Klerikal)</option>
                </select>
              </div>

              {periodType === 'TRIWULANAN' && (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Pilih Triwulan Tugas *</label>
                  <select
                    value={selectedQuarter}
                    onChange={(e) => setSelectedQuarter(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-stone-800"
                  >
                    <option value={1}>Triwulan I (Januari - Maret)</option>
                    <option value={2}>Triwulan II (April - Juni)</option>
                    <option value={3}>Triwulan III (Juli - September)</option>
                    <option value={4}>Triwulan IV (Oktober - Desember)</option>
                  </select>
                </div>
              )}

              {periodType === 'SEMESTERAN' && (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Pilih Semester Tugas *</label>
                  <select
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-stone-800"
                  >
                    <option value={1}>Semester I (Januari - Juni)</option>
                    <option value={2}>Semester II (Juli - Desember)</option>
                  </select>
                </div>
              )}

              {periodType === 'BULANAN' && (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Pilih Bulan Tugas *</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-stone-800"
                  >
                    {monthNames.map((m, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        Bulan {m}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {periodType !== 'INSIDENTIL' ? (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Tahun Anggaran *</label>
                  <input
                    type="number"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-stone-800"
                  />
                </div>
              ) : (
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Tenggat Waktu Pekerjaan *</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs font-mono font-medium"
                  />
                </div>
              )}
            </div>

            {/* Pilihan Fleksibilitas Tenggat Lintas Bulan */}
            {periodType !== 'INSIDENTIL' && (
              <div className="pt-3 border-t border-stone-200/60 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#DF3B68]" />
                    <span className="text-xs font-bold text-stone-800">Mode Penetapan Tenggat Waktu:</span>
                  </div>

                  <div className="flex items-center bg-stone-200/60 p-1 rounded-xl text-xs">
                    <button
                      type="button"
                      onClick={() => setDeadlineMode('FORMULA')}
                      className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                        deadlineMode === 'FORMULA' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      Otomatis Rumus (M+1 / Akhir Periode)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeadlineMode('CUSTOM')}
                      className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                        deadlineMode === 'CUSTOM' ? 'bg-[#DF3B68] text-white shadow-xs' : 'text-stone-600 hover:text-[#DF3B68]'
                      }`}
                    >
                      Kustom Bebas
                    </button>
                  </div>
                </div>

                {deadlineMode === 'FORMULA' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-medium text-stone-600 mb-1">1. Posisi Bulan Batas:</label>
                      <select
                        value={deadlineRule}
                        onChange={(e) => setDeadlineRule(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs"
                      >
                        <option value="NEXT_MONTH_DATE">Bulan Berikutnya Setelah Periode Berakhir (M+1)</option>
                        <option value="END_OF_PERIOD">Bulan Terakhir Periode Berkenaan</option>
                        <option value="SAME_MONTH_DATE">Bulan Pertama / Awal Periode</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-stone-600 mb-1">2. Penetapan Tanggal:</label>
                      <div className="flex gap-2">
                        <select
                          value={exactDay === 31 ? '31' : [5, 10, 15, 20, 25].includes(exactDay) ? String(exactDay) : 'CUSTOM'}
                          onChange={(e) => {
                            if (e.target.value === 'CUSTOM') {
                              setExactDay(15);
                              setCustomDayInput('15');
                            } else {
                              const val = Number(e.target.value);
                              setExactDay(val);
                              setCustomDayInput(String(val));
                            }
                          }}
                          className="w-1/2 px-2.5 py-2 rounded-xl border border-stone-200 bg-white text-xs"
                        >
                          <option value="31">Akhir Bulan (Max)</option>
                          <option value="5">Tanggal 5</option>
                          <option value="10">Tanggal 10</option>
                          <option value="15">Tanggal 15</option>
                          <option value="20">Tanggal 20</option>
                          <option value="25">Tanggal 25</option>
                          <option value="CUSTOM">Bebas (Input Manual)</option>
                        </select>

                        <input
                          type="number"
                          min={1}
                          max={31}
                          placeholder="Tgl 1-31"
                          value={customDayInput}
                          onChange={(e) => {
                            setCustomDayInput(e.target.value);
                            const val = Number(e.target.value);
                            if (val >= 1 && val <= 31) setExactDay(val);
                          }}
                          className="w-1/2 px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs font-mono text-center"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-2">
                    <label className="block text-xs font-semibold text-stone-700">
                      Tentukan Tanggal Jatuh Tempo Bebas:
                    </label>
                    <input
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      required
                      className="w-full sm:w-64 px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs font-mono font-medium focus:ring-2 focus:ring-[#DF3B68]/20"
                    />
                  </div>
                )}

                <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl text-emerald-800 text-xs font-bold">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tenggat Akhir Ditetapkan: {deadline || '-'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Konfigurasi Ambang Masa Kritis & Prioritas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
              <label className="block text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <BellRing className="w-4 h-4 text-[#DF3B68]" />
                <span>Peringatan Masa Kritis & WhatsApp (H-X) *</span>
              </label>
              <div className="flex items-center gap-2 pt-1">
                {[1, 3, 7, 14].map((days) => (
                  <button
                    type="button"
                    key={days}
                    onClick={() => setCriticalDaysThreshold(days)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      criticalDaysThreshold === days
                        ? 'bg-[#DF3B68] text-white shadow-xs'
                        : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    H-{days}
                  </button>
                ))}

                <div className="flex items-center gap-1 ml-auto">
                  <span className="text-xs text-stone-500 font-medium">Kustom:</span>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={criticalDaysThreshold}
                    onChange={(e) => setCriticalDaysThreshold(Number(e.target.value))}
                    className="w-16 px-2 py-1 rounded-lg border border-stone-200 bg-white text-xs font-bold text-center text-rose-700"
                  />
                  <span className="text-xs text-stone-400">hari</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
              <label className="block text-xs font-bold text-stone-800">Tingkat Prioritas Tugas</label>
              <div className="flex gap-2 pt-1">
                {[
                  { id: 'RENDAH', label: 'Rendah', style: 'peer-checked:bg-stone-200 peer-checked:text-stone-800' },
                  { id: 'SEDANG', label: 'Sedang', style: 'peer-checked:bg-amber-100 peer-checked:text-amber-800 peer-checked:border-amber-300' },
                  { id: 'TINGGI', label: 'Tinggi', style: 'peer-checked:bg-rose-100 peer-checked:text-rose-800 peer-checked:border-rose-300' },
                ].map((p) => (
                  <label key={p.id} className="cursor-pointer flex-1">
                    <input
                      type="radio"
                      name="priority"
                      value={p.id}
                      checked={priority === p.id}
                      onChange={() => setPriority(p.id as any)}
                      className="peer sr-only"
                    />
                    <div className={`p-2 text-center text-xs font-semibold rounded-xl border border-stone-200 bg-white text-stone-500 transition-all ${p.style}`}>
                      {p.label}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* PIC PELAKSANA UTAMA */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200/70 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2 text-stone-800 font-bold text-sm">
              <Users className="w-4 h-4 text-[#DF3B68]" />
              <span>Tetapkan PIC Pelaksana Utama</span>
            </div>

            <div className="flex items-center bg-stone-100 p-1 rounded-2xl border border-stone-200">
              <button
                type="button"
                onClick={() => setAssignmentMode('MANUAL')}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                  assignmentMode === 'MANUAL'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                Penugasan Manual
              </button>
              <button
                type="button"
                onClick={() => setAssignmentMode('BROADCAST')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  assignmentMode === 'BROADCAST'
                    ? 'bg-[#DF3B68] text-white shadow-xs'
                    : 'text-stone-600 hover:text-[#DF3B68]'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Broadcast Massal</span>
              </button>
            </div>
          </div>

          {assignmentMode === 'MANUAL' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span>Pilih satu atau beberapa pegawai pelaksana:</span>
                <span className="font-semibold text-stone-700">{selectedPics.length} pegawai dipilih</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-52 overflow-y-auto pr-1">
                {staffList.map((staff) => {
                  const isChecked = selectedPics.includes(staff.id);
                  return (
                    <div
                      key={staff.id}
                      onClick={() => togglePic(staff.id)}
                      className={`p-3 rounded-2xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                        isChecked
                          ? 'border-[#DF3B68]/40 bg-rose-50/40 text-stone-900'
                          : 'border-stone-200/80 bg-white text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <p className="font-semibold truncate">{staff.full_name}</p>
                        <p className="text-[10px] text-stone-400">NIP. {staff.nip} • {staff.role}</p>
                      </div>
                      <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${isChecked ? 'bg-[#DF3B68] border-[#DF3B68] text-white' : 'border-stone-300'}`}>
                        {isChecked && <CheckCircle2 className="w-3 h-3" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {assignmentMode === 'BROADCAST' && (
            <div className="space-y-4 bg-stone-50/70 p-4 sm:p-5 rounded-2xl border border-stone-200">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-[#DF3B68]" />
                    <span>Pilih Lingkup Instansi Target Broadcast:</span>
                  </label>
                  <span className="text-[11px] font-semibold text-stone-500">
                    Total: {broadcastStaffList.length} Pegawai
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setBroadcastScope('SEKSI')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                      broadcastScope === 'SEKSI'
                        ? 'border-[#DF3B68] bg-[#DF3B68]/10 text-[#DF3B68]'
                        : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    🏢 Satu Seksi ({userTusiType})
                  </button>

                  <button
                    type="button"
                    onClick={() => setBroadcastScope('KANTOR')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                      broadcastScope === 'KANTOR'
                        ? 'border-[#DF3B68] bg-[#DF3B68]/10 text-[#DF3B68]'
                        : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    🏛️ Satu Kantor (Seluruh Seksi KPPN)
                  </button>

                  <button
                    type="button"
                    onClick={() => setBroadcastScope('WILAYAH')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                      broadcastScope === 'WILAYAH'
                        ? 'border-[#DF3B68] bg-[#DF3B68]/10 text-[#DF3B68]'
                        : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    🌐 Seluruh Wilayah (Semua KPPN & Kanwil)
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white rounded-xl border border-stone-200 text-xs">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>
                    Penerima: <strong className="text-emerald-700 font-bold">{broadcastStaffList.length - excludedPicIds.length}</strong> pegawai
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <UserX className="w-4 h-4 text-rose-500" />
                  <span>
                    Dikecualikan: <strong className="text-rose-600 font-bold">{excludedPicIds.length}</strong> pegawai
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <p className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <UserX className="w-3.5 h-3.5 text-rose-500" />
                    <span>Daftar Pengecualian Pegawai:</span>
                  </p>
                  
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Cari nama / NIP untuk dikecualikan..."
                      value={exclusionSearch}
                      onChange={(e) => setExclusionSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-[#DF3B68]"
                    />
                  </div>
                </div>

                {loadingBroadcastStaff ? (
                  <div className="py-6 text-center text-xs text-stone-400">Memuat data pegawai...</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                    {filteredBroadcastStaff.map((staff) => {
                      const isExcluded = excludedPicIds.includes(staff.id);
                      return (
                        <div
                          key={staff.id}
                          onClick={() => toggleExclusion(staff.id)}
                          className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                            isExcluded
                              ? 'border-rose-300 bg-rose-50/60 text-stone-400'
                              : 'border-stone-200 bg-white text-stone-800 hover:bg-stone-50'
                          }`}
                        >
                          <div className="truncate pr-2">
                            <p className={`font-semibold truncate ${isExcluded ? 'line-through text-stone-400' : 'text-stone-900'}`}>
                              {staff.full_name}
                            </p>
                            <p className="text-[10px] text-stone-400">
                              {staff.role} • {staff.unit?.name || 'Unit'}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isExcluded ? (
                              <span className="text-[10px] font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-md border border-rose-200">
                                Dikecualikan
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                Menerima
                              </span>
                            )}
                            <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${isExcluded ? 'bg-rose-500 border-rose-500 text-white' : 'border-stone-300'}`}>
                              {isExcluded && <CheckCircle2 className="w-3 h-3" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* SUBTASKS DENGAN FITUR PEMILIHAN PIC OPSIONAL */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200/70 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <div className="flex items-center gap-2 text-stone-800 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 text-[#DF3B68]" />
                <span>Tahapan Sub-Pekerjaan & PIC Pelaksana (Opsional)</span>
              </div>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Pilih PIC untuk tiap tahapan jika tugas dibagi per pegawai. Jika tidak dipilih, dapat ditentukan nanti.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddSubtask}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#DF3B68] hover:text-[#C72F58]"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah Tahapan
            </button>
          </div>

          <div className="space-y-2.5">
            {subtasks.map((st, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 bg-stone-50/70 rounded-2xl border border-stone-200">
                <span className="text-xs font-semibold text-stone-400 w-5 text-left">{idx + 1}.</span>
                <input
                  type="text"
                  placeholder={`Uraian sub-tahapan ke-${idx + 1}...`}
                  value={st.title}
                  onChange={(e) => handleSubtaskTitleChange(idx, e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20"
                />

                {/* DROPDOWN PEMILIH PIC TAHAPAN (OPSIONAL) */}
                <div className="relative">
                  <select
                    value={st.pic_id || ''}
                    onChange={(e) => handleSubtaskPicChange(idx, e.target.value)}
                    className="w-full sm:w-44 px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs font-medium text-stone-700 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20"
                  >
                    <option value="">-- Tanpa PIC (Kosong) --</option>
                    {staffList.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-stone-500 whitespace-nowrap">Batas:</span>
                  <input
                    type="date"
                    max={deadline || undefined}
                    value={st.deadline || ''}
                    onChange={(e) => handleSubtaskDeadlineChange(idx, e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl border border-stone-200 bg-white text-xs font-mono"
                  />
                  {subtasks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSubtask(idx)}
                      className="p-1.5 text-stone-400 hover:text-rose-500 rounded-lg hover:bg-rose-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/tasks"
            className="px-5 py-2.5 rounded-full border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-medium"
          >
            Batal
          </Link>
          <Button
            type="submit"
            isLoading={submitting}
            className="bg-[#DF3B68] hover:bg-[#C72F58] text-white px-7 py-2.5 rounded-full shadow-sm text-xs font-semibold"
          >
            Simpan & Terbitkan Tugas
          </Button>
        </div>
      </form>
    </div>
  );
}
