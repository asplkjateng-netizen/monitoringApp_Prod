'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  User, 
  CreditCard, 
  Lock, 
  Mail, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  Clock,
  LogIn
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
  const supabase = createClient();

  // Unit Cascading States
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [selectedEselon2, setSelectedEselon2] = useState('');
  const [selectedEselon3, setSelectedEselon3] = useState('');
  const [selectedSeksi, setSelectedSeksi] = useState('');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [nip, setNip] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState('PNS');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

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

  // Ambil nama unit penempatan yang dipilih untuk teks konfirmasi
  const getSelectedUnitName = () => {
    const targetId = selectedSeksi || selectedEselon3 || selectedEselon2;
    const found = units.find((u) => u.id === targetId);
    return found ? found.name : 'Unit Terpilih';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Validasi NIP 18 Digit Standar BKN
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

    const finalUnitId = selectedSeksi || selectedEselon3 || selectedEselon2;
    if (!finalUnitId) {
      setErrorMsg('Silakan tentukan unit penempatan kerja Anda.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Daftarkan akun ke auth.users
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
          setErrorMsg('Email ini sudah terdaftar. Silakan gunakan email lain atau hubungi Super Admin.');
        } else {
          setErrorMsg(authError.message);
        }
        setIsLoading(false);
        return;
      }

      // Deteksi jika user sudah ada di Supabase Auth (mencegah error profiles_id_fkey)
      if (authData.user && authData.user.identities && authData.user.identities.length === 0) {
        setErrorMsg('Email ini sudah pernah terdaftar di autentikasi Supabase. Silakan minta Super Admin menghapus akun lama Anda di menu Authentication -> Users atau gunakan fitur Reset Password.');
        setIsLoading(false);
        return;
      }

      if (!authData.user) {
        setErrorMsg('Gagal memproses pendaftaran. Silakan coba sesaat lagi.');
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

      // Berhasil: Aktifkan layar pemberitahuan langkah-langkah
      setIsSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem saat mendaftar.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F6F0] flex items-center justify-center p-4 py-12">
      <div className="bg-white max-w-lg w-full rounded-3xl p-6 md:p-8 border border-stone-200/80 shadow-xl space-y-6">
        
        {/* ========================================================================= */}
        {/* TAMPILAN 1: SETELAH BERHASIL MENDAFTAR (PEMBERITAHUAN LANGKAH-LANGKAH)   */}
        {/* ========================================================================= */}
        {isSuccess ? (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl mx-auto flex items-center justify-center border border-emerald-200 shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Pendaftaran Berhasil!</h2>
              <p className="text-xs text-stone-500 max-w-xs mx-auto">
                Akun pegawai atas nama <strong>{fullName}</strong> telah berhasil direkam ke dalam sistem.
              </p>
            </div>

            {/* Kotak Panduan 3 Langkah Selanjutnya */}
            <div className="bg-stone-50/80 rounded-2xl p-5 border border-stone-200/70 space-y-4">
              <p className="text-[11px] font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-stone-200/60 pb-2">
                <Clock className="w-3.5 h-3.5 text-[#DF3B68]" />
                <span>3 Langkah Selanjutnya yang Wajib Dilakukan:</span>
              </p>

              {/* Langkah 1 */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#DF3B68] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-xs">
                  1
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-stone-900">Konfirmasi Email Dinas</h4>
                  <p className="text-[11px] text-stone-500 leading-relaxed">
                    Periksa kotak masuk (atau spam) email <strong>{email}</strong>. Klik tautan verifikasi yang dikirimkan oleh sistem untuk mengaktifkan akun.
                  </p>
                </div>
              </div>

              {/* Langkah 2 */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-xs">
                  2
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-stone-900">Verifikasi & Persetujuan Atasan</h4>
                  <p className="text-[11px] text-stone-500 leading-relaxed">
                    Kepala Seksi atau Admin Unit di <strong>{getSelectedUnitName()}</strong> akan memverifikasi penempatan kerja Anda melalui menu verifikasi pegawai.
                  </p>
                </div>
              </div>

              {/* Langkah 3 */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-xs">
                  3
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-stone-900">Mulai Mengakses Aplikasi</h4>
                  <p className="text-[11px] text-stone-500 leading-relaxed">
                    Setelah akun berstatus disetujui (*APPROVED*), Anda dapat masuk ke dasbor dan mengelola pemantauan tugas dinas.
                  </p>
                </div>
              </div>
            </div>

            {/* Tombol Aksi */}
            <div className="space-y-2 pt-1">
              <Link
                href="/login"
                className="w-full bg-[#DF3B68] hover:bg-[#C72F58] text-white py-2.5 rounded-xl text-xs font-semibold shadow-sm text-center flex items-center justify-center gap-2 transition-colors"
              >
                <LogIn className="w-4 h-4" /> Menuju Halaman Login
              </Link>
              <Link
                href="/pending"
                className="w-full bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 py-2.5 rounded-xl text-xs font-semibold text-center block transition-colors"
              >
                Cek Layar Status Persetujuan Akun
              </Link>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* TAMPILAN 2: FORMULIR PENDAFTARAN PEGAWAI                                   */
          /* ========================================================================= */
          <>
            <div className="text-center space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#DF3B68] bg-rose-50 px-3 py-1 rounded-full border border-rose-100">
                REGISTRASI PEGAWAI
              </span>
              <h1 className="text-2xl font-bold text-stone-900 tracking-tight mt-2">Gov-Task-Monitor</h1>
              <p className="text-xs text-stone-500">
                Daftarkan akun untuk verifikasi atasan unit
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

              {/* Cascading Dropdown Unit Organisasi Berjenjang */}
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
                    <option value="">-- Pilih Unit Eselon II --</option>
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
                      <option value="">-- Pilih Unit Eselon III --</option>
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

              {/* Data Akun & Sandi */}
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
          </>
        )}
      </div>
    </div>
  );
}
