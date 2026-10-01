'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const redirectUrl = `${window.location.origin}/auth/callback?next=/update-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    setIsSubmitted(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white border border-stone-200/60 rounded-3xl p-8 shadow-soft">
        <div className="text-center mb-6">
          <span className="text-[11px] font-bold tracking-wider uppercase text-primary bg-primary/10 px-3 py-1 rounded-full">
            Pemulihan Akun
          </span>
          <h1 className="text-xl font-bold text-stone-900 mt-3">Lupa Kata Sandi</h1>
          <p className="text-xs text-stone-500 mt-1">
            Masukkan email terdaftar untuk menerima tautan pemulihan kata sandi
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs">
            {errorMsg}
          </div>
        )}

        {isSubmitted ? (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-stone-900">Email Pemulihan Terkirim</h2>
              <p className="text-xs text-stone-500 leading-relaxed">
                Tautan atur ulang kata sandi telah dikirim ke <span className="font-semibold text-stone-700">{email}</span>. Silakan periksa kotak masuk atau folder spam Anda.
              </p>
            </div>
            <Link href="/login" className="block pt-2">
              <Button variant="outline" className="w-full">
                Kembali ke Halaman Masuk
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleResetRequest} className="space-y-4">
            <Input
              label="Email Dinas"
              type="email"
              placeholder="nama@kemenkeu.go.id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Button type="submit" className="w-full mt-2" isLoading={loading}>
              <Mail className="w-4 h-4 mr-2" />
              Kirim Tautan Pemulihan
            </Button>

            <div className="text-center pt-2">
              <Link
                href="/login"
                className="inline-flex items-center text-xs font-medium text-stone-500 hover:text-stone-800 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Kembali ke Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
