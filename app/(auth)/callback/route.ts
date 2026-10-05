import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
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
              // Diabaikan pada Server Component
            }
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.user) {
      // Periksa status persetujuan profil
      const { data: profile } = await supabase
        .from('profiles')
        .select('approval_status, role')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profile?.role === 'SUPER_ADMIN' || profile?.approval_status === 'APPROVED') {
        return NextResponse.redirect(`${origin}/dashboard`);
      } else if (profile?.approval_status === 'PENDING') {
        return NextResponse.redirect(`${origin}/pending`);
      } else {
        return NextResponse.redirect(`${origin}/dashboard`);
      }
    }
  }

  // Jika gagal atau tautan expired
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
