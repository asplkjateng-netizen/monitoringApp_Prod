'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  User, 
  CreditCard, 
  Lock, 
  Mail, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface UnitOption {
  id: string;
  name: string;
  code: string;
  level: string;
  parent_id: string | null;
}

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [units, setUnits] = useState<UnitOption[]>([]);
  const [selectedEselon2, setSelectedEselon2] = useState('');
  const [selectedEselon3, setSelectedEselon3] = useState('');
  const [selectedSeksi, setSelectedSeksi] = useState('');

  const [fullName, setFullName] = useState('');
  const [nip, setNip] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState('PNS');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    const { data } = await supabase
      .from('units')
      .select('id, name, code, level, parent_id')
      .order('name');
    if (data) setUnits(data);
  };

  const eselon2List = units.filter((u) => u.level === 'ESELON_II');
  const eselon3List = units.filter((u) => u.parent_id === selectedEselon2);
  const seksiList = units.filter((u) => u.parent_id === selectedEselon3);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Validasi NIP 18 Digit
    if (!/^[0-9]{18}$/.test(nip)) {
      setErrorMsg('NIP wajib terdiri dari 18 digit angka standar BKN.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Kata sandi minimal terdiri dari 6 karakter.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    // Tentukan unit penempatan (paling spesifik)
    const finalUnitId = selectedSeksi || selectedEselon3 || selectedEselon2;
    if (!finalUnitId) {
      setErrorMsg('Silakan pilih unit penempatan kerja Anda.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Daftarkan kredensial akun ke Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            nip: nip.trim(),
          },
        },
      });

      if (authError) {
        if (authError.message.toLowerCase().includes('already registered')) {
          setErrorMsg('Email ini sudah terdaftar sebelumnya. Silakan gunakan email lain atau hubungi admin.');
        } else {
          setErrorMsg(authError.message);
        }
        setIsLoading(false);
        return;
      }

      // Deteksi jika email sudah ada di Supabase Auth
      if (authData.user && authData.user.identities && authData.user.identities.length === 0) {
        setErrorMsg('Email ini sudah pernah terdaftar di sistem autentikasi. Silakan masuk via halaman login.');
        setIsLoading(false);
        return;
      }

      if (!authData.user) {
        setErrorMsg('Gagal memproses pendaftaran. Silakan coba beberapa saat lagi.');
        setIsLoading(false);
        return;
      }

      // 2. Simpan profil dinas ke tabel profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          full_name: fullName.trim(),
          nip: nip.trim(),
          employment_status: employmentStatus as any,
          role: 'STAF',
          is_unit_admin: false,
          unit_id: finalUnitId,
          approval_status: 'PENDING',
        });

      if (profileError) {
        setErrorMsg(`Gagal merekam data profil: ${profileError.message}`);
        setIsLoading(false);
        return;
      }

      // Berhasil, arahkan ke halaman pending
      router.push('/pending?new_registration=true');
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem saat mendaftar.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F6F0] flex items-center justify-center p-4 py-12">
      <div className="bg-white max-w-lg w-full rounded-3xl p-6 md:p-8 border border-stone-200/80 shadow-xl space-y-6">
        <div className="text-center space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#DF3B68] bg-rose-50 px-3 py-1 rounded-full border border-rose-100">
            Registrasi Pegawai
          </span>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight mt-2">Gov-Task-Monitor</h1>
          <p className="text-xs text-stone-500">
            Daftarkan akun untuk verifikasi atasan unit kerja Anda.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nama Lengkap & Gelar *"
            placeholder="Contoh: Gita Kartika, S.E."
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="NIP (18 Digit) *"
              placeholder="199001012015011001"
              value={nip}
              onChange={(e) => setNip(e.target.value.replace(/\D/g, '').slice(0, 18))}
              required
            />

            <div className="space-y-1 text-left">
              <label className="block text-xs font-semibold text-stone-600">Status Kepegawaian *</label>
              <select
                value={employmentStatus}
                onChange={(e) => setEmploymentStatus(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20"
              >
                <option value="PNS">PNS</option>
                <option value="PPPK">PPPK</option>
                <option value="PPNPN">PPNPN</option>
                <option value="ASN">ASN</option>
                <option value="TNI">TNI</option>
                <option value="POLRI">POLRI</option>
              </select>
            </div>
          </div>

          {/* Cascading Dropdown Unit Organisasi */}
          <div className="space-y-3 pt-2 border-t border-stone-100">
            <div className="space-y-1 text-left">
              <label className="block text-xs font-semibold text-stone-600">Unit Eselon II (Kanwil) *</label>
              <select
                value={selectedEselon2}
                onChange={(e) => {
                  setSelectedEselon2(e.target.value);
                  setSelectedEselon3('');
                  setSelectedSeksi('');
                }}
                required
                className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20"
              >
                <option value="">-- Pilih Kantor Wilayah --</option>
                {eselon2List.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            {selectedEselon2 && (
              <div className="space-y-1 text-left">
                <label className="block text-xs font-semibold text-stone-600">Unit Eselon III (KPPN / Bidang) *</label>
                <select
                  value={selectedEselon3}
                  onChange={(e) => {
                    setSelectedEselon3(e.target.value);
                    setSelectedSeksi('');
                  }}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20"
                >
                  <option value="">-- Pilih KPPN / Bidang --</option>
                  {eselon3List.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            )}

            {selectedEselon3 && seksiList.length > 0 && (
              <div className="space-y-1 text-left">
                <label className="block text-xs font-semibold text-stone-600">Seksi / Subbagian Kerja</label>
                <select
                  value={selectedSeksi}
                  onChange={(e) => setSelectedSeksi(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20"
                >
                  <option value="">-- Pilih Seksi / Subbagian (Opsional jika Kasi/Kakantor) --</option>
                  {seksiList.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="space-y-3 pt-2 border-t border-stone-100">
            <Input
              type="email"
              label="Email Akun Dinas *"
              placeholder="pegawai@kemenkeu.go.id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                type="password"
                label="Kata Sandi *"
                placeholder="Minimal 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Input
                type="password"
                label="Konfirmasi Sandi *"
                placeholder="Ulangi kata sandi"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            isLoading={isLoading}
            className="w-full bg-[#DF3B68] hover:bg-[#C72F58] text-white py-2.5 rounded-xl text-xs font-semibold shadow-sm mt-2"
          >
            Daftarkan Akun Pegawai
          </Button>
        </form>

        <div className="text-center pt-2 border-t border-stone-100">
          <p className="text-xs text-stone-500">
            Sudah memiliki akun?{' '}
            <Link href="/login" className="font-bold text-[#DF3B68] hover:underline">
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
