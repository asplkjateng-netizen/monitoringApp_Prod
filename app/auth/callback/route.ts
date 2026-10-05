import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/pending';
  const origin = requestUrl.origin;

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Diabaikan jika dipanggil dari server component
            }
          },
        },
      }
    );

    // Tukar kode auth Supabase dengan sesi aktif
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.user) {
      // Cek status persetujuan user di profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('approval_status, role')
        .eq('id', data.user.id)
        .maybeSingle();

      // Jika Super Admin atau sudah disetujui, arahkan ke Dashboard
      if (profile?.role === 'SUPER_ADMIN' || profile?.approval_status === 'APPROVED') {
        return NextResponse.redirect(`${origin}/dashboard`);
      }

      // Jika user baru / masih PENDING, arahkan ke halaman pending
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Jika kode tidak valid atau gagal
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
