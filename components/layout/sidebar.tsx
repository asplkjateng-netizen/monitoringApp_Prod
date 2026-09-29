'use client';

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
  User
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const menuGroups = [
    {
      label: 'MONITORING',
      items: [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { label: 'Daftar Tugas', href: '/tasks', icon: CheckSquare },
      ],
    },
    {
      label: 'BANK DATA',
      items: [
        { label: 'Katalog Tusi', href: '/tusi-catalog', icon: BookOpen },
      ],
    },
    {
      label: 'ADMINISTRASI',
      items: [
        { label: 'Verifikasi Pegawai', href: '/admin/approvals', icon: ShieldCheck },
        { label: 'Pegawai & Role', href: '/admin/users', icon: Users },
        { label: 'Hierarki Unit', href: '/admin/units', icon: Building2 },
      ],
    },
    {
      label: 'PENGATURAN',
      items: [
        { label: 'Profil Saya', href: '/profile', icon: User },
      ],
    },
  ];

  return (
    <aside className="w-64 min-h-screen bg-canvas border-r border-stone-200/60 p-5 flex flex-col justify-between">
      <div className="space-y-6">
        {/* Logo & Info */}
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-2xl bg-white border border-stone-200 shadow-sm flex items-center justify-center font-bold text-primary">
            GT
          </div>
          <div>
            <h2 className="text-sm font-bold text-stone-900 leading-tight">Gov-Task-Monitor</h2>
            <p className="text-[11px] text-stone-400">Portal Kinerja Vertikal</p>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="space-y-5">
          {menuGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <p className="px-3 text-[10px] font-bold text-stone-400 tracking-wider">
                {group.label}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3.5 py-2.5 rounded-full text-xs font-medium transition-all duration-150",
                      isActive
                        ? "bg-primary text-white shadow-sm"
                        : "text-stone-600 hover:bg-stone-200/50 hover:text-stone-900"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", isActive ? "text-white" : "text-stone-400")} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Logout Button */}
      <div className="pt-4 border-t border-stone-200/60">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3.5 py-2.5 rounded-full text-xs font-medium text-stone-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Keluar Sistem
        </button>
      </div>
    </aside>
  );
}
