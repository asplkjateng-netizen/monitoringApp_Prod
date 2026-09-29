import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  // 1. Validasi Bearer Token dari Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized: Invalid CRON_SECRET token', { status: 401 });
  }

  // 2. Gunakan Service Role Key untuk bypass RLS (karena dijalankan oleh cron bot)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 3. Eksekusi query ringan ke tabel units untuk mereset timer pause 7 hari Supabase Free-Tier
  const { data, error } = await supabase
    .from('units')
    .select('id, name')
    .limit(1);

  if (error) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }

  return NextResponse.json({ 
    success: true, 
    message: 'Supabase ping keep-alive successful', 
    timestamp: new Date().toISOString(),
    record_found: data?.length || 0
  });
}
