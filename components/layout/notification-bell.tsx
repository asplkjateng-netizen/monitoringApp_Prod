'use client';
import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function NotificationBell({ userId }: { userId?: string }) {
  const supabase = createClient();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const fetchNotifs = async () => {
      const { data, count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (data) setNotifications(data);
      if (count !== null) setUnreadCount(count);
    };
    fetchNotifs();
  }, [userId, supabase]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-9 h-9 rounded-full bg-white border border-stone-200/60 shadow-sm flex items-center justify-center text-stone-600 hover:bg-stone-50 transition-colors relative"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-3xl shadow-xl border border-stone-200/70 p-4 z-50">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <h4 className="text-xs font-bold text-stone-900">Notifikasi Tugas</h4>
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
              {unreadCount} Baru
            </span>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-stone-50 py-1">
            {notifications.length === 0 ? (
              <p className="text-xs text-stone-400 py-6 text-center">Belum ada notifikasi baru</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="py-2.5 px-2 hover:bg-stone-50 rounded-xl cursor-pointer">
                  <p className="text-xs font-semibold text-stone-800">{n.title}</p>
                  <p className="text-[11px] text-stone-500 mt-0.5 line-clamp-2">{n.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
