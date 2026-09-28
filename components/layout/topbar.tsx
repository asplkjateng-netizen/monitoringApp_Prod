'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, ChevronDown, UserCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { NotificationBell } from './notification-bell';

export function TopBar() {
  const supabase = createClient();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*, unit:units(*)')
          .eq('id', user.id)
          .single();
        if (data) setProfile(data);
      }
    }
    loadUser();
  }, [supabase]);

  return (
    <header className="h-20 bg-canvas px-8 flex items-center justify-between border-b border-stone-200/40">
      {/* Kiri: Floating Alert Pill */}
      <div className="flex items-center gap-3">
        <div className="inline-flex items-center gap-2 bg-white border border-stone-200/80 px-3.5 py-1.5 rounded-full shadow-sm text-xs text-stone-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="font-semibold text-stone-900">{profile?.unit?.name ?? 'Unit Kerja'}</span>
          <span className="text-[11px] text-stone-400 font-mono">({profile?.role ?? 'STAF'})</span>
        </div>
      </div>

      {/* Kanan: Filter Periode + Tombol Rekam + Notif + Profil */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 bg-white border border-stone-200/70 px-3 py-1.5 rounded-full text-xs text-stone-600 shadow-sm cursor-pointer hover:bg-stone-50">
          <span>Periode: <strong>Bulan Berjalan</strong></span>
          <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
        </div>

        <Link
          href="/tasks/new"
          className="inline-flex items-center gap-1.5 bg-primary text-white text-xs font-semibold px-4 py-2 rounded-full shadow-sm hover:bg-primary-hover transition-all duration-150 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Rekam Tugas</span>
        </Link>

        <NotificationBell userId={profile?.id} />

        <div className="flex items-center gap-2 pl-2">
          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
            {profile?.full_name ? profile.full_name.slice(0, 2).toUpperCase() : <UserCircle2 className="w-5 h-5" />}
          </div>
        </div>
      </div>
    </header>
  );
}
