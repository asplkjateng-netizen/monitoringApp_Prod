'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Check, X, ShieldAlert } from 'lucide-react';
import { formatNIP } from '@/lib/utils';
import type { Profile } from '@/types/database.types';

export default function ApprovalsPage() {
  const supabase = createClient();
  const [pendingList, setPendingList] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*, unit:units(*)')
      .eq('approval_status', 'PENDING')
      .order('created_at', { ascending: false });

    if (data) setPendingList(data as Profile[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleAction = async (id: string, action: 'APPROVED' | 'REJECTED') => {
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Update status verifikasi akun pegawai
    await supabase
      .from('profiles')
      .update({
        approval_status: action,
        approved_by: user?.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    // 2. [BACKLOG-1] Buat entri notifikasi ke pegawai yang bersangkutan
    await supabase.from('notifications').insert({
      user_id: id,
      title: action === 'APPROVED' ? '✅ Akun Dinas Telah Disetujui' : '❌ Verifikasi Akun Ditolak',
      message:
        action === 'APPROVED'
          ? 'Selamat! Pendaftaran akun Anda telah disetujui oleh atasan unit. Anda sekarang memiliki hak akses penuh ke aplikasi.'
          : 'Mohon maaf, permohonan pendaftaran akun Anda ditolak oleh atasan unit. Silakan hubungi admin unit kerja Anda.',
      action_link: action === 'APPROVED' ? '/dashboard' : '/pending',
      is_read: false,
    });

    setPendingList((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-stone-900">Verifikasi Pegawai Baru</h1>
        <p className="text-xs text-stone-500 mt-1">
          Daftar akun pegawai yang memerlukan persetujuan akses ke sistem
        </p>
      </div>

      <div className="bg-white border border-stone-200/60 rounded-3xl p-6 shadow-soft">
        {loading ? (
          <p className="text-xs text-stone-400 text-center py-6">Memuat data verifikasi...</p>
        ) : pendingList.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <ShieldAlert className="w-8 h-8 text-stone-300 mx-auto" />
            <p className="text-xs text-stone-500 font-medium">Tidak ada permohonan tertunda</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {pendingList.map((pegawai) => (
              <div key={pegawai.id} className="py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-stone-800">{pegawai.full_name}</p>
                  <p className="text-xs text-stone-500 font-mono mt-0.5">
                    NIP: {formatNIP(pegawai.nip)} • {pegawai.employment_status}
                  </p>
                  <p className="text-[11px] text-primary font-medium mt-1">
                    {pegawai.unit?.name ?? 'Unit tidak diketahui'}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="text-red-600 border-red-200 hover:bg-red-50" 
                    onClick={() => handleAction(pegawai.id, 'REJECTED')}
                  >
                    <X className="w-4 h-4 mr-1" /> Tolak
                  </Button>
                  <Button onClick={() => handleAction(pegawai.id, 'APPROVED')}>
                    <Check className="w-4 h-4 mr-1" /> Setujui
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
