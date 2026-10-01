'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white border border-stone-200/60 rounded-3xl p-8 shadow-soft">
        <div className="text-center mb-6">
          <span className="text-[11px] font-bold tracking-wider uppercase text-primary bg-primary/10 px-3 py-1 rounded-full">
            Portal Masuk
          </span>
          <h1 className="text-xl font-bold text-stone-900 mt-3">Gov-Task-Monitor</h1>
          <p className="text-xs text-stone-500 mt-1">Masuk untuk memantau capaian tugas instansi</p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <Input 
            label="Email" 
            type="email" 
            placeholder="nama@kemenkeu.go.id"
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />

          <div>
            <Input 
              label="Password" 
              type="password" 
              placeholder="••••••••"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
            <div className="flex justify-end mt-2">
              <Link 
                href="/forgot-password" 
                className="text-[11px] font-medium text-stone-500 hover:text-primary transition-colors cursor-pointer"
              >
                Lupa kata sandi?
              </Link>
            </div>
          </div>

          <Button type="submit" className="w-full mt-2" isLoading={loading}>
            Masuk
          </Button>
        </form>

        <p className="text-center text-xs text-stone-500 mt-6">
          Belum terdaftar?{' '}
          <Link href="/register" className="text-primary font-semibold hover:underline cursor-pointer">
            Daftar akun baru
          </Link>
        </p>
      </div>
    </div>
  );
}
