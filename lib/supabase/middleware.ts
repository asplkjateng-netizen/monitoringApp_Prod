import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');
  const isPendingPage = pathname === '/pending';
  const isPublicRoute = isAuthPage || pathname.startsWith('/api/');

  if (!user && !isPublicRoute && !isPendingPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user && !isPublicRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('approval_status')
      .eq('id', user.id)
      .single();

    if (profile?.approval_status === 'PENDING' && !isPendingPage) {
      const url = request.nextUrl.clone();
      url.pathname = '/pending';
      return NextResponse.redirect(url);
    }

    if (profile?.approval_status === 'APPROVED' && (isPendingPage || isAuthPage)) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
