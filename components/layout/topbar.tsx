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

// DATA ONBOARDING TUTORIAL TOUR
const TOUR_STEPS = [
  {
    title: 'Selamat Datang di Gov-Task-Monitor! 👋',
    description: 'Portal pemantauan tusi, kepatuhan, dan pekerjaan instansi vertikal berjenjang. Mari luangkan 1 menit untuk mengenal fitur utama aplikasi.',
    icon: Sparkles,
    badge: 'Pengenalan',
  },
  {
    title: '1. Pemilih Periode Fleksibel 📅',
    description: 'Di bagian pojok kanan atas, Anda dapat memilih siklus periode (Bulanan, Triwulanan TW I–IV, Semesteran, atau Tahunan). Semua metrik dashboard dan filter tugas otomatis menyesuaikan.',
    icon: Bell,
    badge: 'Filter Periode',
  },
  {
    title: '2. Daftar Tugas & Sub-Pekerjaan 📋',
    description: 'Buka menu "Daftar Tugas" untuk mengelola pekerjaan. Anda dapat membuka/tutup uraian deskripsi, melihat link regulasi dasar hukum, checklist tahapan sub-pekerjaan, serta akses instan tautan bukti dokumen.',
    icon: ListTodo,
    badge: 'Manajemen Pekerjaan',
  },
  {
    title: '3. Dashboard Berjenjang 4 Perspektif 📊',
    description: 'Dashboard beradaptasi otomatis sesuai peran Anda: dari Staf pelaksana, Kepala Seksi (beban kerja staf), Kepala Unit (matriks kesehatan KPPN), hingga Kepala Kanwil (peringkat wilayah).',
    icon: LayoutDashboard,
    badge: 'Monitoring Realtime',
  },
];

// KOMPONEN BUBBLE TUTORIAL TOUR
function TutorialTourModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('gov_task_tour_completed');
    if (!hasSeenTour) {
      const timer = setTimeout(() => setIsOpen(true), 1000);
      return () => clearTimeout(timer);
    }

    const handleOpenTour = () => {
      setCurrentStep(0);
      setIsOpen(true);
    };

    window.addEventListener('open-app-tour', handleOpenTour);
    return () => window.removeEventListener('open-app-tour', handleOpenTour);
  }, []);

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
    <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl border border-stone-200/80 relative space-y-4">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#DF3B68]/10 text-[#DF3B68] flex items-center justify-center border border-[#DF3B68]/20">
            <StepIcon className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#DF3B68] bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-100">
              {step.badge} ({currentStep + 1}/{TOUR_STEPS.length})
            </span>
            <h3 className="font-bold text-stone-900 text-sm mt-1">{step.title}</h3>
          </div>
        </div>

        <p className="text-xs text-stone-600 leading-relaxed bg-stone-50 p-3.5 rounded-2xl border border-stone-200/60">
          {step.description}
        </p>

        <div className="flex items-center justify-between pt-2 border-t border-stone-100">
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

// TOPBAR CONTENT
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

  const triggerTour = () => {
    window.dispatchEvent(new CustomEvent('open-app-tour'));
  };

  const getInitials = (name: string) => {
    if (!name) return '';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  return (
    <>
      <TutorialTourModal />
      <header className="h-20 bg-canvas px-6 md:px-8 flex items-center justify-between border-b border-stone-200/40 sticky top-0 z-30">
        {/* Kiri: Info Unit */}
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 bg-white border border-stone-200/80 px-3.5 py-1.5 rounded-full shadow-sm text-xs text-stone-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-stone-900">{profile?.unit?.name ?? 'Unit Kerja'}</span>
            <span className="text-[11px] text-stone-400 font-mono">({profile?.role ?? 'STAF'})</span>
          </div>
        </div>

        {/* Kanan: Dropdown Periode + Tombol Tutorial (?) + Notifikasi + Profil */}
        <div className="flex items-center gap-3">
          {/* Tombol Panduan Tutorial (?) */}
          <button
            type="button"
            onClick={triggerTour}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-stone-200 text-stone-600 hover:text-[#DF3B68] hover:border-[#DF3B68]/30 hover:bg-rose-50/50 transition-colors shadow-xs"
            title="Buka Panduan Tutorial Sistem"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Dropdown Periode */}
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
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-3xl shadow-xl border border-stone-200/80 p-2 z-50">
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

          {/* Profil Avatar & Dropdown Akun */}
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
              <div className="absolute right-0 mt-2.5 w-60 bg-white rounded-3xl shadow-xl border border-stone-200/80 p-2 z-50">
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
