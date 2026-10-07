'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/topbar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-canvas dark:bg-[#090D16] text-stone-900 dark:text-slate-100 transition-colors duration-200">
      {/* Sidebar Responsive (Desktop Fixed + Mobile Slide-Over Drawer) */}
      <Sidebar 
        isMobileOpen={mobileMenuOpen} 
        onCloseMobile={() => setMobileMenuOpen(false)} 
      />

      {/* Main Wrapper */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)} />
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
