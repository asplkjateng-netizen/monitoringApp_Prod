import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Daftar rute publik
  const isPublicRoute =
    path === '/login' ||
    path === '/register' ||
    path === '/forgot-password' ||
    path === '/update-password' ||
    path.startsWith('/auth') ||
    path.startsWith('/api/cron');

  // 1. Jika belum login dan mengakses rute privat
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // 2. Jika sudah login
  if (user) {
    // Ambil profil user untuk verifikasi status approval & hak akses admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_unit_admin, approval_status')
      .eq('id', user.id)
      .single();

    // A. Jika status masih PENDING atau REJECTED, kunci hanya boleh akses /pending
    if (profile && profile.approval_status !== 'APPROVED') {
      if (path !== '/pending' && !path.startsWith('/auth') && path !== '/login') {
        const url = request.nextUrl.clone();
        url.pathname = '/pending';
        return NextResponse.redirect(url);
      }
    }

    // B. Jika sudah APPROVED namun mengakses /pending atau rute auth -> alihkan ke /dashboard
    if (profile && profile.approval_status === 'APPROVED') {
      if (path === '/login' || path === '/register' || path === '/forgot-password' || path === '/pending') {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
      }

      // C. Proteksi Rute Administrasi (/admin/*): Hanya SUPER_ADMIN & is_unit_admin
      if (path.startsWith('/admin')) {
        const hasAdminAccess = profile.role === 'SUPER_ADMIN' || profile.is_unit_admin === true;
        if (!hasAdminAccess) {
          const url = request.nextUrl.clone();
          url.pathname = '/dashboard';
          return NextResponse.redirect(url);
        }
      }
    }
  }

  return supabaseResponse;
}
