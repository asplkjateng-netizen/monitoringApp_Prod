import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createClient();

  // 1. Periksa apakah user memiliki sesi aktif
  const { data: { user } } = await supabase.auth.getUser();

  // Jika belum login, langsung alihkan ke halaman login
  if (!user) {
    redirect('/login');
  }

  // 2. Jika sudah login, periksa status approval di tabel profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('approval_status')
    .eq('id', user.id)
    .single();

  // Jika status akun masih menunggu persetujuan atasan
  if (profile?.approval_status === 'PENDING') {
    redirect('/pending');
  }

  // Jika akun sudah disetujui, langsung arahkan ke Dashboard
  redirect('/dashboard');
}
