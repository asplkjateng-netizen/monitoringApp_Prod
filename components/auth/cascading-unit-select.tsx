'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Unit } from '@/types/database.types';

export function CascadingUnitSelect({
  onSelectUnit,
}: {
  onSelectUnit: (unitId: string) => void;
}) {
  const supabase = createClient();
  const [eselon2List, setEselon2List] = useState<Unit[]>([]);
  const [eselon3List, setEselon3List] = useState<Unit[]>([]);
  const [seksiList, setSeksiList] = useState<Unit[]>([]);

  const [selectedEselon2, setSelectedEselon2] = useState('');
  const [selectedEselon3, setSelectedEselon3] = useState('');

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
    setSeksiList([]);
    onSelectUnit('');
    const { data } = await supabase.from('units').select('*').eq('parent_id', parentId);
    if (data) setEselon3List(data as Unit[]);
  };

  const handleEselon3Change = async (parentId: string) => {
    setSelectedEselon3(parentId);
    setSeksiList([]);
    onSelectUnit('');
    const { data } = await supabase.from('units').select('*').eq('parent_id', parentId);
    if (data) setSeksiList(data as Unit[]);
  };

  return (
    <div className="space-y-3 text-left">
      <div>
        <label className="block text-xs font-semibold text-stone-600 mb-1">
          Unit Eselon II (Kanwil)
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

      <div>
        <label className="block text-xs font-semibold text-stone-600 mb-1">
          Unit Eselon III (KPPN / Bidang)
        </label>
        <select
          className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 disabled:bg-stone-50 focus:outline-none focus:border-primary"
          value={selectedEselon3}
          disabled={!selectedEselon2}
          onChange={(e) => handleEselon3Change(e.target.value)}
          required
        >
          <option value="">-- Pilih Eselon III --</option>
          {eselon3List.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-stone-600 mb-1">
          Seksi / Subbagian
        </label>
        <select
          className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 disabled:bg-stone-50 focus:outline-none focus:border-primary"
          disabled={!selectedEselon3}
          onChange={(e) => onSelectUnit(e.target.value)}
          required
        >
          <option value="">-- Pilih Seksi --</option>
          {seksiList.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
