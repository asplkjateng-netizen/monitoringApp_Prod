import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  // 1. Validasi Bearer Token dari Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized: Invalid CRON_SECRET token', { status: 401 });
  }

  // 2. Gunakan Service Role Key untuk bypass RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 3. Query keep-alive mereset timer pause 7 hari Supabase
  const { data: pingData, error: pingError } = await supabase
    .from('units')
    .select('id')
    .limit(1);

  if (pingError) {
    return NextResponse.json({ success: false, error: pingError.message }, { status: 500 });
  }

  // 4. [BACKLOG-1] Otomasi Deteksi Tugas Deadline H-1
  let deadlineAlertsSent = 0;
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0]; // Format 'YYYY-MM-DD'

    // Ambil tugas yang jatuh tempo besok dan belum tuntas
    const { data: impendingTasks } = await supabase
      .from('tasks')
      .select('id, title, deadline, status')
      .eq('deadline', tomorrowStr)
      .neq('status', 'SELESAI');

    if (impendingTasks && impendingTasks.length > 0) {
      for (const t of impendingTasks) {
        // Ambil seluruh PIC tugas tersebut
        const { data: pics } = await supabase
          .from('task_pics')
          .select('user_id')
          .eq('task_id', t.id);

        if (pics && pics.length > 0) {
          const notificationsPayload = pics.map((p) => ({
            user_id: p.user_id,
            title: `⏰ Pengingat Tenggat Waktu (H-1)`,
            message: `Tugas "${t.title}" akan jatuh tempo besok (${t.deadline}). Pastikan tahapan pekerjaan diselesaikan dan bukti dukung telah diunggah.`,
            action_link: `/tasks/${t.id}`,
            is_read: false,
          }));

          await supabase.from('notifications').insert(notificationsPayload);
          deadlineAlertsSent += notificationsPayload.length;
        }
      }
    }
  } catch (cronErr: any) {
    console.error('Error saat memproses notifikasi deadline H-1:', cronErr);
  }

  return NextResponse.json({
    success: true,
    message: 'Supabase ping & deadline check completed',
    timestamp: new Date().toISOString(),
    keep_alive_ping: pingData ? 'OK' : 'EMPTY',
    deadline_alerts_generated: deadlineAlertsSent,
  });
}
