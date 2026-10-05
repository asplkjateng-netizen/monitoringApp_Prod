'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Bell, 
  CheckCheck, 
  ExternalLink, 
  UserPlus, 
  ShieldCheck, 
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface NotificationBellProps {
  userId?: string;
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const router = useRouter();
  const supabase = createClient();

  const [unreadNotifs, setUnreadNotifs] = useState<any[]>([]);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [isAdminRole, setIsAdminRole] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // 1. Fetch Seluruh Data Notifikasi & Data Pending Approval
  const fetchAllNotifications = async () => {
    if (!userId) return;

    try {
      // A. Ambil profil user saat ini untuk memeriksa hak otorisasi
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('id, role, is_unit_admin, unit_id')
        .eq('id', userId)
        .maybeSingle();

      if (myProfile) {
        const isSuper = String(myProfile.role).toUpperCase() === 'SUPER_ADMIN';
        const isUnitAdmin = myProfile.is_unit_admin === true || 
                            ['KEPALA_UNIT', 'KEPALA_SEKSI'].includes(String(myProfile.role).toUpperCase());

        setIsAdminRole(isSuper || isUnitAdmin);

        // B. Jika memiliki hak verifikasi, ambil data pegawai baru PENDING
        if (isSuper) {
          // Super Admin: Ambil semua user pending se-wilayah
          const { data: pendingAll } = await supabase
            .from('profiles')
            .select('id, full_name, nip, created_at, unit_id')
            .eq('approval_status', 'PENDING')
            .order('created_at', { ascending: false });

          setPendingUsers(pendingAll || []);
        } else if (isUnitAdmin && myProfile.unit_id) {
          // Admin Unit / Kasi: Ambil user pending di unit dan sub-unit bawahannya
          const { data: childUnits } = await supabase
            .from('units')
            .select('id')
            .or(`id.eq.${myProfile.unit_id},parent_id.eq.${myProfile.unit_id}`);

          const allowedUnitIds = (childUnits || []).map((u) => u.id);
          if (!allowedUnitIds.includes(myProfile.unit_id)) {
            allowedUnitIds.push(myProfile.unit_id);
          }

          const { data: pendingScoped } = await supabase
            .from('profiles')
            .select('id, full_name, nip, created_at, unit_id')
            .eq('approval_status', 'PENDING')
            .in('unit_id', allowedUnitIds)
            .order('created_at', { ascending: false });

          setPendingUsers(pendingScoped || []);
        }
      }

      // C. Ambil notifikasi sistem personal user
      const { data: notifData } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(15);

      if (notifData) setUnreadNotifs(notifData);
    } catch (err) {
      console.error('Error loading notifications:', err);
    }
  };

  useEffect(() => {
    if (!userId) return;
    fetchAllNotifications();

    // 2. Real-time Subscription: Mendengarkan Notifikasi Baru & Pendaftaran User Baru
    const notifChannel = supabase
      .channel(`notifs-realtime-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => fetchAllNotifications()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        () => fetchAllNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notifChannel);
    };
  }, [userId]);

  // Total badge merah (Notifikasi pribadi + Total pegawai baru yang belum diverifikasi)
  const totalUnreadCount = unreadNotifs.length + pendingUsers.length;

  const handleItemClick = async (notif: any) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notif.id);

    setUnreadNotifs((prev) => prev.filter((n) => n.id !== notif.id));
    setIsOpen(false);

    if (notif.action_link) {
      router.push(notif.action_link);
    }
  };

  const handleGoToApprovals = () => {
    setIsOpen(false);
    router.push('/admin/approvals');
  };

  const handleMarkAllRead = async () => {
    if (!userId || unreadNotifs.length === 0) return;

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    setUnreadNotifs([]);
  };

  return (
    <div className="relative">
      <button
        id="tour-notification-bell"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifikasi Lonceng"
        className="w-9 h-9 rounded-full bg-white border border-stone-200/80 shadow-xs flex items-center justify-center text-stone-600 hover:text-[#DF3B68] hover:border-[#DF3B68]/30 hover:bg-rose-50/50 transition-all relative focus:outline-none"
      >
        <Bell className="w-4 h-4" />
        {totalUnreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#DF3B68] text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-xs animate-pulse">
            {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-84 sm:w-96 bg-white rounded-3xl shadow-2xl border border-stone-200/80 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-stone-900">Notifikasi Sistem</h4>
              {totalUnreadCount > 0 && (
                <span className="text-[10px] bg-[#DF3B68]/10 text-[#DF3B68] px-2 py-0.5 rounded-full font-bold">
                  {totalUnreadCount} Baru
                </span>
              )}
            </div>

            {unreadNotifs.length > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[10px] text-stone-500 hover:text-stone-800 flex items-center gap-1 font-medium transition-colors"
              >
                <CheckCheck className="w-3 h-3" /> Tandai dibaca
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-stone-100 py-1 space-y-1">
            {/* KARTU NOTIFIKASI KHUSUS SUPER ADMIN & ADMIN UNIT: PERSETUJUAN PEGAWAI */}
            {isAdminRole && pendingUsers.length > 0 && (
              <div
                onClick={handleGoToApprovals}
                className="p-3 bg-rose-50/70 border border-rose-200 rounded-2xl cursor-pointer hover:bg-rose-100/70 transition-all space-y-1.5 mt-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#DF3B68] text-white flex items-center justify-center shrink-0">
                      <UserPlus className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-xs font-bold text-[#DF3B68]">
                      Verifikasi Pegawai Baru
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DF3B68] text-white shadow-xs">
                    {pendingUsers.length} Menunggu
                  </span>
                </div>

                <p className="text-[11px] text-stone-600 leading-snug">
                  Terdapat <strong>{pendingUsers.length} akun pegawai baru</strong> yang mendaftar dan menunggu persetujuan Anda untuk dapat mengakses sistem.
                </p>

                <div className="flex items-center justify-between text-[10px] font-semibold text-[#DF3B68] pt-1">
                  <span>Buka Halaman Verifikasi</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            )}

            {/* DAFTAR NOTIFIKASI PERSONAL */}
            {unreadNotifs.length === 0 && pendingUsers.length === 0 ? (
              <div className="py-10 text-center space-y-1">
                <Sparkles className="w-6 h-6 text-stone-300 mx-auto" />
                <p className="text-xs text-stone-500 font-medium">Belum ada notifikasi baru</p>
                <p className="text-[10px] text-stone-400">Semua tugas dan aktivitas termonitor dengan baik.</p>
              </div>
            ) : (
              unreadNotifs.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className="py-3 px-2.5 hover:bg-stone-50 rounded-2xl cursor-pointer transition-colors space-y-1 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-stone-800 group-hover:text-[#DF3B68] transition-colors">
                      {n.title}
                    </p>
                    {n.action_link && (
                      <ExternalLink className="w-3 h-3 text-stone-300 group-hover:text-[#DF3B68] flex-shrink-0 mt-0.5" />
                    )}
                  </div>
                  <p className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed">
                    {n.message}
                  </p>
                  <span className="text-[9px] text-stone-400 block pt-0.5 font-mono">
                    {new Date(n.created_at).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
