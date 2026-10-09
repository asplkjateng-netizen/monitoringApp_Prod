'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  CheckCircle2, 
  FileText, 
  Users, 
  AlertCircle, 
  Save, 
  Loader2, 
  Link as LinkIcon, 
  BellRing, 
  Tag,
  Plus,
  Trash2,
  BookOpen,
  Wrench
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/ui/rich-text-editor';

interface LinkItem {
  name: string;
  url: string;
}

export default function EditTaskPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params?.id as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'TUSI' | 'TAMBAHAN' | 'IMPROVISASI'>('TUSI');
  
  // State Multi-Regulasi & Tools
  const [regulations, setRegulations] = useState<LinkItem[]>([{ name: '', url: '' }]);
  const [tools, setTools] = useState<LinkItem[]>([]);

  const [periodType, setPeriodType] = useState<string>('BULANAN');
  const [periodMonth, setPeriodMonth] = useState<number>(1);
  const [periodYear, setPeriodYear] = useState<number>(new Date().getFullYear());
  const [deadline, setDeadline] = useState('');
  const [criticalDaysThreshold, setCriticalDaysThreshold] = useState<number>(3);
  const [priority, setPriority] = useState<string>('SEDANG');

  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedPics, setSelectedPics] = useState<string[]>([]);

  useEffect(() => {
    if (taskId) loadTaskAndStaff();
  }, [taskId]);

  const loadTaskAndStaff = async () => {
    setLoading(true);

    const { data: task, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (error || !task) {
      setErrorMessage('Tugas tidak ditemukan.');
      setLoading(false);
      return;
    }

    setTitle(task.title);
    setDescription(task.description || '');
    setCategory(task.category || 'TUSI');
    
    // Load Multi-Regulasi (Fallback ke data lama)
    if (task.regulations && Array.isArray(task.regulations) && task.regulations.length > 0) {
      setRegulations(task.regulations);
    } else if (task.legal_basis) {
      setRegulations([{ name: task.legal_basis, url: task.legal_basis_link || '' }]);
    } else {
      setRegulations([{ name: '', url: '' }]);
    }

    // Load Tools
    if (task.tools && Array.isArray(task.tools) && task.tools.length > 0) {
      setTools(task.tools);
    } else {
      setTools([]);
    }

    setPeriodType(task.period_type);
    setPeriodMonth(task.period_month || 1);
    setPeriodYear(task.period_year);
    setDeadline(task.deadline);
    setCriticalDaysThreshold(task.critical_days_threshold || 3);
    setPriority(task.priority);

    const { data: staff } = await supabase
      .from('profiles')
      .select('id, full_name, nip, role')
      .eq('unit_id', task.unit_id)
      .eq('approval_status', 'APPROVED');

    if (staff) setStaffList(staff);

    const { data: currentPics } = await supabase
      .from('task_pics')
      .select('user_id')
      .eq('task_id', taskId);

    if (currentPics) setSelectedPics(currentPics.map((p) => p.user_id));

    setLoading(false);
  };

  // Handler Multi-Regulasi
  const handleAddRegulation = () => setRegulations((prev) => [...prev, { name: '', url: '' }]);
  const handleRemoveRegulation = (idx: number) => setRegulations((prev) => prev.filter((_, i) => i !== idx));
  const handleRegulationChange = (idx: number, field: 'name' | 'url', val: string) => {
    setRegulations((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  // Handler Tools
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setErrorMessage('Judul tugas wajib diisi.');
    if (!deadline) return setErrorMessage('Tenggat waktu wajib ditentukan.');

    setSubmitting(true);
    setErrorMessage('');

    try {
      const validRegulations = regulations.filter((r) => r.name.trim() || r.url.trim());
      const validTools = tools.filter((t) => t.name.trim() || t.url.trim());
      const primaryLegalBasis = validRegulations.length > 0 ? validRegulations[0].name : null;
      const primaryLegalBasisLink = validRegulations.length > 0 ? validRegulations[0].url : null;

      const { data: existingPicsData } = await supabase
        .from('task_pics')
        .select('user_id')
        .eq('task_id', taskId);
      
      const previousPicIds = (existingPicsData || []).map((p) => p.user_id);

      const { error: taskError } = await supabase
        .from('tasks')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          category,
          legal_basis: primaryLegalBasis,
          legal_basis_link: primaryLegalBasisLink,
          regulations: validRegulations,
          tools: validTools,
          period_type: periodType as any,
          period_month: periodMonth,
          period_year: periodYear,
          deadline,
          critical_days_threshold: Number(criticalDaysThreshold) || 3,
          priority: priority as any,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId);

      if (taskError) throw taskError;

      // Update Relasi Multi-PIC
      await supabase.from('task_pics').delete().eq('task_id', taskId);

      if (selectedPics.length > 0) {
        const picPayloads = selectedPics.map((uid) => ({
          task_id: taskId,
          user_id: uid,
        }));
        await supabase.from('task_pics').insert(picPayloads);

        const newlyAddedPics = selectedPics.filter((id) => !previousPicIds.includes(id));
        if (newlyAddedPics.length > 0) {
          const notifs = newlyAddedPics.map((uid) => ({
            user_id: uid,
            title: '📋 Penugasan PIC Tugas',
            message: `Anda ditambahkan sebagai PIC pada tugas: "${title.trim()}". Batas tenggat: ${deadline}.`,
            action_link: `/tasks/${taskId}`,
            is_read: false,
          }));
          await supabase.from('notifications').insert(notifs);
        }
      }

      router.push(`/tasks/${taskId}`);
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal memperbarui rincian tugas.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-sm text-stone-500">Memuat formulir edit...</div>;
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Link
          href={`/tasks/${taskId}`}
          className="p-2 rounded-xl border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Edit Rincian Tugas</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Perbarui format deskripsi, multi-regulasi, link tools, masa kritis, dan PIC pelaksana.
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
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200/70 shadow-sm space-y-5">
          <div className="flex items-center gap-2 text-stone-800 font-bold text-sm border-b border-stone-100 pb-3">
            <FileText className="w-4 h-4 text-[#DF3B68]" />
            <span>Rincian Pokok Tugas</span>
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
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            {/* Input Multi-Dasar Hukum */}
            <div className="p-4 bg-stone-50/70 rounded-2xl border border-stone-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-[#DF3B68]" />
                  <span>Dasar Hukum & Tautan Regulasi</span>
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
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Input Tools & Dokumen Kerja */}
            <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <Wrench className="w-4 h-4 text-emerald-600" />
                    <span>Tools & Alat Kerja / Dokumen Pendukung (Label: Tools)</span>
                  </label>
                  <p className="text-[11px] text-emerald-700/80 mt-0.5">
                    Tautkan aplikasi kedinasan atau dokumen kerja (misal: E-Rekon&LK, Sakti, Kertas Kerja BLU).
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
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Rich Text Editor Deskripsi */}
            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#DF3B68]" />
                <span>Deskripsi / Petunjuk Teknis (Editor Dokumen)</span>
              </label>
              <RichTextEditor
                value={description}
                onChange={setDescription}
                placeholder="Tuliskan petunjuk teknis, formula IKU, ruang lingkup, dan waktu pelaksanaan secara rapi..."
              />
            </div>
          </div>

          {/* Konfigurasi Tenggat & Masa Kritis */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Tipe Periode</label>
              <select
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-800"
              >
                <option value="BULANAN">Bulanan</option>
                <option value="TRIWULANAN">Triwulanan</option>
                <option value="SEMESTERAN">Semesteran</option>
                <option value="TAHUNAN">Tahunan</option>
                <option value="INSIDENTIL">Insidentil</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Bulan & Tahun Periode</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={periodMonth}
                  onChange={(e) => setPeriodMonth(Number(e.target.value))}
                  className="w-1/2 px-2 py-2.5 rounded-xl border border-stone-200 bg-white text-xs"
                />
                <input
                  type="number"
                  value={periodYear}
                  onChange={(e) => setPeriodYear(Number(e.target.value))}
                  className="w-1/2 px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Tenggat Waktu (Deadline) *</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs font-mono font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1 flex items-center gap-1">
                <BellRing className="w-3 h-3 text-[#DF3B68]" /> Masa Kritis (H-X) *
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-stone-500 font-bold">H-</span>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={criticalDaysThreshold}
                  onChange={(e) => setCriticalDaysThreshold(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs font-bold text-rose-700"
                />
                <span className="text-[11px] text-stone-400">hari</span>
              </div>
            </div>
          </div>
        </div>

        {/* Multi-PIC Update */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200/70 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2 text-stone-800 font-bold text-sm">
              <Users className="w-4 h-4 text-[#DF3B68]" />
              <span>Perbarui PIC Pelaksana</span>
            </div>
            <span className="text-[11px] text-stone-400 font-medium">{selectedPics.length} pegawai dipilih</span>
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

        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href={`/tasks/${taskId}`}
            className="px-5 py-2.5 rounded-full border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-medium"
          >
            Batal
          </Link>
          <Button
            type="submit"
            isLoading={submitting}
            className="bg-[#DF3B68] hover:bg-[#C72F58] text-white px-7 py-2.5 rounded-full shadow-sm text-xs font-semibold"
          >
            Simpan Perubahan
          </Button>
        </div>
      </form>
    </div>
  );
}
