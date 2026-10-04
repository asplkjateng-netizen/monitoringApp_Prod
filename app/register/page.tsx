'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Mail, CheckCircle2, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CascadingUnitSelect } from '@/components/auth/cascading-unit-select';
import type { EmploymentStatus } from '@/types/database.types';

export default function RegisterPage() {
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [nip, setNip] = useState('');
  const [status, setStatus] = useState<EmploymentStatus>('PNS');
  const [unitId, setUnitId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!/^[0-9]{18}$/.test(nip)) {
      setErrorMsg('NIP wajib berupa 18 digit angka valid.');
      return;
    }

    if (!unitId) {
      setErrorMsg('Silakan pilih Seksi/Unit kerja sampai level akhir.');
      return;
    }

    setLoading(true);

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=/pending&verified=true`,
      },
    });

    if (authError || !authData.user) {
      setErrorMsg(authError?.message || 'Registrasi gagal, periksa koneksi atau email Anda.');
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      full_name: fullName,
      nip,
      employment_status: status,
      role: 'STAF',
      is_unit_admin: false,
      unit_id: unitId,
      approval_status: 'PENDING',
    });

    if (profileError) {
      setErrorMsg(profileError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setIsSuccess(true);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-stone-200/70 rounded-3xl p-8 shadow-soft text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
            <Mail className="w-7 h-7" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-stone-900">Registrasi Berhasil Terkirim!</h2>
            <p className="text-xs text-stone-500 mt-2 leading-relaxed">
              Tautan konfirmasi telah dikirim ke alamat email <span className="font-semibold text-stone-800">{email}</span>.
            </p>
          </div>

          <div className="bg-stone-50 border border-stone-200/60 rounded-2xl p-4 text-left space-y-2.5">
            <p className="text-xs font-bold text-stone-700">Langkah Berikutnya:</p>
            <div className="flex items-start gap-2 text-xs text-stone-600">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>Buka inbox / spam email Anda, lalu klik tombol konfirmasi.</span>
            </div>
            <div className="flex items-start gap-2 text-xs text-stone-600">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>Setelah email terverifikasi, akun akan otomatis masuk ke antrean verifikasi Administrator Unit/Super Admin.</span>
            </div>
          </div>

          <Link href="/pending" className="inline-flex w-full items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-full text-xs font-semibold hover:bg-primary-hover transition-colors">
            Lihat Status Akun Saya <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-stone-200/60 rounded-3xl p-8 shadow-soft">
        <div className="text-center mb-6">
          <span className="text-[11px] font-bold tracking-wider uppercase text-primary bg-primary/10 px-3 py-1 rounded-full">
            Registrasi Pegawai
          </span>
          <h1 className="text-xl font-bold text-stone-900 mt-3">Gov-Task-Monitor</h1>
          <p className="text-xs text-stone-500 mt-1">Daftarkan akun untuk verifikasi atasan unit</p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs leading-relaxed">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <Input label="Nama Lengkap & Gelar" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <Input label="NIP (18 Digit)" maxLength={18} placeholder="Contoh: 199001012015011001" value={nip} onChange={(e) => setNip(e.target.value.replace(/\D/g, ''))} required />
          
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">Status Kepegawaian</label>
            <select
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={status}
              onChange={(e) => setStatus(e.target.value as EmploymentStatus)}
            >
              {['PNS', 'PPPK', 'PPNPN', 'ASN', 'TNI', 'POLRI'].map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          <CascadingUnitSelect onSelectUnit={(id) => setUnitId(id)} />

          <Input label="Email Dinas / Pribadi" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

          <Button type="submit" className="w-full mt-2" isLoading={loading}>
            Daftar & Ajukan Verifikasi
          </Button>
        </form>

        <p className="text-center text-xs text-stone-500 mt-6">
          Sudah punya akun?{' '}
          <Link href="/login" className="text-primary font-semibold hover:underline">
            Masuk di sini
          </Link>
        </p>
      </div>
    </div>
  );
}
