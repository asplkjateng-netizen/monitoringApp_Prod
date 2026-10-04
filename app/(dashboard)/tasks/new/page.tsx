'use client';

import { useState, useEffect } from 'react';
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
  Building
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface StaffProfile {
  id: string;
  full_name: string;
  nip: string;
  role: string;
  unit?: {
    id: string;
    name: string;
    level: string;
  };
}

interface TaskTemplate {
  id: string;
  title: string;
  description: string | null;
  legal_basis: string | null;
  period_type: 'BULANAN' | 'TRIWULANAN' | 'SEMESTERAN' | 'TAHUNAN' | 'INSIDENTIL';
  deadline_rule?: string;
  exact_day?: number;
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
  
  // Kewenangan Broadcast
  const [canBroadcast, setCanBroadcast] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Sumber data pendukung
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);

  // State Form Pokok
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [saveAsTemplate, setSaveAsTemplate] = useState<boolean>(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [legalBasis, setLegalBasis] = useState('');
  const [periodType, setPeriodType] = useState<'BULANAN' | 'TRIWULANAN' | 'SEMESTERAN' | 'TAHUNAN' | 'INSIDENTIL'>('TRIWULANAN');
  
  // State Pemilih Periode Spesifik
  const [selectedQuarter, setSelectedQuarter] = useState<number>(1);
  const [selectedSemester, setSelectedSemester] = useState<number>(1);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Aturan Siklus Fleksibel
  const [deadlineRule, setDeadlineRule] = useState<'END_OF_PERIOD' | 'NEXT_MONTH_DATE' | 'SAME_MONTH_DATE'>('NEXT_MONTH_DATE');
  const [exactDay, setExactDay] = useState<number>(15);
  const [customDayInput, setCustomDayInput] = useState<string>('15');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<'TINGGI' | 'SEDANG' | 'RENDAH'>('SEDANG');

  // MODE PENUGASAN (MANUAL vs BROADCAST)
  const [assignmentMode, setAssignmentMode] = useState<'MANUAL' | 'BROADCAST'>('MANUAL');
  const [broadcastScope, setBroadcastScope] = useState<'SEKSI' | 'KANTOR' | 'WILAYAH'>('SEKSI');
  const [broadcastStaffList, setBroadcastStaffList] = useState<StaffProfile[]>([]);
  const [excludedPicIds, setExcludedPicIds] = useState<string[]>([]);
  const [exclusionSearch, setExclusionSearch] = useState('');
  const [loadingBroadcastStaff, setLoadingBroadcastStaff] = useState(false);

  // Multi-PIC Manual & Subtasks
  const [selectedPics, setSelectedPics] = useState<string[]>([]);
  const [subtasks, setSubtasks] = useState<string[]>(['']);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (periodType !== 'INSIDENTIL') {
      calculateRecurringDeadline();
    }
  }, [periodType, selectedQuarter, selectedSemester, selectedMonth, selectedYear, deadlineRule, exactDay]);

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
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    setUserId(user.id);

    // Ambil profil user
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, role, is_unit_admin, unit_id, unit:units(id, name, level, parent_id, tusi_type)')
      .eq('id', user.id)
      .single();

    if (profile) {
      const uId = profile.unit_id;
      setUnitId(uId);
      setUserUnitInfo(profile.unit);
      const tusi = (profile.unit as any)?.tusi_type || 'UMUM';
      setUserTusiType(tusi);

      const roleUpper = String(profile.role || '').toUpperCase();
      const adminFlag = roleUpper === 'SUPER_ADMIN';
      const isLeader = ['KEPALA_UNIT', 'KEPALA_SEKSI'].includes(roleUpper) || profile.is_unit_admin === true || (profile.unit as any)?.level === 'ESELON_II';

      setIsSuperAdmin(adminFlag);
      setCanBroadcast(adminFlag || isLeader || true); // Izinkan broadcast untuk PIC

      // Ambil daftar pegawai di unit ini (termasuk fallback jika belum ada pegawai lain)
      let { data: staff } = await supabase
        .from('profiles')
        .select('id, full_name, nip, role')
        .eq('unit_id', uId)
        .order('full_name', { ascending: true });

      if (!staff || staff.length === 0) {
        // Fallback: sertakan setidaknya profil user sendiri
        staff = [{
          id: profile.id,
          full_name: profile.full_name || 'Pegawai',
          nip: (profile as any).nip || '-',
          role: profile.role || 'STAF',
        }];
      }

      setStaffList(staff);
      setSelectedPics([user.id]);

      // Ambil master tusi
      const { data: tpl } = await supabase
        .from('task_templates')
        .select('*')
        .order('title', { ascending: true });

      if (tpl) setTemplates(tpl);
    }

    setLoading(false);
  };

  // Muat daftar seluruh pegawai untuk penugasan massal
  const loadBroadcastStaff = async (scope: 'SEKSI' | 'KANTOR' | 'WILAYAH') => {
    setLoadingBroadcastStaff(true);
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

      targetUnitIds = [officeId, ...(childUnits || []).map((u) => u.id)];
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
    } else if (staffList.length > 0) {
      setBroadcastStaffList(staffList);
    }
    setLoadingBroadcastStaff(false);
  };

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) {
      setSaveAsTemplate(true);
      return;
    }

    setSaveAsTemplate(false);
    const tpl = templates.find((t) => t.id === templateId);
    if (tpl) {
      setTitle(tpl.title);
      setDescription(tpl.description || '');
      setLegalBasis(tpl.legal_basis || '');
      setPeriodType(tpl.period_type);
      if (tpl.deadline_rule) {
        setDeadlineRule(tpl.deadline_rule as any);
      }
      if (tpl.exact_day) {
        setExactDay(tpl.exact_day);
        setCustomDayInput(String(tpl.exact_day));
      }
    }
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

  const handleAddSubtask = () => setSubtasks((prev) => [...prev, '']);
  const handleRemoveSubtask = (index: number) => setSubtasks((prev) => prev.filter((_, i) => i !== index));
  const handleSubtaskChange = (index: number, value: string) => {
    setSubtasks((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!unitId || !userId) {
      setErrorMessage('Sesi kerja tidak valid. Harap muat ulang halaman.');
      return;
    }
    if (!title.trim()) {
      setErrorMessage('Judul tugas wajib diisi.');
      return;
    }
    if (!deadline) {
      setErrorMessage('Tenggat waktu wajib ditentukan.');
      return;
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
      finalPics = selectedPics.length > 0 ? selectedPics : [userId];
    }

    setSubmitting(true);

    try {
      let createdTemplateId = selectedTemplateId || null;

      if (saveAsTemplate && !createdTemplateId) {
        const { data: newTpl, error: tplError } = await supabase
          .from('task_templates')
          .insert({
            tusi_type: userTusiType,
            title: title.trim(),
            description: description.trim() || null,
            legal_basis: legalBasis.trim() || null,
            period_type: periodType,
            deadline_rule: periodType === 'INSIDENTIL' ? 'MANUAL' : deadlineRule,
            exact_day: exactDay,
            is_recurring: periodType !== 'INSIDENTIL',
            created_by_unit: unitId
          })
          .select('id')
          .single();

        if (!tplError && newTpl) {
          createdTemplateId = newTpl.id;
        }
      }

      const { data: newTask, error: taskError } = await supabase
        .from('tasks')
        .insert({
          unit_id: unitId,
          template_id: createdTemplateId,
          title: title.trim(),
          description: description.trim() || null,
          legal_basis: legalBasis.trim() || null,
          period_type: periodType,
          period_month: getPeriodMonthValue(),
          period_year: selectedYear,
          deadline,
          priority,
          status: 'BELUM_DIKERJAKAN',
          progress_pct: 0,
          created_by: userId,
        })
        .select('id')
        .single();

      if (taskError || !newTask) {
        throw new Error(taskError?.message || 'Gagal menyimpan tugas baru.');
      }

      const taskId = newTask.id;

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

      const validSubtasks = subtasks.map((s) => s.trim()).filter((s) => s.length > 0);
      if (validSubtasks.length > 0) {
        const subtaskPayloads = validSubtasks.map((stTitle) => ({
          task_id: taskId,
          title: stTitle,
          is_completed: false,
          evidence_link_type: 'INHERIT',
        }));
        await supabase.from('subtasks').insert(subtaskPayloads);
      }

      router.push('/tasks');
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem.');
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
    <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
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
            Daftarkan tugas klerikal berkala, penugasan massal satker, atau pekerjaan insidentil.
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
          <div className="flex items-center gap-2 text-stone-800 font-semibold text-sm">
            <Sparkles className="w-4 h-4 text-[#DF3B68]" />
            <span>Pilih dari Master Bank Tusi (Opsional)</span>
          </div>
          <select
            value={selectedTemplateId}
            onChange={(e) => handleSelectTemplate(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20"
          >
            <option value="">-- Buat Tugas Mandiri Baru --</option>
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.title} ({tpl.period_type})
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
              {periodType !== 'INSIDENTIL' && (
                <span className="text-[11px] font-semibold text-[#DF3B68] bg-rose-50 border border-rose-200 px-3 py-1 rounded-xl">
                  Otomasi Pembangkitan Rutin Aktif
                </span>
              )}

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
            <Input
              label="Judul / Uraian Tugas *"
              placeholder="Contoh: Rekonsiliasi Laporan Keuangan UAKPA"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <div className="space-y-1 text-left">
              <label className="block text-xs font-semibold text-stone-600">Dasar Hukum / Regulasi</label>
              <input
                type="text"
                placeholder="Contoh: PER-5/PB/2024, ND Dit. APK"
                value={legalBasis}
                onChange={(e) => setLegalBasis(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20"
              />
            </div>

            <div className="space-y-1 text-left">
              <label className="block text-xs font-semibold text-stone-600">Deskripsi / Petunjuk Teknis</label>
              <textarea
                rows={3}
                placeholder="Rincian prosedur teknis pelaksanaan..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20 resize-none"
              />
            </div>
          </div>

          {/* Konfigurasi Siklus & Formula */}
          <div className="bg-stone-50/80 p-5 rounded-2xl border border-stone-200/80 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Jenis Siklus Pekerjaan *</label>
                <select
                  value={periodType}
                  onChange={(e) => setPeriodType(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-stone-800 focus:ring-2 focus:ring-[#DF3B68]/20"
                >
                  <option value="TRIWULANAN">Triwulanan (TW I s.d. TW IV)</option>
                  <option value="BULANAN">Bulanan (Klerikal Rutin)</option>
                  <option value="SEMESTERAN">Semesteran (Semester I & II)</option>
                  <option value="TAHUNAN">Tahunan</option>
                  <option value="INSIDENTIL">Insidentil (Ad-Hoc / Sekali Jalan)</option>
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

            {periodType !== 'INSIDENTIL' && (
              <div className="pt-3 border-t border-stone-200/60 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
                    <Clock className="w-4 h-4 text-[#DF3B68]" />
                    <span>Formula Penentuan Batas Waktu:</span>
                  </div>

                  <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl text-emerald-800 text-xs font-bold self-start sm:self-auto">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tenggat: {deadline || '-'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              </div>
            )}
          </div>

          {/* Prioritas */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-2">Tingkat Prioritas</label>
            <div className="flex gap-3">
              {[
                { id: 'RENDAH', label: 'Rendah', style: 'peer-checked:bg-stone-100 peer-checked:text-stone-800' },
                { id: 'SEDANG', label: 'Sedang', style: 'peer-checked:bg-amber-50 peer-checked:text-amber-800 peer-checked:border-amber-300' },
                { id: 'TINGGI', label: 'Tinggi', style: 'peer-checked:bg-rose-50 peer-checked:text-rose-800 peer-checked:border-rose-300' },
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
                  <div className={`p-2 text-center text-xs font-semibold rounded-xl border border-stone-200 text-stone-500 transition-all ${p.style}`}>
                    {p.label}
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* PIC PELAKSANA DENGAN SWITCHER KHUSUS ADMIN */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200/70 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2 text-stone-800 font-bold text-sm">
              <Users className="w-4 h-4 text-[#DF3B68]" />
              <span>Tetapkan PIC Pelaksana</span>
            </div>

            {/* SWITCHER KHUSUS ADMIN & PIC */}
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

          {/* OPSI 1: PENUGASAN MANUAL */}
          {assignmentMode === 'MANUAL' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span>Pilih satu atau beberapa pegawai pelaksana di unit Anda:</span>
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

          {/* OPSI 2: BROADCAST MASSAL */}
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

              {/* Status Ringkasan Broadcast */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white rounded-xl border border-stone-200 text-xs">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>
                    Penerima Tugas: <strong className="text-emerald-700 font-bold">{broadcastStaffList.length - excludedPicIds.length}</strong> pegawai
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <UserX className="w-4 h-4 text-rose-500" />
                  <span>
                    Dikecualikan: <strong className="text-rose-600 font-bold">{excludedPicIds.length}</strong> pegawai
                  </span>
                </div>
              </div>

              {/* Daftar Pengecualian Pegawai */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <p className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <UserX className="w-3.5 h-3.5 text-rose-500" />
                    <span>Daftar Pengecualian Pegawai (Centang untuk mengecualikan):</span>
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

        {/* Sub-Pekerjaan Awal */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200/70 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2 text-stone-800 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 text-[#DF3B68]" />
              <span>Tahapan Sub-Pekerjaan Awal (Opsional)</span>
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
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs font-semibold text-stone-400 w-5 text-right">{idx + 1}.</span>
                <input
                  type="text"
                  placeholder={`Uraian sub-tahapan ke-${idx + 1}`}
                  value={st}
                  onChange={(e) => handleSubtaskChange(idx, e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20"
                />
                {subtasks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSubtask(idx)}
                    className="p-2 text-stone-400 hover:text-rose-500 rounded-lg hover:bg-rose-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
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
