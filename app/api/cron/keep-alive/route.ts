import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Helper menghitung deadline untuk tugas yang digenerate Cron
function computeCycleDeadline(
  periodType: string,
  deadlineRule: string | null,
  exactDay: number | null,
  now: Date
): string {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  const rule = deadlineRule || 'END_OF_PERIOD';
  const day = exactDay || 31;

  let targetYear = currentYear;
  let targetMonth = currentMonth;

  if (periodType === 'BULANAN') {
    if (rule === 'NEXT_MONTH_DATE') {
      targetMonth = currentMonth + 1;
      if (targetMonth > 12) {
        targetMonth = 1;
        targetYear += 1;
      }
    } else {
      targetMonth = currentMonth;
    }
  } else if (periodType === 'TRIWULANAN') {
    const quarter = Math.ceil(currentMonth / 3);
    const quarterEndMonth = quarter * 3;
    if (rule === 'END_OF_PERIOD') {
      targetMonth = quarterEndMonth;
    } else if (rule === 'NEXT_MONTH_DATE') {
      targetMonth = quarterEndMonth + 1;
      if (targetMonth > 12) {
        targetMonth = 1;
        targetYear += 1;
      }
    } else {
      targetMonth = currentMonth;
    }
  } else if (periodType === 'SEMESTERAN') {
    const semesterEndMonth = currentMonth <= 6 ? 6 : 12;
    if (rule === 'END_OF_PERIOD') {
      targetMonth = semesterEndMonth;
    } else if (rule === 'NEXT_MONTH_DATE') {
      targetMonth = semesterEndMonth + 1;
      if (targetMonth > 12) {
        targetMonth = 1;
        targetYear += 1;
      }
    } else {
      targetMonth = currentMonth;
    }
  } else if (periodType === 'TAHUNAN') {
    if (rule === 'END_OF_PERIOD') {
      targetMonth = 12;
    } else if (rule === 'NEXT_MONTH_DATE') {
      targetMonth = 1;
      targetYear += 1;
    }
  }

  const daysInTargetMonth = new Date(targetYear, targetMonth, 0).getDate();
  const finalDay = rule === 'END_OF_PERIOD' || day >= 31 ? daysInTargetMonth : Math.min(day, daysInTargetMonth);

  return `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(finalDay).padStart(2, '0')}`;
}

