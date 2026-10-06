import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendWhatsAppMessage } from '@/lib/fonnte';

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
    const quarterEndMonth = currentQuarter * 3;
    const quarterStartMonth = (currentQuarter - 1) * 3 + 1;

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

  const daysInTargetMonth = new Date(targetYear, targetMonth, 0).getDate();
  const finalDay = day >= 31 ? daysInTargetMonth : Math.min(day, daysInTargetMonth);

  return `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(finalDay).padStart(2, '0')}`;
}

export async function GET(request: Request) {
  // 1. Validasi Bearer Token Keamanan Cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized: Token CRON_SECRET tidak valid', { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://monitoring-app-prod.vercel.app';

  // 2. Keep-Alive Ping Database
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
  const todayStr = now.toISOString().split('T')[0];

  let generatedTasksCount = 0;
  let archivedTasksCount = 0;
  let purgedNotificationsCount = 0;
  let waMessagesSentCount = 0;
  let inAppAlertsSentCount = 0;

  // 3. AUTO-GENERATE TUGAS PERIODIK: HANYA BERLAKU UNTUK KLERIKAL (is_recurring = true)
  // Pekerjaan non-klerikal (is_recurring = false) atau INSIDENTIL mutlak diabaikan
  if (currentDay === 1) {
    try {
      const eligiblePeriods: string[] = ['BULANAN'];
      if ([1, 4, 7, 10].includes(currentMonth)) eligiblePeriods.push('TRIWULANAN');
      if ([1, 7].includes(currentMonth)) eligiblePeriods.push('SEMESTERAN');
      if (currentMonth === 1) eligiblePeriods.push('TAHUNAN');

      // Filter ketat: is_recurring = true (Klerikal Rutin)
      const { data: clericalTemplates } = await supabase
        .from('task_templates')
        .select('*')
        .eq('is_recurring', true)
        .in('period_type', eligiblePeriods);

      if (clericalTemplates && clericalTemplates.length > 0) {
        for (const tpl of clericalTemplates) {
          if (!tpl.created_by_unit) continue;

          // Cek apakah tugas periode ini sudah pernah terbit
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
                category: tpl.category || 'TUSI',
                description: tpl.description,
                legal_basis: tpl.legal_basis,
                legal_basis_link: tpl.legal_basis_link,
                period_type: tpl.period_type,
                period_month: currentMonth,
                period_year: currentYear,
                deadline: calculatedDeadline,
                critical_days_threshold: tpl.critical_days_threshold || 3,
                status: 'BELUM_DIKERJAKAN',
                progress_pct: 0,
              })
              .select('id')
              .single();

            if (!insertError && newTask) {
              generatedTasksCount++;
              
              // Notifikasi in-app kepada Pimpinan/Kasi unit terkait
              const { data: leaders } = await supabase
                .from('profiles')
                .select('id')
                .eq('unit_id', tpl.created_by_unit)
                .in('role', ['KEPALA_SEKSI', 'KEPALA_UNIT', 'SUPER_ADMIN']);

              if (leaders && leaders.length > 0) {
                const notifs = leaders.map((u) => ({
                  user_id: u.id,
                  title: `🔄 Tugas Rutin Klerikal Terbit: ${tpl.title}`,
                  message: `Siklus ${tpl.period_type} (${currentMonth}/${currentYear}) telah diterbitkan otomatis. Tenggat: ${calculatedDeadline}.`,
                  action_link: `/tasks/${newTask.id}`,
                  is_read: false,
                }));
                await supabase.from('notifications').insert(notifs);
              }
            }
          }
        }
      }
    } catch (recurringErr) {
      console.error('Error saat auto-generate klerikal:', recurringErr);
    }
  }

  // 4. [TAHAP IV] WHATSAPP DISPATCHER & IN-APP ALERT (MASA KRITIS H-X)
  try {
    const { data: activeTasks } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        category,
        deadline,
        critical_days_threshold,
        priority,
        status,
        wa_notified_at,
        unit:units(name),
        task_pics (
          profiles (
            id,
            full_name,
            phone_number,
            wa_notify_critical
          )
        )
      `)
      .neq('status', 'SELESAI');

    if (activeTasks && activeTasks.length > 0) {
      for (const task of activeTasks) {
        const deadlineDate = new Date(task.deadline);
        const todayDate = new Date(todayStr);

        const diffTime = deadlineDate.getTime() - todayDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const threshold = task.critical_days_threshold ?? 3;

        // Kriteria Masa Kritis: 0 <= sisa hari <= threshold
        const isCritical = diffDays >= 0 && diffDays <= threshold;
        const alreadyNotifiedToday = task.wa_notified_at === todayStr;

        if (isCritical && !alreadyNotifiedToday) {
          const pics = task.task_pics || [];
          let waSentForThisTask = false;

          for (const tp of pics) {
            const profile = (tp as any).profiles;
            if (!profile) continue;

            // In-app Alert
            await supabase.from('notifications').insert({
              user_id: profile.id,
              title: diffDays === 0 ? `🚨 BATAS HARI INI: ${task.title}` : `⏰ Masa Kritis (H-${diffDays}): ${task.title}`,
              message: `Pekerjaan "${task.title}" jatuh tempo ${diffDays === 0 ? 'hari ini' : `${diffDays} hari lagi (${task.deadline})`}. Mohon segera menyelesaikan dan mengunggah bukti dukung.`,
              action_link: `/tasks/${task.id}`,
              is_read: false,
            });
            inAppAlertsSentCount++;

            // WhatsApp Notification via Fonnte Gateway
            if (profile.wa_notify_critical && profile.phone_number) {
              const unitName = (task.unit as any)?.name || 'Unit Kerja';
              const sisaLabel = diffDays === 0 ? 'HARI INI (SEGERA)' : `${diffDays} hari kalender`;
              const detailUrl = `${appBaseUrl}/tasks/${task.id}`;

              const waMessage = 
`*PENGINGAT RESMI MASA KRITIS TUGAS* 🔔
_Sistem Monitoring Kinerja & Tusi_

Yth. *${profile.full_name}*,

Pekerjaan berikut telah memasuki masa kritis:
📋 *Uraian:* ${task.title}
🏷️ *Jenis:* ${task.category || 'Tusi Pokok'}
🏢 *Unit:* ${unitName}
⚡ *Prioritas:* ${task.priority || 'SEDANG'}
📅 *Batas Waktu:* *${task.deadline}* (Sisa ${sisaLabel})

Mohon segera menyelesaikan pekerjaan dan mengunggah bukti dukung melalui tautan berikut:
🔗 ${detailUrl}

_Pesan ini dikirim otomatis oleh Gov-Task-Monitor._`;

              const sendRes = await sendWhatsAppMessage(profile.phone_number, waMessage);
              if (sendRes.status) {
                waMessagesSentCount++;
                waSentForThisTask = true;
              }
            }
          }

          // Kunci status wa_notified_at agar tidak terkirim ganda pada hari yang sama
          if (waSentForThisTask) {
            await supabase
              .from('tasks')
              .update({ wa_notified_at: todayStr })
              .eq('id', task.id);
          }
        }
      }
    }
  } catch (waErr) {
    console.error('Error WhatsApp & Critical Alert Dispatcher:', waErr);
  }

  // 5. ARCHIVING ENGINE (Tugas selesai > 30 hari diarsipkan ke task_archives)
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: completedTasks } = await supabase
      .from('tasks')
      .select(`
        id, unit_id, template_id, title, category, legal_basis, legal_basis_link, period_type, period_month,
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
          category: t.category || 'TUSI',
          legal_basis: t.legal_basis,
          legal_basis_link: t.legal_basis_link,
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
    console.error('Error saat pengarsipan tugas usang:', archiveErr);
  }

  // 6. NOTIFICATION PURGE (Hemat kuota DB Supabase)
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    await supabase.from('notifications').delete().eq('is_read', true).lte('created_at', thirtyDaysAgo);
    await supabase.from('notifications').delete().eq('is_read', false).lte('created_at', ninetyDaysAgo);
    purgedNotificationsCount++;
  } catch (purgeErr) {
    console.error('Error purge notifikasi usang:', purgeErr);
  }

  return NextResponse.json({
    success: true,
    message: 'Cron job maintenance completed successfully',
    timestamp: new Date().toISOString(),
    keep_alive_ping: pingData ? 'OK' : 'EMPTY',
    clerical_tasks_generated: generatedTasksCount,
    wa_notifications_dispatched: waMessagesSentCount,
    in_app_alerts_created: inAppAlertsSentCount,
    tasks_archived: archivedTasksCount,
  });
}
