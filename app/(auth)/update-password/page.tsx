'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (password.length < 6) {
      setErrorMsg('Kata sandi minimal 6 karakter');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Konfirmasi kata sandi tidak cocok');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);

    setTimeout(() => {
      router.push('/dashboard');
      router.refresh();
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white border border-stone-200/60 rounded-3xl p-8 shadow-soft">
        <div className="text-center mb-6">
          <span className="text-[11px] font-bold tracking-wider uppercase text-primary bg-primary/10 px-3 py-1 rounded-full">
            Keamanan Akun
          </span>
          <h1 className="text-xl font-bold text-stone-900 mt-3">Kata Sandi Baru</h1>
          <p className="text-xs text-stone-500 mt-1">
            Tetapkan kata sandi baru untuk akun dinas Anda
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs">
            {errorMsg}
          </div>
        )}

        {success ? (
          <div className="text-center space-y-3 py-2">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-sm font-bold text-stone-900">Kata Sandi Berhasil Diperbarui!</h2>
            <p className="text-xs text-stone-500">
              Mengarahkan Anda ke Dashboard...
            </p>
          </div>
        ) : (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <Input
              label="Kata Sandi Baru"
              type="password"
              placeholder="Minimal 6 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Input
              label="Konfirmasi Kata Sandi Baru"
              type="password"
              placeholder="Ulangi kata sandi baru"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <Button type="submit" className="w-full mt-2" isLoading={loading}>
              <KeyRound className="w-4 h-4 mr-2" />
              Simpan Kata Sandi Baru
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
