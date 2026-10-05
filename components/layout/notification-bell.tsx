'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, ExternalLink, UserPlus, ShieldAlert } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function NotificationBell({ userId }: { userId?: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [pendingUsersCount, setPendingUsersCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  // 1. Ambil data notifikasi + data pending approval pegawai baru
  const fetchAllNotifs = async () => {
    if (!userId) return;

    try {
      // A. Ambil profil user aktif
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, role, is_unit_admin, unit_id')
        .eq('id', userId)
        .maybeSingle();

      if (prof) {
        setUserProfile(prof);
        const isSuperAdmin = String(prof.role).toUpperCase() === 'SUPER_ADMIN';
        const isUnitAdmin = prof.is_unit_admin === true || prof.role === 'KEPALA_UNIT' || prof.role === 'KEPALA_SEKSI';

        // B. Query penghitung calon pegawai PENDING
        if (isSuperAdmin) {
          // Super Admin: pantau semua pendaftar baru
          const { count } = await supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('approval_status', 'PENDING');
          setPendingUsersCount(count || 0);
        } else if (isUnitAdmin && prof.unit_id) {
          // Admin Unit: pantau pendaftar di unitnya & seksi bawahannya
          const { data: childUnits } = await supabase
            .from('units')
            .select('id')
            .or(`id.eq.${prof.unit_id},parent_id.eq.${prof.unit_id}`);
          const allowedUnitIds = (childUnits || []).map((u) => u.id);

          const { count } = await supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('approval_status', 'PENDING')
            .in('unit_id', allowedUnitIds.length > 0 ? allowedUnitIds : [prof.unit_id]);
          setPendingUsersCount(count || 0);
        }
      }

      // C. Query notifikasi tugas personal
      const { data: notifsData, count: notifsCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(20);

      if (notifsData) setNotifications(notifsData);
      
      const totalPending = isNaN(pendingUsersCount) ? 0 : pendingUsersCount;
      const totalPersonal = notifsCount || 0;
      setUnreadCount(totalPersonal + (totalPending > 0 ? 1 : 0));
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    if (!userId) return;
    fetchAllNotifs();

    // 2. Real-time Subscription: mendengarkan notifikasi & pendaftar baru
    const notifChannel = supabase
      .channel(`bell-live-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => fetchAllNotifs()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => fetchAllNotifs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notifChannel);
    };
  }, [userId]);

  const handleItemClick = async (notif: any) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notif.id);

    setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    setIsOpen(false);

    if (notif.action_link) {
      router.push(notif.action_link);
    }
  };

  const handleMarkAllRead = async () => {
    if (!userId || notifications.length === 0) return;

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    setNotifications([]);
    setUnreadCount(pendingUsersCount > 0 ? 1 : 0);
  };

  return (
    <div className="relative" id="tour-notif-btn">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifikasi Lonceng"
        className="w-9 h-9 rounded-full bg-white border border-stone-200/60 shadow-sm flex items-center justify-center text-stone-600 hover:bg-stone-50 transition-colors relative"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#DF3B68] text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-xs animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-84 sm:w-96 bg-white rounded-3xl shadow-xl border border-stone-200/70 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-stone-900">Notifikasi Sistem</h4>
              {unreadCount > 0 && (
                <span className="text-[10px] bg-[#DF3B68]/10 text-[#DF3B68] px-2 py-0.5 rounded-full font-semibold">
                  {unreadCount} Baru
                </span>
              )}
            </div>

            {notifications.length > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[10px] text-stone-500 hover:text-stone-800 flex items-center gap-1 font-medium transition-colors"
              >
                <CheckCheck className="w-3 h-3" /> Tandai personal dibaca
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-stone-100 py-1">
            {/* KARTU KHUSUS: APPROVAL PEGAWAI BARU */}
            {pendingUsersCount > 0 && (
              <div
                onClick={() => {
                  setIsOpen(false);
                  router.push('/admin/approvals');
                }}
                className="my-1.5 p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80 hover:bg-amber-100/70 cursor-pointer transition-colors space-y-1 group"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                    <UserPlus className="w-3.5 h-3.5 text-[#DF3B68]" />
                    <span>Verifikasi Pegawai Baru</span>
                  </div>
                  <span className="text-[10px] bg-[#DF3B68] text-white px-2 py-0.5 rounded-full font-bold">
                    {pendingUsersCount} Menunggu
                  </span>
                </div>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  Terdapat <strong>{pendingUsersCount} pendaftar baru</strong> yang menunggu persetujuan akun Anda.
                </p>
                <div className="flex items-center gap-1 text-[10px] text-[#DF3B68] font-semibold pt-0.5 group-hover:underline">
                  <span>Buka Menu Verifikasi Pegawai</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </div>
              </div>
            )}

            {/* DAFTAR NOTIFIKASI PERSONAL */}
            {notifications.length === 0 && pendingUsersCount === 0 ? (
              <p className="text-xs text-stone-400 py-8 text-center">
                Belum ada notifikasi baru
              </p>
            ) : (
              notifications.map((n) => (
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
                  <span className="text-[9px] text-stone-400 block pt-0.5">
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
