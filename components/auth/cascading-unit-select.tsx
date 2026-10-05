'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Unit } from '@/types/database.types';

export function CascadingUnitSelect({
  onSelectUnit,
}: {
  onSelectUnit: (unitId: string, level?: string, isHead?: boolean) => void;
}) {
  const supabase = createClient();
  const [eselon2List, setEselon2List] = useState<Unit[]>([]);
  const [eselon3List, setEselon3List] = useState<Unit[]>([]);
  const [seksiList, setSeksiList] = useState<Unit[]>([]);

  const [selectedEselon2, setSelectedEselon2] = useState('');
  const [selectedEselon3, setSelectedEselon3] = useState('');
  const [selectedSeksi, setSelectedSeksi] = useState('');

  useEffect(() => {
    async function fetchEselon2() {
      const { data } = await supabase.from('units').select('*').eq('level', 'ESELON_II');
      if (data) setEselon2List(data as Unit[]);
    }
    fetchEselon2();
  }, [supabase]);

  const handleEselon2Change = async (parentId: string) => {
    setSelectedEselon2(parentId);
    setSelectedEselon3('');
    setSelectedSeksi('');
    setSeksiList([]);
    onSelectUnit('');

    if (!parentId) {
      setEselon3List([]);
      return;
    }

    const { data } = await supabase.from('units').select('*').eq('parent_id', parentId);
    if (data) setEselon3List(data as Unit[]);
  };

  const handleEselon3Change = async (val: string) => {
    setSelectedEselon3(val);
    setSelectedSeksi('');
    setSeksiList([]);

    // Jika memilih Opsi Pimpinan Tingkat Kanwil
    if (val.startsWith('HEAD_ES2:')) {
      const parentUnitId = val.replace('HEAD_ES2:', '');
      onSelectUnit(parentUnitId, 'ESELON_II', true);
      return;
    }

    if (!val) {
      onSelectUnit('');
      return;
    }

    // Default: belum memilih seksi atau pimpinan seksi, belum mengikat unit final
    onSelectUnit('');

    const { data } = await supabase.from('units').select('*').eq('parent_id', val);
    if (data) setSeksiList(data as Unit[]);
  };

  const handleSeksiChange = (val: string) => {
    setSelectedSeksi(val);

    // Jika memilih Opsi Pimpinan Tingkat Kantor (Kepala KPPN / Kabid)
    if (val.startsWith('HEAD_ES3:')) {
      const officeUnitId = val.replace('HEAD_ES3:', '');
      onSelectUnit(officeUnitId, 'ESELON_III', true);
      return;
    }

    if (val) {
      onSelectUnit(val, 'SEKSI', false);
    } else {
      onSelectUnit('');
    }
  };

  return (
    <div className="space-y-3 text-left">
      {/* 1. Eselon II (Kanwil) */}
      <div>
        <label className="block text-xs font-semibold text-stone-600 mb-1">
          Unit Eselon II (Kanwil) *
        </label>
        <select
          className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 focus:outline-none focus:border-primary"
          value={selectedEselon2}
          onChange={(e) => handleEselon2Change(e.target.value)}
          required
        >
          <option value="">-- Pilih Eselon II --</option>
          {eselon2List.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>

      {/* 2. Eselon III (KPPN / Bidang) */}
      <div>
        <label className="block text-xs font-semibold text-stone-600 mb-1">
          Unit Eselon III (KPPN / Bidang) *
        </label>
        <select
          className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 disabled:bg-stone-50 focus:outline-none focus:border-primary"
          value={selectedEselon3}
          disabled={!selectedEselon2}
          onChange={(e) => handleEselon3Change(e.target.value)}
          required
        >
          <option value="">-- Pilih Eselon III --</option>
          {selectedEselon2 && (
            <option value={`HEAD_ES2:${selectedEselon2}`} className="font-bold text-[#DF3B68]">
              ⭐ [Semua Bidang & KPPN / Pimpinan Kanwil (Kakanwil)]
            </option>
          )}
          {eselon3List.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>

      {/* 3. Seksi / Subbagian */}
      <div>
        <label className="block text-xs font-semibold text-stone-600 mb-1">
          Seksi / Subbagian Kerja *
        </label>
        <select
          className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 disabled:bg-stone-50 focus:outline-none focus:border-primary"
          value={selectedSeksi}
          disabled={!selectedEselon3 || selectedEselon3.startsWith('HEAD_ES2:')}
          onChange={(e) => handleSeksiChange(e.target.value)}
          required={!selectedEselon3.startsWith('HEAD_ES2:')}
        >
          <option value="">-- Pilih Seksi --</option>
          {selectedEselon3 && !selectedEselon3.startsWith('HEAD_ES2:') && (
            <option value={`HEAD_ES3:${selectedEselon3}`} className="font-bold text-[#DF3B68]">
              ⭐ [Semua Seksi / Pimpinan Kantor (Kepala KPPN / Kabid)]
            </option>
          )}
          {seksiList.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
