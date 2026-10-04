'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Check, X, ShieldAlert, Building2 } from 'lucide-react';
import { formatNIP } from '@/lib/utils';
import type { Profile } from '@/types/database.types';

export default function ApprovalsPage() {
  const supabase = createClient();
  const [pendingList, setPendingList] = useState<Profile[]>([]);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingData();
  }, []);

  const fetchPendingData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Ambil profil user saat ini
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('*, unit:units(*)')
      .eq('id', user.id)
      .single();

    if (userProfile) {
      setCurrentUser(userProfile as Profile);
      const isSuperAdmin = userProfile.role === 'SUPER_ADMIN';

      // 2. Query data pending berlingkup (Scoped)
      if (isSuperAdmin) {
        const { data } = await supabase
          .from('profiles')
          .select('*, unit:units(*)')
          .eq('approval_status', 'PENDING')
          .order('created_at', { ascending: false });

        if (data) setPendingList(data as Profile[]);
      } else if (userProfile.is_unit_admin) {
        // Admin Unit: Cari unit sendiri dan semua sub-unit di bawahnya
        const { data: childUnits } = await supabase
          .from('units')
          .select('id')
          .or(`id.eq.${userProfile.unit_id},parent_id.eq.${userProfile.unit_id}`);

        const allowedUnitIds = (childUnits || []).map((u) => u.id);

        if (allowedUnitIds.length > 0) {
          const { data } = await supabase
            .from('profiles')
            .select('*, unit:units(*)')
            .eq('approval_status', 'PENDING')
            .in('unit_id', allowedUnitIds)
            .order('created_at', { ascending: false });

          if (data) setPendingList(data as Profile[]);
        }
      }
    }
    setLoading(false);
  };

  const handleAction = async (id: string, action: 'APPROVED' | 'REJECTED') => {
    if (!currentUser) return;

    // 1. Update status verifikasi akun pegawai
    await supabase
      .from('profiles')
      .update({
        approval_status: action,
        approved_by: currentUser.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    // 2. Buat entri notifikasi ke pegawai yang bersangkutan
    await supabase.from('notifications').insert({
      user_id: id,
      title: action === 'APPROVED' ? '✅ Akun Dinas Telah Disetujui' : '❌ Verifikasi Akun Ditolak',
      message:
        action === 'APPROVED'
          ? `Selamat! Pendaftaran akun Anda telah disetujui oleh ${currentUser.full_name}. Anda sekarang memiliki hak akses penuh ke aplikasi.`
          : `Mohon maaf, permohonan pendaftaran akun Anda ditolak oleh Admin Unit (${currentUser.unit?.name || 'Unit Kerja'}). Silakan hubungi atasan Anda.`,
      action_link: action === 'APPROVED' ? '/dashboard' : '/pending',
      is_read: false,
    });

    setPendingList((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Verifikasi Pegawai Baru</h1>
          <p className="text-xs text-stone-500 mt-1">
            {currentUser?.role === 'SUPER_ADMIN'
              ? 'Persetujuan pendaftaran pegawai lintas seluruh unit organisasi nasional.'
              : `Persetujuan pendaftaran pegawai di lingkup ${currentUser?.unit?.name || 'unit kerja Anda'}.`}
          </p>
        </div>
        {currentUser?.is_unit_admin && currentUser.role !== 'SUPER_ADMIN' && (
          <span className="self-start sm:self-auto px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-xs font-semibold">
            Admin Unit: {currentUser.unit?.name}
          </span>
        )}
      </div>

      <div className="bg-white border border-stone-200/70 rounded-3xl p-6 shadow-soft">
        {loading ? (
          <p className="text-xs text-stone-400 text-center py-10">Memeriksa permohonan pendaftaran...</p>
        ) : pendingList.length === 0 ? (
          <div className="text-center py-14 space-y-2">
            <ShieldAlert className="w-9 h-9 text-stone-300 mx-auto" />
            <p className="text-xs text-stone-600 font-semibold">Tidak ada permohonan verifikasi tertunda</p>
            <p className="text-[11px] text-stone-400">Seluruh akun yang mendaftar telah diproses.</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {pendingList.map((pegawai) => (
              <div key={pegawai.id} className="py-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-stone-900">{pegawai.full_name}</p>
                  <p className="text-xs text-stone-500 font-mono">
                    NIP: {formatNIP(pegawai.nip)} • <span className="font-sans font-semibold text-stone-700">{pegawai.employment_status}</span>
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-primary font-medium pt-0.5">
                    <Building2 className="w-3.5 h-3.5 text-stone-400" />
                    <span>{pegawai.unit?.name ?? 'Unit tidak diketahui'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Button 
                    variant="outline" 
                    className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs px-3.5 py-1.5 rounded-full" 
                    onClick={() => handleAction(pegawai.id, 'REJECTED')}
                  >
                    <X className="w-3.5 h-3.5 mr-1" /> Tolak
                  </Button>
                  <Button 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-1.5 rounded-full shadow-sm"
                    onClick={() => handleAction(pegawai.id, 'APPROVED')}
                  >
                    <Check className="w-3.5 h-3.5 mr-1" /> Setujui Akun
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