export async function GET(request: Request) {
  // 1. Validasi Bearer Token
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized: Invalid CRON_SECRET token', { status: 401 });
  }

  // 2. Service Role Client untuk bypass RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 3. Keep-Alive Ping
  const { data: pingData, error: pingError } = await supabase
    .from('units')
    .select('id')
    .limit(1);

  if (pingError) {
    return NextResponse.json({ success: false, error: pingError.message }, { status: 500 });
  }

  const now = new Date();
  const currentDay = now.getDate();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  let generatedTasksCount = 0;

  // 4. [BACKLOG-4] Recurring Task Generator Engine
  // Jalankan generator pada tanggal 1 setiap bulan
  if (currentDay === 1) {
    try {
      // Tentukan siklus periode yang berhak dibangkitkan hari ini
      const eligiblePeriods: string[] = ['BULANAN'];

      // Awal Triwulan (1 Jan, 1 Apr, 1 Jul, 1 Okt)
      if ([1, 4, 7, 10].includes(currentMonth)) {
        eligiblePeriods.push('TRIWULANAN');
      }

      // Awal Semester (1 Jan, 1 Jul)
      if ([1, 7].includes(currentMonth)) {
        eligiblePeriods.push('SEMESTERAN');
      }

      // Awal Tahun (1 Jan)
      if (currentMonth === 1) {
        eligiblePeriods.push('TAHUNAN');
      }

      // Ambil seluruh master template yang aktif berulang
      const { data: recurringTemplates } = await supabase
        .from('task_templates')
        .select('*')
        .eq('is_recurring', true)
        .in('period_type', eligiblePeriods);

      if (recurringTemplates && recurringTemplates.length > 0) {
        for (const tpl of recurringTemplates) {
          // Cek apakah tugas periode ini sudah pernah dibuat sebelumnya (anti-duplicate)
          const { data: existingTask } = await supabase
            .from('tasks')
            .select('id')
            .eq('template_id', tpl.id)
            .eq('unit_id', tpl.created_by_unit)
            .eq('period_year', currentYear)
            .eq('period_month', currentMonth)
            .maybeSingle();

          if (!existingTask) {
            const calculatedDeadline = computeCycleDeadline(
              tpl.period_type,
              tpl.deadline_rule,
              tpl.exact_day,
              now
            );

            // Insert tugas baru
            const { data: newTask, error: insertError } = await supabase
              .from('tasks')
              .insert({
                unit_id: tpl.created_by_unit,
                template_id: tpl.id,
                title: tpl.title,
                description: tpl.description,
                legal_basis: tpl.legal_basis,
                period_type: tpl.period_type,
                period_month: currentMonth,
                period_year: currentYear,
                deadline: calculatedDeadline,
                status: 'BELUM_DIKERJAKAN',
                progress_pct: 0,
              })
              .select('id')
              .single();

            if (!insertError && newTask) {
              generatedTasksCount++;

              // Beri notifikasi ke atasan / pimpinan unit kerja
              const { data: unitLeaders } = await supabase
                .from('profiles')
                .select('id')
                .eq('unit_id', tpl.created_by_unit)
                .in('role', ['KEPALA_SEKSI', 'KEPALA_UNIT', 'SUPER_ADMIN']);

              if (unitLeaders && unitLeaders.length > 0) {
                const notifPayloads = unitLeaders.map((u) => ({
                  user_id: u.id,
                  title: `🔄 Tugas Rutin Baru Terbit: ${tpl.title}`,
                  message: `Tugas siklus ${tpl.period_type} telah dibangkitkan otomatis untuk periode ${currentMonth}/${currentYear}. Batas tenggat: ${calculatedDeadline}.`,
                  action_link: `/tasks/${newTask.id}`,
                  is_read: false,
                }));
                await supabase.from('notifications').insert(notifPayloads);
              }
            }
          }
        }
      }
    } catch (recurringErr) {
      console.error('Error saat membangkitkan tugas rutin:', recurringErr);
    }
  }

  // 5. [BACKLOG-1] Pengecekan Deadline H-1
  let deadlineAlertsSent = 0;
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const { data: impendingTasks } = await supabase
      .from('tasks')
      .select('id, title, deadline, status')
      .eq('deadline', tomorrowStr)
      .neq('status', 'SELESAI');

    if (impendingTasks && impendingTasks.length > 0) {
      for (const t of impendingTasks) {
        const { data: pics } = await supabase
          .from('task_pics')
          .select('user_id')
          .eq('task_id', t.id);

        if (pics && pics.length > 0) {
          const notificationsPayload = pics.map((p) => ({
            user_id: p.user_id,
            title: `⏰ Pengingat Tenggat Waktu (H-1)`,
            message: `Tugas "${t.title}" akan jatuh tempo besok (${t.deadline}). Pastikan tahapan pekerjaan tuntas dan bukti dukung telah diunggah.`,
            action_link: `/tasks/${t.id}`,
            is_read: false,
          }));

          await supabase.from('notifications').insert(notificationsPayload);
          deadlineAlertsSent += notificationsPayload.length;
        }
      }
    }
  } catch (alertErr) {
    console.error('Error saat memproses notifikasi deadline H-1:', alertErr);
  }

  return NextResponse.json({
    success: true,
    message: 'Supabase ping, recurring generator, and deadline check completed',
    timestamp: new Date().toISOString(),
    keep_alive_ping: pingData ? 'OK' : 'EMPTY',
    recurring_tasks_generated: generatedTasksCount,
    deadline_alerts_generated: deadlineAlertsSent,
  });
}
