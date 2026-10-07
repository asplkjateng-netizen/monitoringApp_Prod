import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Whitelist Publik: Izinkan akses rute /share/** tanpa login/autentikasi
  if (pathname.startsWith('/share')) {
    return NextResponse.next();
  }

  // 2. Rute terproteksi lainnya diproses via updateSession Supabase
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
