'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  CheckSquare, 
  BookOpen, 
  Users, 
  Building2, 
  LogOut, 
  ShieldCheck, 
  User, 
  FileSpreadsheet, 
  FolderTree, 
  X 
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type { Profile } from '@/types/database.types';

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ isMobileOpen = false, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      if (data) setProfile(data as Profile);
    }
    getProfile();
  }, [supabase]);

  // Lock scroll background saat drawer mobile terbuka
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileOpen]);

  const handleLogout = async () => {
    if (onCloseMobile) onCloseMobile();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const isSuperAdmin = profile?.role === 'SUPER_ADMIN';
  const isUnitAdmin = profile?.is_unit_admin === true;
  const hasAdminAccess = isSuperAdmin || isUnitAdmin;

  const menuGroups = [
    {
      label: 'MONITORING',
      items: [
        { id: 'tour-nav-dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { id: 'tour-nav-tasks', label: 'Daftar Tugas', href: '/tasks', icon: CheckSquare },
        { id: 'tour-nav-reports', label: 'Laporan & Riwayat', href: '/reports', icon: FileSpreadsheet },
      ],
    },
    {
      label: 'BANK DATA',
      items: [
        { id: 'tour-nav-tusi', label: 'Katalog Tusi', href: '/tusi-catalog', icon: BookOpen },
        ...(isSuperAdmin ? [
          { id: 'tour-nav-hierarchy', label: 'Katalog Hierarki', href: '/admin/hierarchy-catalog', icon: FolderTree }
        ] : []),
      ],
    },
    ...(hasAdminAccess ? [{
      label: 'ADMINISTRASI',
      items: [
        { id: 'tour-nav-approvals', label: 'Verifikasi Pegawai', href: '/admin/approvals', icon: ShieldCheck },
        { id: 'tour-nav-users', label: 'Pegawai & Role', href: '/admin/users', icon: Users },
        { id: 'tour-nav-units', label: 'Hierarki Unit', href: '/admin/units', icon: Building2 },
      ],
    }] : []),
    {
      label: 'PENGATURAN',
      items: [
        { id: 'tour-nav-profile', label: 'Profil Saya', href: '/profile', icon: User },
      ],
    },
  ];

  const renderNavContent = () => (
    <>
      <div className="space-y-6">
        {/* Logo & Info */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 shadow-sm flex items-center justify-center font-bold text-[#DF3B68]">
              GT
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-900 dark:text-slate-100 leading-tight">Gov-Task-Monitor</h2>
              <p className="text-[11px] text-stone-400 dark:text-slate-500">Portal Kinerja Vertikal</p>
            </div>
          </div>

          {/* Tombol Close Khusus Mobile Drawer */}
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 md:hidden transition-colors"
              aria-label="Tutup menu navigasi"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Menu Items */}
        <nav className="space-y-5">
          {menuGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <p className="px-3 text-[10px] font-bold text-stone-400 dark:text-slate-500 tracking-wider">
                {group.label}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    id={item.id}
                    href={item.href}
                    onClick={() => {
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className={cn(
                      "flex items-center gap-3 px-3.5 py-2.5 rounded-full text-xs font-medium transition-all duration-150",
                      isActive
                        ? "bg-[#DF3B68] text-white shadow-sm"
                        : "text-stone-600 dark:text-slate-300 hover:bg-stone-200/50 dark:hover:bg-slate-800/80 hover:text-stone-900 dark:hover:text-slate-100"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", isActive ? "text-white" : "text-stone-400 dark:text-slate-400")} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Logout Button */}
      <div className="pt-4 border-t border-stone-200/60 dark:border-slate-800">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3.5 py-2.5 rounded-full text-xs font-medium text-stone-600 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-rose-950/40 hover:text-red-600 dark:hover:text-rose-400 transition-colors"
        >
          <LogOut className="w-4 h-4 text-stone-400 dark:text-slate-400" />
          Keluar Sistem
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* 1. Desktop Sidebar (Layar >= md) */}
      <aside className="hidden md:flex w-64 min-h-screen bg-canvas dark:bg-[#090D16] border-r border-stone-200/60 dark:border-slate-800/80 p-5 flex-col justify-between print:hidden shrink-0 transition-colors duration-200">
        {renderNavContent()}
      </aside>

      {/* 2. Mobile Sheet Drawer (Layar < md) */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity duration-300 md:hidden",
          isMobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white dark:bg-slate-900 border-r border-stone-200 dark:border-slate-800 p-5 flex flex-col justify-between print:hidden transform transition-transform duration-300 ease-in-out md:hidden shadow-2xl overflow-y-auto",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {renderNavContent()}
      </aside>
    </>
  );
}
