import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function computeCycleDeadline(
  periodType: string,
  deadlineRule: string | null,
  exactDay: number | null,
  now: Date
): string {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1 - 12
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
    const currentQuarter = Math.ceil(currentMonth / 3);
    const quarterEndMonth = currentQuarter * 3; // 3, 6, 9, 12
    const quarterStartMonth = (currentQuarter - 1) * 3 + 1; // 1, 4, 7, 10

    if (rule === 'END_OF_PERIOD') {
      targetMonth = quarterEndMonth;
    } else if (rule === 'NEXT_MONTH_DATE') {
      targetMonth = quarterEndMonth + 1;
      if (targetMonth > 12) {
        targetMonth = 1;
        targetYear += 1;
      }
    } else if (rule === 'SAME_MONTH_DATE') {
      targetMonth = quarterStartMonth;
    } else {
      targetMonth = currentMonth;
    }
  } else if (periodType === 'SEMESTERAN') {
    const isSem1 = currentMonth <= 6;
    const semEndMonth = isSem1 ? 6 : 12;
    const semStartMonth = isSem1 ? 1 : 7;

    if (rule === 'END_OF_PERIOD') {
      targetMonth = semEndMonth;
    } else if (rule === 'NEXT_MONTH_DATE') {
      targetMonth = semEndMonth + 1;
      if (targetMonth > 12) {
        targetMonth = 1;
        targetYear += 1;
      }
    } else if (rule === 'SAME_MONTH_DATE') {
      targetMonth = semStartMonth;
    } else {
      targetMonth = currentMonth;
    }
  } else if (periodType === 'TAHUNAN') {
    if (rule === 'END_OF_PERIOD') {
      targetMonth = 12;
    } else if (rule === 'NEXT_MONTH_DATE') {
      targetMonth = 1;
      targetYear += 1;
    } else if (rule === 'SAME_MONTH_DATE') {
      targetMonth = 1;
    }
  }

  // Hitung jumlah hari maksimal dalam bulan target
  const daysInTargetMonth = new Date(targetYear, targetMonth, 0).getDate();
  const finalDay = day >= 31 ? daysInTargetMonth : Math.min(day, daysInTargetMonth);

  return `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(finalDay).padStart(2, '0')}`;
}

export async function GET(request: Request) {
  // 1. Validasi Bearer Token
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized: Invalid CRON_SECRET token', { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 2. Keep-Alive Ping
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
  let archivedTasksCount = 0;
  let purgedNotificationsCount = 0;

  // 3. [BACKLOG-4] Recurring Task Generator (Tiap Tanggal 1)
  if (currentDay === 1) {
    try {
      const eligiblePeriods: string[] = ['BULANAN'];
      if ([1, 4, 7, 10].includes(currentMonth)) eligiblePeriods.push('TRIWULANAN');
      if ([1, 7].includes(currentMonth)) eligiblePeriods.push('SEMESTERAN');
      if (currentMonth === 1) eligiblePeriods.push('TAHUNAN');

      const { data: recurringTemplates } = await supabase
        .from('task_templates')
        .select('*')
        .eq('is_recurring', true)
        .in('period_type', eligiblePeriods);

      if (recurringTemplates && recurringTemplates.length > 0) {
        for (const tpl of recurringTemplates) {
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
              const { data: unitLeaders } = await supabase
                .from('profiles')
                .select('id')
                .eq('unit_id', tpl.created_by_unit)
                .in('role', ['KEPALA_SEKSI', 'KEPALA_UNIT', 'SUPER_ADMIN']);

              if (unitLeaders && unitLeaders.length > 0) {
                const notifPayloads = unitLeaders.map((u) => ({
                  user_id: u.id,
                  title: `🔄 Tugas Rutin Baru Terbit: ${tpl.title}`,
                  message: `Tugas siklus ${tpl.period_type} periode ${currentMonth}/${currentYear} telah diterbitkan. Tenggat: ${calculatedDeadline}.`,
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
      console.error('Error recurring generator:', recurringErr);
    }
  }

  // 4. Archiving Engine
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: completedTasks } = await supabase
      .from('tasks')
      .select(`
        id, unit_id, template_id, title, legal_basis, period_type, period_month,
        period_year, deadline, completed_at, evidence_link, kendala_note,
        profiles:created_by (full_name),
        task_pics (profiles (id, full_name, nip)),
        subtasks (title, is_completed, custom_evidence_link)
      `)
      .eq('status', 'SELESAI')
      .lte('completed_at', thirtyDaysAgo);

    if (completedTasks && completedTasks.length > 0) {
      for (const t of completedTasks) {
        const picsSummary = (t.task_pics || []).map((tp: any) => ({
          id: tp.profiles?.id,
          name: tp.profiles?.full_name,
          nip: tp.profiles?.nip,
        }));

        const subtasksSummary = (t.subtasks || []).map((st: any) => ({
          title: st.title,
          done: st.is_completed,
          evidence: st.custom_evidence_link || null,
        }));

        const archiveRecord = {
          id: t.id,
          unit_id: t.unit_id,
          template_id: t.template_id,
          title: t.title,
          legal_basis: t.legal_basis,
          period_type: t.period_type,
          period_month: t.period_month,
          period_year: t.period_year,
          deadline: t.deadline,
          completed_at: t.completed_at,
          evidence_link: t.evidence_link,
          kendala_note: t.kendala_note,
          created_by_name: (t.profiles as any)?.full_name || 'Sistem',
          pics_summary: picsSummary,
          subtasks_summary: subtasksSummary,
          archived_at: new Date().toISOString(),
        };

        const { error: archiveError } = await supabase.from('task_archives').upsert(archiveRecord);

        if (!archiveError) {
          await supabase.from('tasks').delete().eq('id', t.id);
          archivedTasksCount++;
        }
      }
    }
  } catch (archiveErr) {
    console.error('Error saat pengarsipan tugas:', archiveErr);
  }

  // 5. Notification Purge
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const { error: purgeReadErr } = await supabase
      .from('notifications')
      .delete()
      .eq('is_read', true)
      .lte('created_at', thirtyDaysAgo);

    const { error: purgeUnreadErr } = await supabase
      .from('notifications')
      .delete()
      .eq('is_read', false)
      .lte('created_at', ninetyDaysAgo);

    if (!purgeReadErr && !purgeUnreadErr) {
      purgedNotificationsCount++;
    }
  } catch (purgeErr) {
    console.error('Error membersihkan notifikasi usang:', purgeErr);
  }

  // 6. Pengecekan Deadline H-1
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
            message: `Tugas "${t.title}" akan jatuh tempo besok (${t.deadline}). Pastikan bukti dukung telah diunggah.`,
            action_link: `/tasks/${t.id}`,
            is_read: false,
          }));

          await supabase.from('notifications').insert(notificationsPayload);
          deadlineAlertsSent += notificationsPayload.length;
        }
      }
    }
  } catch (alertErr) {
    console.error('Error notifikasi deadline H-1:', alertErr);
  }

  return NextResponse.json({
    success: true,
    message: 'Cron job maintenance completed successfully',
    timestamp: new Date().toISOString(),
    keep_alive_ping: pingData ? 'OK' : 'EMPTY',
    recurring_tasks_generated: generatedTasksCount,
    tasks_archived: archivedTasksCount,
    notifications_purged: purgedNotificationsCount > 0 ? 'CLEANED' : 'NO_OP',
    deadline_alerts_generated: deadlineAlertsSent,
  });
}
