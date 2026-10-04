'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Clock, LogOut, CheckCircle2, ShieldAlert, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import type { Profile } from '@/types/database.types';

function PendingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEmailJustVerified = searchParams.get('verified') === 'true';
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStatus() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('*, unit:units(*)')
        .eq('id', user.id)
        .single();

      if (data) {
        setProfile(data as Profile);
        if (data.approval_status === 'APPROVED') {
          router.push('/dashboard');
        }
      }
      setLoading(false);
    }
    loadStatus();
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const handleCheckStatus = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('approval_status').eq('id', user.id).single();
      if (data?.approval_status === 'APPROVED') {
        router.push('/dashboard');
        return;
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-stone-200/70 rounded-3xl p-8 shadow-soft text-center space-y-6">
        
        {/* Header Icon */}
        <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-600">
          <Clock className="w-7 h-7 animate-pulse" />
        </div>

        {/* Notifikasi banner jika baru verifikasi email */}
        {isEmailJustVerified && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs flex items-center gap-2 text-left">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>Email berhasil diverifikasi! Menunggu persetujuan atasan/admin unit.</span>
          </div>
        )}

        <div>
          <h1 className="text-xl font-bold text-stone-900">Menunggu Persetujuan Admin</h1>
          <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
            {profile?.full_name ? `Halo ${profile.full_name}, akun` : 'Akun'} Anda telah terdaftar dan berada dalam antrean verifikasi pejabat unit kerja.
          </p>
        </div>

        {/* Visual Flow Tracker */}
        <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/60 text-left space-y-3">
          <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Status Tahapan Akun</p>
          
          <div className="space-y-2.5">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="text-xs">
                <p className="font-semibold text-stone-800">1. Pendaftaran Formulir</p>
                <p className="text-[10px] text-stone-400">Data profil dan NIP telah tersimpan</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="text-xs">
                <p className="font-semibold text-stone-800">2. Verifikasi Email</p>
                <p className="text-[10px] text-stone-400">Tautan email telah dikonfirmasi</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {profile?.approval_status === 'REJECTED' ? (
                <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
              ) : (
                <Clock className="w-4 h-4 text-amber-500 shrink-0 animate-spin" />
              )}
              <div className="text-xs">
                <p className="font-semibold text-stone-800">
                  3. Verifikasi Administrator ({profile?.unit?.name || 'Unit Kerja'})
                </p>
                <p className="text-[10px] text-stone-400">
                  {profile?.approval_status === 'REJECTED' 
                    ? 'Pengajuan ditolak oleh Admin. Silakan hubungi atasan.' 
                    : 'Sedang menunggu persetujuan (Status: PENDING)'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tombol Aksi */}
        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={handleCheckStatus} isLoading={loading} className="gap-2 w-full">
            <RefreshCw className="w-4 h-4" /> Periksa Status Approval
          </Button>
          <Button variant="outline" onClick={handleLogout} className="gap-2 w-full">
            <LogOut className="w-4 h-4" /> Keluar Akun
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function PendingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
        <div className="text-xs text-stone-500">Memuat status...</div>
      </div>
    }>
      <PendingContent />
    </Suspense>
  );
}
