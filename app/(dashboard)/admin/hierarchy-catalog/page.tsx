'use client';

import { useState, useEffect } from 'react';
import { 
  FolderTree, 
  Plus, 
  Edit3, 
  Trash2, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  Layers,
  Sparkles
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { HierarchyTemplate, HierarchyTemplateItem, UnitLevel } from '@/types/database.types';

export default function HierarchyCatalogPage() {
  const supabase = createClient();

  const [templates, setTemplates] = useState<HierarchyTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form Fields
  const [name, setName] = useState('');
  const [targetLevel, setTargetLevel] = useState<UnitLevel>('ESELON_III');
  const [tusiType, setTusiType] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<HierarchyTemplateItem[]>([
    { name: '', code_suffix: '', tusi_type: '' },
  ]);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('hierarchy_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTemplates(data as any);
    }
    setLoading(false);
  };

  const openCreateModal = () => {
    setEditingId(null);
    setName('');
    setTargetLevel('ESELON_III');
    setTusiType('');
    setDescription('');
    setItems([
      { name: 'Seksi Manajemen Satker dan Kepatuhan Internal', code_suffix: 'MSKI', tusi_type: 'MSKI' },
      { name: 'Seksi Pencairan Dana', code_suffix: 'PD', tusi_type: 'PD' },
      { name: 'Seksi Bank', code_suffix: 'BANK', tusi_type: 'BANK' },
      { name: 'Seksi Verifikasi dan Akuntansi', code_suffix: 'VERA', tusi_type: 'VERA' },
      { name: 'Subbagian Umum', code_suffix: 'UMUM', tusi_type: 'UMUM' },
    ]);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (tmpl: HierarchyTemplate) => {
    setEditingId(tmpl.id);
    setName(tmpl.name);
    setTargetLevel(tmpl.target_level);
    setTusiType(tmpl.tusi_type || '');
    setDescription(tmpl.description || '');
    setItems(tmpl.structure && tmpl.structure.length > 0 ? tmpl.structure : [{ name: '', code_suffix: '', tusi_type: '' }]);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleAddItem = () => {
    setItems([...items, { name: '', code_suffix: '', tusi_type: '' }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof HierarchyTemplateItem, value: string) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Nama template hierarki wajib diisi.');
      return;
    }

    const validItems = items.filter((i) => i.name.trim() !== '' && i.code_suffix.trim() !== '');
    if (validItems.length === 0) {
      setErrorMsg('Minimal harus ada 1 anak unit/seksi yang valid.');
      return;
    }

    setIsSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();

    const payload = {
      name: name.trim(),
      target_level: targetLevel,
      tusi_type: tusiType.trim().toUpperCase() || null,
      description: description.trim() || null,
      structure: validItems,
      created_by: user?.id,
      updated_at: new Date().toISOString(),
    };

    if (editingId) {
      const { error } = await supabase.from('hierarchy_templates').update(payload).eq('id', editingId);
      if (error) {
        setErrorMsg(error.message);
        setIsSubmitting(false);
        return;
      }
      setSuccessMsg('Template hierarki berhasil diperbarui.');
    } else {
      const { error } = await supabase.from('hierarchy_templates').insert(payload);
      if (error) {
        setErrorMsg(error.message);
        setIsSubmitting(false);
        return;
      }
      setSuccessMsg('Template hierarki baru berhasil disimpan.');
    }

    setIsSubmitting(false);
    setIsModalOpen(false);
    fetchTemplates();
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleDelete = async (id: string, tmplName: string) => {
    const confirmed = window.confirm(`Apakah Anda yakin ingin menghapus template "${tmplName}"?`);
    if (!confirmed) return;

    const { error } = await supabase.from('hierarchy_templates').delete().eq('id', id);
    if (error) {
      alert(`Gagal menghapus: ${error.message}`);
    } else {
      setSuccessMsg(`Template "${tmplName}" berhasil dihapus.`);
      fetchTemplates();
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-wider uppercase text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full">
              Super Admin Only
            </span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight mt-1.5">Master Katalog Hierarki</h1>
          <p className="text-xs text-stone-500 mt-1">
            Standarisasi cetak biru struktur organisasi yang dapat diterapkan (dikloning) oleh Admin Unit.
          </p>
        </div>

        <Button
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Template Baru</span>
        </Button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Grid Templates */}
      {loading ? (
        <div className="bg-white rounded-3xl p-16 text-center text-xs text-stone-400 border border-stone-200/70 shadow-sm">
          Memuat master template hierarki...
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center space-y-2 border border-stone-200/70 shadow-sm">
          <FolderTree className="w-9 h-9 text-stone-300 mx-auto" />
          <p className="text-xs font-semibold text-stone-700">Belum ada template hierarki master</p>
          <p className="text-[11px] text-stone-400">Klik "Buat Template Baru" untuk menambahkan blueprint struktur standar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((tmpl) => (
            <div
              key={tmpl.id}
              className="bg-white rounded-3xl border border-stone-200/70 p-5 shadow-sm space-y-4 hover:border-stone-300 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                      Target: {tmpl.target_level}
                    </span>
                    {tmpl.tusi_type && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        {tmpl.tusi_type}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-stone-900 text-base">{tmpl.name}</h3>
                  {tmpl.description && (
                    <p className="text-xs text-stone-500 line-clamp-2">{tmpl.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(tmpl)}
                    className="p-1.5 rounded-xl text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(tmpl.id, tmpl.name)}
                    className="p-1.5 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Preview Daftar Seksi */}
              <div className="bg-stone-50/80 rounded-2xl p-3 border border-stone-200/50 space-y-1.5">
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1">
                  <Layers className="w-3 h-3" /> {tmpl.structure?.length || 0} Sub-Bagian / Seksi Standar:
                </p>
                <div className="divide-y divide-stone-200/40">
                  {tmpl.structure?.map((item, idx) => (
                    <div key={idx} className="py-1 flex items-center justify-between text-xs">
                      <span className="text-stone-700 font-medium">{item.name}</span>
                      <span className="font-mono text-[10px] text-stone-400 bg-white px-1.5 py-0.5 rounded border border-stone-200">
                        +{item.code_suffix}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Tambah / Edit Template Master */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl border border-stone-200/80 shadow-2xl p-6 md:p-8 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-stone-900 text-base">
                  {editingId ? 'Edit Master Template Hierarki' : 'Buat Master Template Hierarki Baru'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-stone-400 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Nama Template Master *"
                placeholder="Contoh: KPPN Tipe A1 (Standar 5 Seksi)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 text-left">
                  <label className="block text-xs font-semibold text-stone-600">Target Level Unit</label>
                  <select
                    value={targetLevel}
                    onChange={(e) => setTargetLevel(e.target.value as UnitLevel)}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-800"
                  >
                    <option value="ESELON_III">Eselon III (KPPN / Bidang)</option>
                    <option value="ESELON_II">Eselon II (Kanwil)</option>
                  </select>
                </div>

                <div className="space-y-1 text-left">
                  <label className="block text-xs font-semibold text-stone-600">Tipe Tusi / Kategori</label>
                  <input
                    type="text"
                    placeholder="Contoh: KPPN_A1"
                    value={tusiType}
                    onChange={(e) => setTusiType(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 focus:outline-none uppercase"
                  />
                </div>
              </div>

              <div className="space-y-1 text-left">
                <label className="block text-xs font-semibold text-stone-600">Deskripsi Blueprint</label>
                <textarea
                  rows={2}
                  placeholder="Keterangan struktur unit..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 focus:outline-none"
                />
              </div>

              {/* Dynamic Sub-unit Items */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-stone-700">Daftar Sub-Bagian / Seksi Standar</label>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddItem}
                    className="text-xs px-2.5 py-1 h-auto rounded-lg"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Seksi
                  </Button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-stone-50 p-2.5 rounded-2xl border border-stone-200/60">
                      <input
                        type="text"
                        placeholder="Nama Seksi (cth: Seksi Pencairan Dana)"
                        value={item.name}
                        onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-800"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Suffix Kode (cth: PD)"
                        value={item.code_suffix}
                        onChange={(e) => handleItemChange(idx, 'code_suffix', e.target.value.toUpperCase())}
                        className="w-24 px-3 py-1.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 uppercase font-mono"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Tusi"
                        value={item.tusi_type}
                        onChange={(e) => handleItemChange(idx, 'tusi_type', e.target.value.toUpperCase())}
                        className="w-20 px-3 py-1.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 uppercase"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg"
                        title="Hapus Baris"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  isLoading={isSubmitting}
                  className="bg-primary hover:bg-primary-hover text-white font-semibold"
                >
                  {editingId ? 'Simpan Perubahan' : 'Simpan Master Template'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
