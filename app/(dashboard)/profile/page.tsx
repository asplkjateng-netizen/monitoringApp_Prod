'use client';

import { useState, useEffect } from 'react';
import { 
  User, 
  Building2, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle,
  BadgeCheck
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface UserProfile {
  id: string;
  full_name: string;
  nip: string;
  employment_status: string;
  role: string;
  approval_status: string;
  unit: {
    id: string;
    name: string;
    code: string;
    level: string;
    parent_id: string | null;
  } | null;
}

export default function ProfilePage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [email, setEmail] = useState<string>('');
  const [parentUnitName, setParentUnitName] = useState<string>('');

  // Form states
  const [fullName, setFullName] = useState('');
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      setEmail(user.email || '');

      // Ambil data profil inti secara mandiri
      const { data: profData, error } = await supabase
        .from('profiles')
        .select('id, full_name, nip, employment_status, role, approval_status, unit_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!error && profData) {
        setFullName(profData.full_name || '');

        let unitObj = null;
        if (profData.unit_id) {
          const { data: uData } = await supabase
            .from('units')
            .select('id, name, code, level, parent_id')
            .eq('id', profData.unit_id)
            .maybeSingle();

          if (uData) {
            unitObj = uData;
            // Ambil nama unit induk jika ada
            if (uData.parent_id) {
              const { data: parent } = await supabase
                .from('units')
                .select('name')
                .eq('id', uData.parent_id)
                .maybeSingle();
              if (parent) setParentUnitName(parent.name);
            }
          }
        }

        setProfile({
          ...profData,
          unit: unitObj
        });
      }
    }
    setLoading(false);
  };

  // Format NIP 18 Digit: YYYYMMDD YYYYMM D NNN
  const formatNIP = (nip: string) => {
    if (!nip || nip.length !== 18) return nip || '-';
    return `${nip.slice(0, 8)} ${nip.slice(8, 14)} ${nip.slice(14, 15)} ${nip.slice(15, 18)}`;
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !fullName.trim()) return;

    setIsUpdatingName(true);
    setNameSuccess(false);

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim(), updated_at: new Date().toISOString() })
      .eq('id', profile.id);

    if (!error) {
      setNameSuccess(true);
      setProfile((prev) => prev ? { ...prev, full_name: fullName.trim() } : null);
      setTimeout(() => setNameSuccess(false), 3000);
    }
    setIsUpdatingName(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Password minimal terdiri dari 6 karakter.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Konfirmasi password tidak cocok.' });
      return;
    }

    setIsUpdatingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setPasswordMessage({ type: 'error', text: error.message });
    } else {
      setPasswordMessage({ type: 'success', text: 'Password berhasil diperbarui!' });
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMessage(null), 4000);
    }
    setIsUpdatingPassword(false);
  };

  if (loading) {
    return <div className="p-8 text-center text-sm text-stone-400">Memuat profil pegawai...</div>;
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Profil Pegawai</h1>
        <p className="text-xs text-stone-500 mt-1">
          Informasi identitas kepegawaian, unit kerja aktif, dan pengaturan keamanan akun.
        </p>
      </div>

      {/* Kartu Ringkasan Akun */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200/70 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-[#DF3B68] font-bold text-2xl">
            {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-stone-900">{profile?.full_name || 'Nama Belum Diisi'}</h2>
              {profile?.approval_status === 'APPROVED' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <BadgeCheck className="w-3.5 h-3.5" /> Terverifikasi
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500">Email: {email}</p>
            <p className="text-xs font-mono text-stone-600">NIP: {formatNIP(profile?.nip || '')}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-stone-100 text-stone-700 font-medium">
            Role: <span className="font-bold text-[#DF3B68]">{profile?.role || 'STAF'}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-stone-100 text-stone-700 font-medium">
            Status: <span className="font-bold">{profile?.employment_status || '-'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Kolom Kiri: Penempatan Unit & Edit Nama */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-stone-200/70 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-stone-900 font-bold text-sm border-b border-stone-100 pb-3">
              <Building2 className="w-4 h-4 text-[#DF3B68]" />
              <span>Unit Penempatan Kerja</span>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <p className="text-stone-400 font-medium">Seksi / Subbagian Aktif</p>
                <p className="font-semibold text-stone-900 text-sm mt-0.5">{profile?.unit?.name || '-'}</p>
                <p className="text-[11px] text-stone-400 font-mono mt-0.5">Kode: {profile?.unit?.code || '-'}</p>
              </div>
              {parentUnitName && (
                <div className="pt-2 border-t border-stone-100">
                  <p className="text-stone-400 font-medium">Unit Induk (Eselon III / KPPN)</p>
                  <p className="font-semibold text-stone-800 mt-0.5">{parentUnitName}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-stone-200/70 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-stone-900 font-bold text-sm border-b border-stone-100 pb-3">
              <User className="w-4 h-4 text-[#DF3B68]" />
              <span>Perbarui Nama Lengkap</span>
            </div>
            <form onSubmit={handleUpdateName} className="space-y-4">
              <Input
                label="Nama Lengkap Beserta Gelar"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
              {nameSuccess && (
                <div className="text-[11px] text-emerald-600 flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Nama berhasil disimpan.
                </div>
              )}
              <Button
                type="submit"
                isLoading={isUpdatingName}
                className="w-full bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs py-2"
              >
                Simpan Perubahan
              </Button>
            </form>
          </div>
        </div>

        {/* Kolom Kanan: Pengaturan Keamanan Password */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200/70 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-stone-900 font-bold text-sm border-b border-stone-100 pb-3">
            <KeyRound className="w-4 h-4 text-[#DF3B68]" />
            <span>Ganti Kata Sandi</span>
          </div>
          <p className="text-xs text-stone-500">
            Pastikan kata sandi baru Anda minimal terdiri dari 6 karakter dengan kombinasi angka dan huruf yang aman.
          </p>

          <form onSubmit={handleUpdatePassword} className="space-y-4 pt-1">
            <Input
              type="password"
              label="Kata Sandi Baru"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <Input
              type="password"
              label="Konfirmasi Kata Sandi Baru"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            {passwordMessage && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  passwordMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {passwordMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{passwordMessage.text}</span>
              </div>
            )}

            <Button
              type="submit"
              isLoading={isUpdatingPassword}
              className="w-full bg-[#DF3B68] hover:bg-[#C72F58] text-white rounded-xl text-xs py-2 shadow-sm"
            >
              Perbarui Kata Sandi
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
