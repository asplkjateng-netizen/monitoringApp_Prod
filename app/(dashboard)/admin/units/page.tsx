'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  X, 
  CheckCircle2, 
  AlertCircle,
  FolderTree,
  ChevronRight,
  CornerDownRight,
  Layers,
  Copy
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { HierarchyTemplate, Profile } from '@/types/database.types';

type UnitLevel = 'ESELON_I' | 'ESELON_II' | 'ESELON_III' | 'SEKSI';

interface UnitItem {
  id: string;
  name: string;
  code: string;
  level: UnitLevel;
  parent_id: string | null;
  tusi_type: string | null;
  created_at: string;
  parent?: {
    name: string;
    code: string;
  } | null;
}

export default function UnitsAdminPage() {
  const supabase = createClient();

  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [templates, setTemplates] = useState<HierarchyTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Modal State Tambah / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal State Kloning Template
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [targetParentUnitId, setTargetParentUnitId] = useState('');
  const [isCloning, setIsCloning] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [level, setLevel] = useState<UnitLevel>('SEKSI');
  const [parentId, setParentId] = useState<string>('');
  const [tusiType, setTusiType] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*, unit:units(*)')
        .eq('id', user.id)
        .single();
      if (profile) setCurrentUser(profile as Profile);
    }

    // Ambil template hierarki
    const { data: tmpls } = await supabase.from('hierarchy_templates').select('*').order('name');
    if (tmpls) setTemplates(tmpls as any);

    await fetchUnits();
    setLoading(false);
  };

  const fetchUnits = async () => {
    const { data, error } = await supabase
      .from('units')
      .select(`
        id,
        name,
        code,
        level,
        parent_id,
        tusi_type,
        created_at,
        parent:parent_id (
          name,
          code
        )
      `)
      .order('level', { ascending: true })
      .order('name', { ascending: true });

    if (!error && data) {
      setUnits(data as any);
    }
  };

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const childrenMap = useMemo(() => {
    const map = new Map<string, UnitItem[]>();
    units.forEach((u) => {
      if (u.parent_id) {
        const list = map.get(u.parent_id) || [];
        list.push(u);
        map.set(u.parent_id, list);
      }
    });
    return map;
  }, [units]);

  const rootUnits = useMemo(() => {
    return units.filter((u) => !u.parent_id || u.level === 'ESELON_I');
  }, [units]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    const allIdsWithChildren = new Set<string>();
    childrenMap.forEach((_, pId) => allIdsWithChildren.add(pId));
    setExpandedIds(allIdsWithChildren);
  };

  const collapseAll = () => setExpandedIds(new Set());

  const openCreateModal = () => {
    setEditingId(null);
    setName('');
    setCode('');
    setLevel(isSuperAdmin ? 'ESELON_III' : 'SEKSI');
    setParentId(isSuperAdmin ? '' : currentUser?.unit_id || '');
    setTusiType('');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (unit: UnitItem) => {
    setEditingId(unit.id);
    setName(unit.name);
    setCode(unit.code);
    setLevel(unit.level);
    setParentId(unit.parent_id || '');
    setTusiType(unit.tusi_type || '');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const getAvailableParents = () => {
    if (level === 'ESELON_I') return [];
    if (level === 'ESELON_II') return units.filter((u) => u.level === 'ESELON_I' && u.id !== editingId);
    if (level === 'ESELON_III') return units.filter((u) => u.level === 'ESELON_II' && u.id !== editingId);
    if (level === 'SEKSI') {
      if (!isSuperAdmin && currentUser?.unit_id) {
        return units.filter((u) => u.id === currentUser.unit_id);
      }
      return units.filter((u) => u.level === 'ESELON_III' && u.id !== editingId);
    }
    return [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim() || !code.trim()) {
      setErrorMsg('Nama unit dan kode unik wajib diisi.');
      return;
    }

    if (level !== 'ESELON_I' && !parentId) {
      setErrorMsg(`Unit tingkat ${level} wajib memiliki Unit Induk.`);
      return;
    }

    setIsSubmitting(true);

    const payload = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      level,
      parent_id: level === 'ESELON_I' ? null : (parentId || null),
      tusi_type: tusiType.trim().toUpperCase() || null,
    };

    if (editingId) {
      const { error } = await supabase.from('units').update(payload).eq('id', editingId);
      if (error) {
        setErrorMsg(error.message.includes('unique') ? 'Kode unit sudah digunakan.' : error.message);
        setIsSubmitting(false);
        return;
      }
      setSuccessMsg('Unit organisasi berhasil diperbarui.');
    } else {
      const { error } = await supabase.from('units').insert(payload);
      if (error) {
        setErrorMsg(error.message.includes('unique') ? 'Kode unit sudah terdaftar.' : error.message);
        setIsSubmitting(false);
        return;
      }
      setSuccessMsg('Unit organisasi baru berhasil didaftarkan.');
    }

    setIsSubmitting(false);
    setIsModalOpen(false);
    fetchUnits();
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleApplyTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateId || !targetParentUnitId) {
      alert('Pilih template dan unit induk tujuan.');
      return;
    }

    setIsCloning(true);
    const tmpl = templates.find((t) => t.id === selectedTemplateId);
    const targetUnit = units.find((u) => u.id === targetParentUnitId);

    if (!tmpl || !targetUnit) {
      setIsCloning(false);
      return;
    }

    try {
      const inserts = tmpl.structure.map((item) => ({
        name: item.name,
        code: `${targetUnit.code}-${item.code_suffix}`.toUpperCase(),
        level: 'SEKSI' as UnitLevel,
        parent_id: targetUnit.id,
        tusi_type: item.tusi_type || null,
      }));

      const { error } = await supabase.from('units').insert(inserts);
      if (error) {
        alert(`Gagal menerapkan template: ${error.message}`);
      } else {
        setSuccessMsg(`Berhasil menerapkan template "${tmpl.name}" ke ${targetUnit.name}.`);
        setIsCloneModalOpen(false);
        fetchUnits();
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
    setIsCloning(false);
  };

  const handleDelete = async (id: string, unitName: string) => {
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus unit "${unitName}"?\n\nPERINGATAN: Menghapus unit induk akan menghapus seluruh sub-unit di bawahnya.`
    );
    if (!confirmed) return;

    const { error } = await supabase.from('units').delete().eq('id', id);
    if (error) {
      alert(`Gagal menghapus unit: ${error.message}`);
    } else {
      setSuccessMsg(`Unit "${unitName}" berhasil dihapus.`);
      fetchUnits();
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  const getLevelBadge = (lvl: UnitLevel) => {
    switch (lvl) {
      case 'ESELON_I':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">Eselon I</span>;
      case 'ESELON_II':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Eselon II (Kanwil)</span>;
      case 'ESELON_III':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Eselon III (KPPN)</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-700 border border-stone-200">Seksi / Subbag</span>;
    }
  };

  const renderUnitTree = (unit: UnitItem, depth: number = 0) => {
    const children = childrenMap.get(unit.id) || [];
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.has(unit.id);

    return (
      <div key={unit.id} className="relative group">
        <div
          onClick={() => hasChildren && toggleExpand(unit.id)}
          className={`flex items-center justify-between p-3.5 md:p-4 rounded-2xl transition-all border ${
            depth === 0
              ? 'bg-white border-stone-200/80 shadow-xs hover:border-stone-300'
              : depth === 1
              ? 'bg-stone-50/70 border-stone-200/60 ml-4 md:ml-8 mt-2 hover:bg-stone-100/70'
              : depth === 2
              ? 'bg-stone-50/40 border-stone-200/50 ml-8 md:ml-16 mt-2 hover:bg-stone-100/50'
              : 'bg-white border-stone-200/40 ml-12 md:ml-24 mt-2 hover:bg-stone-50'
          } ${hasChildren ? 'cursor-pointer' : ''}`}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(unit.id);
                }}
                className="w-7 h-7 rounded-xl bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 transition-transform"
              >
                <ChevronRight
                  className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-90 text-primary font-bold' : ''}`}
                />
              </button>
            ) : (
              <div className="w-7 h-7 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-stone-300" />
              </div>
            )}

            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {getLevelBadge(unit.level)}
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 border border-stone-200">
                  {unit.code}
                </span>
                {unit.tusi_type && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                    TUSI: {unit.tusi_type}
                  </span>
                )}
                {hasChildren && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">
                    {children.length} sub-unit
                  </span>
                )}
              </div>
              <p className="font-bold text-stone-900 text-xs md:text-sm truncate">
                {unit.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 ml-3" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => openEditModal(unit)}
              className="p-1.5 md:p-2 rounded-xl text-stone-500 hover:text-stone-800 hover:bg-white border border-transparent hover:border-stone-200 transition-all"
              title="Edit Unit"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleDelete(unit.id, unit.name)}
              className="p-1.5 md:p-2 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all"
              title="Hapus Unit"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="relative border-l-2 border-dashed border-stone-200 ml-6 md:ml-9 space-y-1.5 pb-1 animate-in fade-in slide-in-from-top-1 duration-150">
            {children.map((child) => renderUnitTree(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const isSearchMode = search.trim() !== '' || levelFilter !== 'ALL';
  const filteredFlatUnits = units.filter((u) => {
    const matchesSearch = 
      u.name.toLowerCase().includes(search.toLowerCase()) || 
      u.code.toLowerCase().includes(search.toLowerCase());
    const matchesLevel = levelFilter === 'ALL' || u.level === levelFilter;
    return matchesSearch && matchesLevel;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Hierarki Unit Organisasi</h1>
          <p className="text-xs text-stone-500 mt-1">
            {isSuperAdmin
              ? 'Kelola seluruh pohon struktur unit Pusat, Kanwil, KPPN, hingga Seksi.'
              : `Pengelolaan sub-bagian dan seksi di ${currentUser?.unit?.name || 'unit kerja Anda'}.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {templates.length > 0 && (
            <Button
              variant="outline"
              onClick={() => {
                setTargetParentUnitId(currentUser?.unit_id || '');
                setIsCloneModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-full border-stone-200 hover:bg-stone-50"
            >
              <Copy className="w-4 h-4 text-primary" />
              <span>Terapkan Template</span>
            </Button>
          )}
          <Button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Unit Baru</span>
          </Button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter & Live Search Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-stone-200/70 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama unit atau kode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-stone-50/60 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'ALL', label: 'Hierarki Penuh' },
            { id: 'ESELON_I', label: 'Eselon I' },
            { id: 'ESELON_II', label: 'Eselon II' },
            { id: 'ESELON_III', label: 'Eselon III' },
            { id: 'SEKSI', label: 'Seksi' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setLevelFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                levelFilter === tab.id
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Kontrol Collapse/Expand */}
      {!isSearchMode && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-stone-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-stone-400" />
            <span>Klik pada nama kantor untuk melihat sub-unit bawahan</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={expandAll}
              className="text-xs font-semibold text-stone-600 hover:text-stone-900 bg-white border border-stone-200/80 px-3 py-1.5 rounded-xl shadow-2xs hover:bg-stone-50"
            >
              Buka Semua
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="text-xs font-semibold text-stone-600 hover:text-stone-900 bg-white border border-stone-200/80 px-3 py-1.5 rounded-xl shadow-2xs hover:bg-stone-50"
            >
              Tutup Semua
            </button>
          </div>
        </div>
      )}

      {/* Kontainer Unit */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-3xl p-16 text-center text-xs text-stone-400 border border-stone-200/70 shadow-sm">
            Memuat hierarki unit kerja...
          </div>
        ) : isSearchMode ? (
          <div className="bg-white rounded-3xl border border-stone-200/70 shadow-sm overflow-hidden divide-y divide-stone-100">
            {filteredFlatUnits.length === 0 ? (
              <div className="py-16 text-center space-y-1">
                <Building2 className="w-8 h-8 text-stone-300 mx-auto" />
                <p className="text-stone-600 font-semibold text-xs">Unit tidak ditemukan</p>
              </div>
            ) : (
              filteredFlatUnits.map((u) => (
                <div
                  key={u.id}
                  className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-stone-50/60 transition-colors"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {getLevelBadge(u.level)}
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 border border-stone-200">
                        {u.code}
                      </span>
                      {u.tusi_type && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                          TUSI: {u.tusi_type}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-stone-900 text-sm md:text-base">{u.name}</h3>
                    {u.parent && (
                      <div className="flex items-center gap-1.5 text-xs text-stone-500 pt-0.5">
                        <CornerDownRight className="w-3.5 h-3.5 text-stone-400" />
                        <span>Induk: <strong className="text-stone-700">{u.parent.name}</strong></span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      onClick={() => openEditModal(u)}
                      className="p-2 rounded-xl text-stone-600 bg-stone-100 hover:bg-stone-200 transition-colors"
                      title="Edit Unit"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(u.id, u.name)}
                      className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-100 transition-colors"
                      title="Hapus Unit"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          rootUnits.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 text-center space-y-2 border border-stone-200/70 shadow-sm">
              <Building2 className="w-8 h-8 text-stone-300 mx-auto" />
              <p className="text-xs font-semibold text-stone-700">Belum ada unit organisasi terdaftar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rootUnits.map((rootUnit) => renderUnitTree(rootUnit, 0))}
            </div>
          )
        )}
      </div>

      {/* Modal Tambah / Edit Unit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-stone-200/80 shadow-2xl p-6 md:p-8 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-stone-900 text-sm md:text-base">
                  {editingId ? 'Edit Unit Organisasi' : 'Tambah Unit Organisasi Baru'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-stone-400 hover:bg-stone-100 transition-colors"
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
                label="Nama Unit Organisasi *"
                placeholder="Contoh: Seksi Manajemen Satker dan Kepatuhan Internal"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Kode Singkat Unit *"
                  placeholder="Contoh: SMG1-MSKI"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
                <div className="space-y-1 text-left">
                  <label className="block text-xs font-semibold text-stone-600">Tipe Tusi (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Contoh: MSKI, PD, VERA"
                    value={tusiType}
                    onChange={(e) => setTusiType(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-primary/20 uppercase"
                  />
                </div>
              </div>

              {/* Tingkatan Level (Super Admin vs Admin Unit) */}
              <div className="space-y-1 text-left">
                <label className="block text-xs font-semibold text-stone-600">Tingkatan Level *</label>
                <select
                  value={level}
                  disabled={!isSuperAdmin}
                  onChange={(e) => {
                    setLevel(e.target.value as UnitLevel);
                    setParentId('');
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 disabled:bg-stone-100"
                >
                  {isSuperAdmin && <option value="ESELON_I">Eselon I (Kantor Pusat)</option>}
                  {isSuperAdmin && <option value="ESELON_II">Eselon II (Kantor Wilayah)</option>}
                  {isSuperAdmin && <option value="ESELON_III">Eselon III (KPPN / Bagian)</option>}
                  <option value="SEKSI">Seksi / Subbagian</option>
                </select>
                {!isSuperAdmin && (
                  <p className="text-[10px] text-stone-400">Admin Unit hanya dapat menambahkan level Seksi/Subbag di bawah kantor induknya.</p>
                )}
              </div>

              {/* Pilihan Parent Unit */}
              {level !== 'ESELON_I' && (
                <div className="space-y-1 text-left">
                  <label className="block text-xs font-semibold text-stone-600">Unit Induk (Parent) *</label>
                  <select
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-800"
                  >
                    <option value="">-- Pilih Unit Induk --</option>
                    {getAvailableParents().map((parentUnit) => (
                      <option key={parentUnit.id} value={parentUnit.id}>
                        {parentUnit.name} ({parentUnit.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
                  {editingId ? 'Simpan Perubahan' : 'Daftarkan Unit'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Terapkan Template Hierarki (Kloning) */}
      {isCloneModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-3xl border border-stone-200/80 shadow-2xl p-6 md:p-8 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Copy className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-stone-900 text-sm md:text-base">
                  Terapkan Template Hierarki
                </h3>
              </div>
              <button
                onClick={() => setIsCloneModalOpen(false)}
                className="p-1 rounded-full text-stone-400 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-500 leading-relaxed">
              Pilih cetak biru struktur standar untuk membuat seluruh seksi bawahan secara otomatis di bawah unit yang dipilih.
            </p>

            <form onSubmit={handleApplyTemplate} className="space-y-4">
              <div className="space-y-1 text-left">
                <label className="block text-xs font-semibold text-stone-600">Pilih Template Master *</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-800"
                >
                  <option value="">-- Pilih Template --</option>
                  {templates.map((tmpl) => (
                    <option key={tmpl.id} value={tmpl.id}>
                      {tmpl.name} ({tmpl.structure?.length || 0} Seksi)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 text-left">
                <label className="block text-xs font-semibold text-stone-600">Unit Induk Tujuan (KPPN / Bidang) *</label>
                <select
                  value={targetParentUnitId}
                  onChange={(e) => setTargetParentUnitId(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-800"
                >
                  <option value="">-- Pilih Kantor Tujuan --</option>
                  {units
                    .filter((u) => u.level === 'ESELON_III' || (isSuperAdmin && u.level === 'ESELON_II'))
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        [{u.level}] {u.name} ({u.code})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCloneModalOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  isLoading={isCloning}
                  className="bg-primary hover:bg-primary-hover text-white font-semibold"
                >
                  Terapkan Struktur
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
