'use client';
import { Clock, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function PendingPage() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-stone-200/60 rounded-3xl p-8 shadow-soft text-center space-y-5">
        <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-600">
          <Clock className="w-7 h-7 animate-pulse" />
        </div>

        <div>
          <h1 className="text-xl font-bold text-stone-900">Menunggu Verifikasi</h1>
          <p className="text-xs text-stone-500 mt-2">
            Akun Anda telah berhasil terdaftar dan sedang menunggu persetujuan (*approval*) dari Kepala Unit atau Administrator Seksi Anda.
          </p>
        </div>

        <div className="p-3 bg-canvas-subtle rounded-xl text-left border border-stone-200/40">
          <p className="text-[11px] text-stone-600 font-medium">Tips:</p>
          <p className="text-[11px] text-stone-400 mt-0.5">
            Silakan konfirmasi ke atasan langsung unit Anda untuk menyetujui akun melalui menu Verifikasi Pegawai.
          </p>
        </div>

        <Button variant="outline" onClick={handleLogout} className="gap-2">
          <LogOut className="w-4 h-4" /> Keluar Akun
        </Button>
      </div>
    </div>
  );
}
