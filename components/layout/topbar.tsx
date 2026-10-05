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
  Bell
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { NotificationBell } from './notification-bell';

// DATA PILIHAN PERIODE
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

// DATA ONBOARDING SPOTLIGHT TOUR
const TOUR_STEPS = [
  {
    id: 'welcome',
    targetId: null, // Berada di tengah layar
    title: 'Selamat Datang di Gov-Task-Monitor! 👋',
    description: 'Portal pemantauan tusi, kepatuhan, dan pekerjaan instansi vertikal berjenjang. Mari luangkan 1 menit untuk mengenal alur navigasi aplikasi.',
    icon: Sparkles,
    badge: 'Pengenalan',
  },
  {
    id: 'period',
    targetId: 'tour-period-dropdown', // Menunjuk tombol periode
    title: '1. Pemilih Siklus Periode 📅',
    description: 'Pilih siklus pemantauan (Bulan Berjalan, Triwulan I–IV, Semester, atau Tahunan). Seluruh kartu metrik dasbor dan filter daftar tugas akan langsung menyesuaikan.',
    icon: CalendarDays,
    badge: 'Filter Periode',
  },
  {
    id: 'tasks',
    targetId: 'tour-sidebar-tasks', // Menunjuk menu Daftar Tugas di Sidebar
    title: '2. Daftar Tugas & Sub-Pekerjaan 📋',
    description: 'Akses menu ini untuk memantau progres tugas, melihat dasar hukum & petunjuk teknis, mengisi checklist sub-tugas, serta membuka tautan dokumen bukti.',
    icon: ListTodo,
    badge: 'Manajemen Tugas',
  },
  {
    id: 'dashboard',
    targetId: 'tour-sidebar-dashboard', // Menunjuk menu Dashboard di Sidebar
    title: '3. Dashboard Multi-Perspektif 📊',
    description: 'Tampilan dasbor beradaptasi sesuai level peran: Staf (tugas pribadi), Kasi (beban kerja), Kakantor (kepatuhan unit), hingga Kakanwil (radar regional).',
    icon: LayoutDashboard,
    badge: 'Monitoring Realtime',
  },
];

