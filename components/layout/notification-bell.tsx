'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function NotificationBell({ userId }: { userId?: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // 1. Fetch data awal notifikasi
  const fetchNotifs = async () => {
    if (!userId) return;
    const { data, count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) setNotifications(data);
    if (count !== null) setUnreadCount(count);
  };

  useEffect(() => {
    if (!userId) return;
    fetchNotifs();

    // 2. Real-time Subscription: mendengarkan notifikasi baru seketika
    const channel = supabase
      .channel(`notifs-user-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchNotifs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // 3. Tandai satu notifikasi sebagai dibaca
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

  // 4. Tandai semua telah dibaca
  const handleMarkAllRead = async () => {
    if (!userId || notifications.length === 0) return;

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    setNotifications([]);
    setUnreadCount(0);
  };

  return (
    <div className="relative">
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
        <div className="absolute right-0 mt-2 w-84 sm:w-96 bg-white rounded-3xl shadow-xl border border-stone-200/70 p-4 z-50">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-stone-900">Notifikasi Sistem</h4>
              {unreadCount > 0 && (
                <span className="text-[10px] bg-[#DF3B68]/10 text-[#DF3B68] px-2 py-0.5 rounded-full font-semibold">
                  {unreadCount} Baru
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[10px] text-stone-500 hover:text-stone-800 flex items-center gap-1 font-medium transition-colors"
              >
                <CheckCheck className="w-3 h-3" /> Tandai semua dibaca
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-stone-100 py-1">
            {notifications.length === 0 ? (
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
