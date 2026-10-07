'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { 
  ChevronDown, 
  UserCircle2, 
  User, 
  LogOut, 
  CalendarDays, 
  Check, 
  HelpCircle, 
  X, 
  ChevronRight, 
  Sparkles, 
  LayoutDashboard, 
  ListTodo, 
  Bell,
  CalendarCheck,
  Menu,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { createClient } from '@/lib/supabase/client';
import { NotificationBell } from './notification-bell';

interface TopBarProps {
  onToggleMobileMenu?: () => void;
}

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

const TOUR_STEPS = [
  {
    targetId: null,
    title: 'Selamat Datang di Gov-Task-Monitor! 👋',
    description: 'Portal pemantauan tusi, kepatuhan, dan kinerja instansi vertikal berjenjang. Mari luangkan 1 menit untuk mengenal fitur utama aplikasi.',
    icon: Sparkles,
    badge: 'Pengenalan',
  },
  {
    targetId: 'tour-period-btn',
    title: '1. Pemilih Periode Fleksibel 📅',
    description: 'Pilih siklus periode (Bulanan, Triwulanan TW I–IV, Semesteran, atau Tahunan). Seluruh capaian dashboard dan filter tugas otomatis menyesuaikan dengan siklus yang Anda pilih di sini.',
    icon: CalendarCheck,
    badge: 'Filter Periode',
  },
  {
    targetId: 'tour-nav-tasks',
    title: '2. Daftar Tugas & Sub-Pekerjaan 📋',
    description: 'Buka menu "Daftar Tugas" untuk mengelola tugas. Anda dapat mencentang tahapan sub-pekerjaan secara interaktif langsung dari tabel untuk menaikkan progres capaian!',
    icon: ListTodo,
    badge: 'Manajemen Pekerjaan',
  },
  {
    targetId: 'tour-nav-dashboard',
    title: '3. Dashboard Berjenjang 4 Perspektif 📊',
    description: 'Dashboard otomatis menyesuaikan level Anda: dari Staf (tugas pribadi), Kasi (beban kerja staf), Kakantor (matriks KPPN), hingga Kakanwil (leaderboard se-wilayah).',
    icon: LayoutDashboard,
    badge: 'Monitoring Realtime',
  },
  {
    targetId: 'tour-notif-btn',
    title: '4. Lonceng Notifikasi & Approval 🔔',
    description: 'Memantau tugas kritis H-3 dan memberikan peringatan khusus kepada Super Admin atau Admin Unit bila ada pendaftaran akun pegawai baru yang menunggu persetujuan.',
    icon: Bell,
    badge: 'Notifikasi Sistem',
  },
];

function TutorialTourModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [coords, setCoords] = useState<{ top: number; left: number; width?: number; height?: number } | null>(null);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('gov_task_tour_completed');
    if (!hasSeenTour) {
      const timer = setTimeout(() => setIsOpen(true), 1200);
      return () => clearTimeout(timer);
    }

    const handleOpenTour = () => {
      setCurrentStep(0);
      setIsOpen(true);
    };

    window.addEventListener('open-app-tour', handleOpenTour);
    return () => window.removeEventListener('open-app-tour', handleOpenTour);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const step = TOUR_STEPS[currentStep];
    if (step.targetId) {
      const el = document.getElementById(step.targetId);
      if (el) {
        const rect = el.getBoundingClientRect();
        setCoords({
          top: rect.bottom + window.scrollY + 10,
          left: Math.max(16, Math.min(rect.left + window.scrollX, window.innerWidth - 380)),
          width: rect.width,
          height: rect.height,
        });
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }
    setCoords(null);
  }, [currentStep, isOpen]);

  const handleClose = () => {
    localStorage.setItem('gov_task_tour_completed', 'true');
    setIsOpen(false);
  };

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];
  const StepIcon = step.icon;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 transition-all duration-200">
      <div
        style={
          coords
            ? {
                position: 'absolute',
                top: `${coords.top}px`,
                left: `${coords.left}px`,
              }
            : {}
        }
        className="bg-white dark:bg-slate-900 max-w-md w-full rounded-3xl p-6 shadow-2xl border-2 border-[#DF3B68]/30 relative space-y-4 animate-in fade-in zoom-in-95 duration-150"
      >
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-full transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#DF3B68]/10 text-[#DF3B68] flex items-center justify-center border border-[#DF3B68]/20 shrink-0">
            <StepIcon className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#DF3B68] bg-rose-50 dark:bg-rose-950/40 px-2.5 py-0.5 rounded-full border border-rose-100 dark:border-rose-900/50">
              {step.badge} ({currentStep + 1}/{TOUR_STEPS.length})
            </span>
            <h3 className="font-bold text-stone-900 dark:text-slate-100 text-sm mt-1">{step.title}</h3>
          </div>
        </div>

        <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed bg-stone-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-stone-200/60 dark:border-slate-800">
          {step.description}
        </p>

        <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentStep ? 'w-5 bg-[#DF3B68]' : 'w-1.5 bg-stone-200 dark:bg-slate-700'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-slate-700 text-stone-600 dark:text-slate-300 hover:bg-stone-50 dark:hover:bg-slate-800 text-xs font-semibold"
              >
                Kembali
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-1.5 rounded-xl bg-[#DF3B68] hover:bg-[#C72F58] text-white text-xs font-semibold flex items-center gap-1 shadow-sm"
            >
              <span>{currentStep === TOUR_STEPS.length - 1 ? 'Mulai Eksplorasi' : 'Lanjut'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TopBarContent({ onToggleMobileMenu }: TopBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isPeriodOpen, setIsPeriodOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const periodRef = useRef<HTMLDivElement>(null);

  const activePeriod = searchParams?.get('period') || 'ALL';
  const selectedPeriodObj = PERIOD_OPTIONS.find((p) => p.id === activePeriod) || PERIOD_OPTIONS[0];

  useEffect(() => {
    setMounted(true);
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profData } = await supabase
        .from('profiles')
        .select('id, full_name, nip, role, is_unit_admin, unit_id, approval_status')
        .eq('id', user.id)
        .maybeSingle();

      if (profData) {
        let unitData = null;
        if (profData.unit_id) {
          const { data: uData } = await supabase
            .from('units')
            .select('id, name, code, level')
            .eq('id', profData.unit_id)
            .maybeSingle();
          unitData = uData;
        }

        setProfile({
          ...profData,
          unit: unitData,
        });
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

  const triggerTour = () => {
    window.dispatchEvent(new CustomEvent('open-app-tour'));
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  return (
    <>
      <TutorialTourModal />
      <header className="h-16 md:h-20 bg-canvas dark:bg-[#090D16] px-4 sm:px-6 md:px-8 flex items-center justify-between border-b border-stone-200/50 dark:border-slate-800/80 sticky top-0 z-30 transition-colors duration-200">
        
        {/* Kiri: Hamburger Menu Mobile (< md) + Info Unit Kerja */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 text-stone-700 dark:text-slate-300 hover:text-[#DF3B68] focus:outline-none shadow-xs"
            aria-label="Buka menu navigasi"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-white dark:bg-slate-900 border border-stone-200/80 dark:border-slate-800 px-2.5 sm:px-3.5 py-1.5 rounded-full shadow-xs text-xs text-stone-700 dark:text-slate-300 max-w-[180px] sm:max-w-xs md:max-w-md truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="font-semibold text-stone-900 dark:text-slate-100 truncate text-[11px] sm:text-xs">
              {profile?.unit?.name ?? 'Memuat Unit...'}
            </span>
            <span className="hidden sm:inline-block text-[10px] sm:text-[11px] font-bold text-[#DF3B68] bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-md border border-rose-100 dark:border-rose-900/50 font-mono shrink-0">
              {profile?.role ?? 'MEMUAT'}
            </span>
          </div>
        </div>

        {/* Kanan: Theme Toggle + Bantuan + Dropdown Periode + Notif + Profil */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Theme Toggle (Light / Dark) */}
          <button
            type="button"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 text-stone-600 dark:text-slate-300 hover:text-[#DF3B68] dark:hover:text-[#F43F5E] hover:border-[#DF3B68]/30 transition-colors shadow-xs"
            title="Ganti Mode Tampilan (Terang / Gelap)"
            aria-label="Toggle Mode Gelap"
          >
            {mounted ? (
              resolvedTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-stone-600" />
              )
            ) : (
              <div className="w-4 h-4" />
            )}
          </button>

          {/* Tombol Panduan Tour */}
          <button
            id="tour-help-btn"
            type="button"
            onClick={triggerTour}
            className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 text-stone-600 dark:text-slate-300 hover:text-[#DF3B68] hover:border-[#DF3B68]/30 transition-colors shadow-xs"
            title="Buka Panduan Tutorial Sistem"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Dropdown Periode */}
          <div className="relative" ref={periodRef} id="tour-period-btn">
            <button
              type="button"
              onClick={() => setIsPeriodOpen((prev) => !prev)}
              className="flex items-center gap-1.5 sm:gap-2 bg-white dark:bg-slate-900 border border-stone-200/80 dark:border-slate-800 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full text-xs text-stone-700 dark:text-slate-300 shadow-xs hover:bg-stone-50 dark:hover:bg-slate-800 transition-all focus:outline-none"
            >
              <CalendarDays className="w-3.5 h-3.5 text-[#DF3B68]" />
              <span className="hidden sm:inline">Periode: </span>
              <strong className="text-stone-900 dark:text-slate-100 text-[11px] sm:text-xs truncate max-w-[85px] sm:max-w-none">
                {selectedPeriodObj.label}
              </strong>
              <ChevronDown className={`w-3.5 h-3.5 text-stone-400 dark:text-slate-500 transition-transform ${isPeriodOpen ? 'rotate-180' : ''}`} />
            </button>

            {isPeriodOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-stone-200/80 dark:border-slate-800 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-2 border-b border-stone-100 dark:border-slate-800">
                  <p className="text-[11px] font-bold text-stone-800 dark:text-slate-200 uppercase tracking-wider">Pilih Siklus Periode</p>
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
                          isSelected 
                            ? 'bg-rose-50 dark:bg-rose-950/40 text-[#DF3B68] font-bold' 
                            : 'text-stone-700 dark:text-slate-300 hover:bg-stone-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div>
                          <div>{opt.label}</div>
                          <div className="text-[10px] text-stone-400 dark:text-slate-500 font-normal">{opt.desc}</div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[#DF3B68]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Lonceng Notifikasi */}
          {profile?.id && <NotificationBell userId={profile.id} />}

          {/* Profil Avatar & Menu Akun */}
          <div className="relative pl-0.5 sm:pl-1" ref={dropdownRef} id="tour-profile-btn">
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="flex items-center gap-1.5 p-0.5 rounded-full hover:ring-2 hover:ring-[#DF3B68]/20 transition-all focus:outline-none"
              title="Menu Akun Saya"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-rose-50 dark:bg-rose-950/60 text-[#DF3B68] font-bold flex items-center justify-center text-xs shadow-xs border border-rose-200 dark:border-rose-900/60">
                {profile?.full_name ? getInitials(profile.full_name) : <UserCircle2 className="w-5 h-5 text-[#DF3B68]" />}
              </div>
              <ChevronDown className={`w-3 h-3 text-stone-400 hidden sm:block transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2.5 w-60 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-stone-200/80 dark:border-slate-800 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-3 border-b border-stone-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-stone-900 dark:text-slate-100 truncate">{profile?.full_name || 'Pegawai'}</p>
                  <p className="text-[10px] text-stone-400 dark:text-slate-500 font-mono truncate mt-0.5">NIP. {profile?.nip || '-'}</p>
                </div>

                <div className="py-1">
                  <Link
                    href="/profile"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-full text-xs font-medium text-stone-700 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-slate-800 hover:text-[#DF3B68] transition-colors"
                  >
                    <User className="w-4 h-4 text-stone-400" />
                    <span>Profil Saya</span>
                  </Link>
                </div>

                <div className="pt-1 border-t border-stone-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-full text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-left"
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
    </>
  );
}

function TopBarSkeleton() {
  return (
    <header className="h-16 md:h-20 bg-canvas dark:bg-[#090D16] px-4 sm:px-6 md:px-8 flex items-center justify-between border-b border-stone-200/40 dark:border-slate-800 sticky top-0 z-30">
      <div className="h-8 w-36 sm:w-44 bg-white/80 dark:bg-slate-800/80 rounded-full animate-pulse border border-stone-200/60 dark:border-slate-700" />
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="h-8 w-24 sm:w-36 bg-white/80 dark:bg-slate-800/80 rounded-full animate-pulse border border-stone-200/60 dark:border-slate-700" />
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/80 dark:bg-slate-800/80 animate-pulse border border-stone-200/60 dark:border-slate-700" />
      </div>
    </header>
  );
}

export function TopBar(props: TopBarProps) {
  return (
    <Suspense fallback={<TopBarSkeleton />}>
      <TopBarContent {...props} />
    </Suspense>
  );
}