// KOMPONEN GELEMBUNG TUTORIAL SPOTLIGHT MELAYANG
function InteractiveSpotlightTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [coords, setCoords] = useState<{ top: number; left: number; position: 'center' | 'anchored' }>({
    top: 0,
    left: 0,
    position: 'center',
  });

  const step = TOUR_STEPS[currentStep];

  const updatePosition = () => {
    if (!step.targetId) {
      setCoords({ top: 0, left: 0, position: 'center' });
      return;
    }

    const el = document.getElementById(step.targetId);
    if (el) {
      const rect = el.getBoundingClientRect();
      const isSidebar = step.targetId.includes('sidebar');

      if (isSidebar) {
        // Posisikan gelembung di sebelah kanan menu sidebar
        setCoords({
          top: Math.max(20, rect.top - 10),
          left: rect.right + 18,
          position: 'anchored',
        });
      } else {
        // Posisikan gelembung di bawah tombol periode (kanan atas)
        setCoords({
          top: rect.bottom + 14,
          left: Math.max(16, rect.right - 340),
          position: 'anchored',
        });
      }
    } else {
      setCoords({ top: 0, left: 0, position: 'center' });
    }
  };

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('gov_task_tour_completed');
    if (!hasSeenTour) {
      const timer = setTimeout(() => setIsOpen(true), 800);
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
    if (isOpen) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition);
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition);
      };
    }
  }, [isOpen, currentStep]);

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

  const StepIcon = step.icon;

  return (
    <div className="fixed inset-0 z-50 pointer-events-auto">
      {/* Backdrop semi transparan */}
      <div 
        onClick={handleClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-2xs transition-opacity animate-in fade-in duration-200"
      />

      {/* Gelembung Panduan */}
      <div
        style={
          coords.position === 'anchored'
            ? { top: `${coords.top}px`, left: `${coords.left}px` }
            : {}
        }
        className={`fixed z-50 w-84 sm:w-96 bg-white rounded-3xl p-5 shadow-2xl border border-stone-200/90 space-y-4 animate-in fade-in zoom-in-95 duration-200 ${
          coords.position === 'center'
            ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
            : ''
        }`}
      >
        <button
          onClick={handleClose}
          className="absolute right-3.5 top-3.5 p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-[#DF3B68] flex items-center justify-center border border-rose-100 shrink-0">
            <StepIcon className="w-5 h-5" />
          </div>
          <div className="pr-6">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#DF3B68] bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
              {step.badge} ({currentStep + 1}/{TOUR_STEPS.length})
            </span>
            <h3 className="font-bold text-stone-900 text-sm mt-1 leading-snug">{step.title}</h3>
          </div>
        </div>

        <p className="text-xs text-stone-600 leading-relaxed bg-stone-50 p-3 rounded-2xl border border-stone-200/70">
          {step.description}
        </p>

        <div className="flex items-center justify-between pt-1 border-t border-stone-100">
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentStep ? 'w-5 bg-[#DF3B68]' : 'w-1.5 bg-stone-200'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-3 py-1.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-semibold"
              >
                Kembali
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-1.5 rounded-xl bg-[#DF3B68] hover:bg-[#C72F58] text-white text-xs font-semibold flex items-center gap-1 shadow-sm transition-colors"
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

// KONTEN UTAMA TOPBAR
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

  const activePeriod = searchParams?.get('period') || 'ALL';
  const selectedPeriodObj = PERIOD_OPTIONS.find((p) => p.id === activePeriod) || PERIOD_OPTIONS[0];

  useEffect(() => {
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
          unit: unitData
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
  }, []);

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
      <InteractiveSpotlightTour />
      <header className="h-20 bg-canvas px-6 md:px-8 flex items-center justify-between border-b border-stone-200/40 sticky top-0 z-30">
        {/* Kiri: Indikator Unit Kerja Aktif */}
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 bg-white border border-stone-200/80 px-3.5 py-1.5 rounded-full shadow-sm text-xs text-stone-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-stone-900">{profile?.unit?.name ?? 'Memuat Unit...'}</span>
            <span className="text-[11px] font-bold text-[#DF3B68] bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100 font-mono">
              {profile?.role ?? 'MEMUAT'}
            </span>
          </div>
        </div>

        {/* Kanan: Dropdown Periode + Panduan + Notifikasi + Profil */}
        <div className="flex items-center gap-3">
          {/* Tombol Panduan Interaktif (?) */}
          <button
            type="button"
            onClick={triggerTour}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-stone-200 text-stone-600 hover:text-[#DF3B68] hover:border-[#DF3B68]/30 hover:bg-rose-50/50 transition-colors shadow-xs"
            title="Buka Panduan Tutorial Interaktif"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Dropdown Periode (Target Tour 1) */}
          <div className="relative" ref={periodRef}>
            <button
              id="tour-period-dropdown"
              type="button"
              onClick={() => setIsPeriodOpen((prev) => !prev)}
              className="flex items-center gap-2 bg-white border border-stone-200/80 px-3.5 py-2 rounded-full text-xs text-stone-700 shadow-sm hover:bg-stone-50 hover:border-stone-300 transition-all focus:outline-none"
            >
              <CalendarDays className="w-3.5 h-3.5 text-[#DF3B68]" />
              <span>Periode: <strong className="text-stone-900">{selectedPeriodObj.label}</strong></span>
              <ChevronDown className={`w-3.5 h-3.5 text-stone-400 transition-transform ${isPeriodOpen ? 'rotate-180' : ''}`} />
            </button>

            {isPeriodOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-3xl shadow-xl border border-stone-200/80 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
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
                          isSelected ? 'bg-rose-50 text-[#DF3B68] font-bold' : 'text-stone-700 hover:bg-stone-50'
                        }`}
                      >
                        <div>
                          <div>{opt.label}</div>
                          <div className="text-[10px] text-stone-400 font-normal">{opt.desc}</div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[#DF3B68]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Lonceng Notifikasi Cerdas */}
          {profile?.id && <NotificationBell userId={profile.id} />}

          {/* Profil Avatar & Menu Akun */}
          <div className="relative pl-1" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="flex items-center gap-1.5 p-1 rounded-full hover:ring-2 hover:ring-[#DF3B68]/20 transition-all focus:outline-none"
              title="Menu Akun Saya"
            >
              <div className="w-9 h-9 rounded-full bg-rose-50 text-[#DF3B68] font-bold flex items-center justify-center text-xs shadow-xs border border-rose-200">
                {profile?.full_name ? getInitials(profile.full_name) : <UserCircle2 className="w-5 h-5 text-[#DF3B68]" />}
              </div>
              <ChevronDown className={`w-3 h-3 text-stone-400 hidden sm:block transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2.5 w-60 bg-white rounded-3xl shadow-xl border border-stone-200/80 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-3 border-b border-stone-100">
                  <p className="text-xs font-bold text-stone-900 truncate">{profile?.full_name || 'Pegawai'}</p>
                  <p className="text-[10px] text-stone-400 font-mono truncate mt-0.5">NIP. {profile?.nip || '-'}</p>
                </div>

                <div className="py-1">
                  <Link
                    href="/profile"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-full text-xs font-medium text-stone-700 hover:bg-rose-50 hover:text-[#DF3B68] transition-colors"
                  >
                    <User className="w-4 h-4 text-stone-400" />
                    <span>Profil Saya</span>
                  </Link>
                </div>

                <div className="pt-1 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-full text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors text-left"
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
