import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID wajib disertakan' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Hapus akun permanen dari Supabase Auth
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId);

    // 2. Hapus dari tabel profiles (jika foreign key cascade belum aktif)
    await supabaseAdmin.from('profiles').delete().eq('id', userId);

    if (authErr && !authErr.message.includes('User not found')) {
      return NextResponse.json({ error: authErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Pegawai berhasil dihapus permanen' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
