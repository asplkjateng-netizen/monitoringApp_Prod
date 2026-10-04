'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ChevronDown, UserCircle2, User, LogOut, CalendarDays, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { NotificationBell } from './notification-bell';

const PERIOD_OPTIONS = [
  { id: 'ALL', label: 'Semua Periode', desc: 'Tampilkan seluruh tugas tahun ini' },
  { id: 'CURRENT_MONTH', label: 'Bulan Berjalan', desc: 'Bulan aktif saat ini' },
  { id: 'TW_1', label: 'Triwulan I (TW I)', desc: 'Jan - Mar' },
  { id: 'TW_2', label: 'Triwulan II (TW II)', desc: 'Apr - Jun' },
  { id: 'TW_3', label: 'Triwulan III (TW III)', desc: 'Jul - Sep' },
  { id: 'TW_4', label: 'Triwulan IV (TW IV)', desc: 'Okt - Des' },
  { id: 'SEMESTER_1', label: 'Semester I', desc: 'Jan - Jun' },
  { id: 'SEMESTER_2', label: 'Semester II', desc: 'Jul - Des' },
  { id: 'TAHUNAN', label: 'Tahunan', desc: 'Sepanjang tahun' },
];

function TopBarContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [profile, setProfile] = useState<any>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isPeriodOpen, setIsPeriodOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const periodRef = useRef<HTMLDivElement>(null);

  // Default periode adalah 'ALL' (Semua Periode)
  const activePeriod = searchParams?.get('period') || 'ALL';
  const selectedPeriodObj = PERIOD_OPTIONS.find((p) => p.id === activePeriod) || PERIOD_OPTIONS[0];

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

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (periodRef.current && !periodRef.current.contains(event.target as Node)) {
        setIsPeriodOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [supabase]);

  const handleSelectPeriod = (periodId: string) => {
    setIsPeriodOpen(false);
    const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
    params.set('period', periodId);
    router.push(`${pathname}?${params.toString()}`);
  };

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
    <header className="h-20 bg-canvas px-6 md:px-8 flex items-center justify-between border-b border-stone-200/40 sticky top-0 z-30">
      {/* Kiri: Info Unit Aktif */}
      <div className="flex items-center gap-3">
        <div className="inline-flex items-center gap-2 bg-white border border-stone-200/80 px-3.5 py-1.5 rounded-full shadow-sm text-xs text-stone-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-stone-900">{profile?.unit?.name ?? 'Unit Kerja'}</span>
          <span className="text-[11px] text-stone-400 font-mono">({profile?.role ?? 'STAF'})</span>
        </div>
      </div>

      {/* Kanan: Dropdown Periode + Notifikasi + Profil */}
      <div className="flex items-center gap-3">
        {/* Dropdown Periode Interaktif */}
        <div className="relative" ref={periodRef}>
          <button
            type="button"
            onClick={() => setIsPeriodOpen((prev) => !prev)}
            className="flex items-center gap-2 bg-white border border-stone-200/80 px-3.5 py-2 rounded-full text-xs text-stone-700 shadow-sm hover:bg-stone-50 hover:border-stone-300 transition-all focus:outline-none"
          >
            <CalendarDays className="w-3.5 h-3.5 text-primary" />
            <span>Periode: <strong className="text-stone-900">{selectedPeriodObj.label}</strong></span>
            <ChevronDown className={`w-3.5 h-3.5 text-stone-400 transition-transform ${isPeriodOpen ? 'rotate-180' : ''}`} />
          </button>

          {isPeriodOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-3xl shadow-xl border border-stone-200/80 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-2 border-b border-stone-100">
                <p className="text-[11px] font-bold text-stone-800 uppercase tracking-wider">Pilih Siklus Periode</p>
              </div>
              <div className="py-1 max-h-72 overflow-y-auto space-y-0.5">
                {PERIOD_OPTIONS.map((opt) => {
                  const isSelected = opt.id === activePeriod;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectPeriod(opt.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl text-xs text-left transition-colors ${
                        isSelected ? 'bg-primary/10 text-primary font-bold' : 'text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      <div>
                        <div>{opt.label}</div>
                        <div className="text-[10px] text-stone-400 font-normal">{opt.desc}</div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {profile?.id && <NotificationBell userId={profile.id} />}

        {/* Avatar Profil & Dropdown Akun */}
        <div className="relative pl-1" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="flex items-center gap-1.5 p-1 rounded-full hover:ring-2 hover:ring-primary/20 transition-all focus:outline-none"
            title="Menu Akun Saya"
          >
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shadow-xs border border-primary/20">
              {profile?.full_name ? getInitials(profile.full_name) : <UserCircle2 className="w-5 h-5 text-primary" />}
            </div>
            <ChevronDown className={`w-3 h-3 text-stone-400 hidden sm:block transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2.5 w-60 bg-white rounded-3xl shadow-xl border border-stone-200/80 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-3 border-b border-stone-100">
                <p className="text-xs font-bold text-stone-900 truncate">{profile?.full_name || 'Pegawai'}</p>
                <p className="text-[10px] text-stone-400 font-mono truncate mt-0.5">NIP. {profile?.nip || '-'}</p>
              </div>

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

function TopBarSkeleton() {
  return (
    <header className="h-20 bg-canvas px-6 md:px-8 flex items-center justify-between border-b border-stone-200/40 sticky top-0 z-30">
      <div className="h-8 w-44 bg-white/80 rounded-full animate-pulse border border-stone-200/60" />
      <div className="flex items-center gap-3">
        <div className="h-8 w-36 bg-white/80 rounded-full animate-pulse border border-stone-200/60" />
        <div className="w-9 h-9 rounded-full bg-white/80 animate-pulse border border-stone-200/60" />
      </div>
    </header>
  );
}

export function TopBar() {
  return (
    <Suspense fallback={<TopBarSkeleton />}>
      <TopBarContent />
    </Suspense>
  );
}
