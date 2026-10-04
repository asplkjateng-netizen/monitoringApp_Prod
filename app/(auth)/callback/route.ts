import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/dashboard';
  const verified = searchParams.get('verified');

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
              // Abaikan jika dipanggil dari server component
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const redirectUrl = new URL(next, origin);
      if (verified) {
        redirectUrl.searchParams.set('verified', 'true');
      }
      return NextResponse.redirect(redirectUrl.toString());
    }
  }

  // Jika gagal atau kode tidak valid
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
