import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// WAJIB: Memaksa Vercel menjalankan rute ini sebagai Serverless Function dinamis (mencegah 404)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/pending';

  // Tangani forwarded host untuk domain produksi Vercel
  const forwardedHost = request.headers.get('x-forwarded-host');
  const origin = forwardedHost 
    ? `https://${forwardedHost}` 
    : requestUrl.origin;

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
              // Diabaikan jika dipanggil dari server context
            }
          },
        },
      }
    );

    // Tukar kode autentikasi Supabase dengan sesi login aktif
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.user) {
      // Ambil profil pegawai untuk menentukan rute redirect
      const { data: profile } = await supabase
        .from('profiles')
        .select('approval_status, role')
        .eq('id', data.user.id)
        .maybeSingle();

      // Jika Super Admin atau sudah disetujui, langsung ke dashboard
      if (profile?.role === 'SUPER_ADMIN' || profile?.approval_status === 'APPROVED') {
        return NextResponse.redirect(`${origin}/dashboard`);
      }

      // Jika masih PENDING, arahkan ke layar tunggu persetujuan
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Jika kode verifikasi kedaluwarsa atau gagal
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
