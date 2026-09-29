'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, ChevronDown, UserCircle2, User, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { NotificationBell } from './notification-bell';

export function TopBar() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<any>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

    // Deteksi klik di luar area dropdown untuk menutup menu
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const getInitials = (name: string) => {
    if (!name) return '';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  return (
    <header className="h-20 bg-canvas px-8 flex items-center justify-between border-b border-stone-200/40 sticky top-0 z-30">
      {/* Kiri: Floating Alert Pill Info Unit */}
      <div className="flex items-center gap-3">
        <div className="inline-flex items-center gap-2 bg-white border border-stone-200/80 px-3.5 py-1.5 rounded-full shadow-sm text-xs text-stone-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="font-semibold text-stone-900">{profile?.unit?.name ?? 'Unit Kerja'}</span>
          <span className="text-[11px] text-stone-400 font-mono">({profile?.role ?? 'STAF'})</span>
        </div>
      </div>

      {/* Kanan: Filter Periode + Tombol Rekam + Notif + Avatar Inisial */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 bg-white border border-stone-200/70 px-3 py-1.5 rounded-full text-xs text-stone-600 shadow-sm cursor-pointer hover:bg-stone-50 transition-colors">
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

        {profile?.id && <NotificationBell userId={profile.id} />}

        {/* Dropdown Avatar Profil */}
        <div className="relative pl-2" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="flex items-center gap-1.5 p-1 rounded-full hover:ring-2 hover:ring-primary/20 transition-all focus:outline-none"
            title="Menu Akun Saya"
          >
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shadow-xs border border-primary/20">
              {profile?.full_name ? (
                getInitials(profile.full_name)
              ) : (
                <UserCircle2 className="w-5 h-5 text-primary" />
              )}
            </div>
            <ChevronDown className="w-3 h-3 text-stone-400 hidden sm:block" />
          </button>

          {/* Isi Menu Popover */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2.5 w-60 bg-white rounded-3xl shadow-xl border border-stone-200/80 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Header Info User */}
              <div className="px-4 py-3 border-b border-stone-100">
                <p className="text-xs font-bold text-stone-900 truncate">
                  {profile?.full_name || 'Pegawai'}
                </p>
                <p className="text-[10px] text-stone-400 font-mono truncate mt-0.5">
                  NIP. {profile?.nip || '-'}
                </p>
              </div>

              {/* Menu Item: Profil */}
              <div className="py-1">
                <Link
                  href="/profile"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-full text-xs font-medium text-stone-700 hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <User className="w-4 h-4 text-stone-400" />
                  <span>Profil Saya</span>
                </Link>
              </div>

              {/* Menu Item: Logout */}
              <div className="pt-1 border-t border-stone-100">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-full text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors text-left"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Keluar Sistem</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
