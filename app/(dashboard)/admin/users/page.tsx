'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Building2, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRightLeft, 
  UserCheck, 
  UserX, 
  Shield, 
  Trash2, 
  Lock 
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type UserRole = 'SUPER_ADMIN' | 'KEPALA_UNIT' | 'KEPALA_SEKSI' | 'STAF';
type EmploymentStatus = 'PNS' | 'PPPK' | 'PPNPN' | 'ASN' | 'TNI' | 'POLRI';
type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface ProfileItem {
  id: string;
  full_name: string;
  nip: string;
  employment_status: EmploymentStatus;
  role: UserRole;
  is_unit_admin?: boolean;
  unit_id: string;
  approval_status: ApprovalStatus;
  created_at: string;
  unit?: {
    id: string;
    name: string;
    code: string;
    level: string;
  } | null;
}

interface UnitOption {
  id: string;
  name: string;
  code: string;
  level: string;
}

export default function UsersAdminPage() {
  const supabase = createClient();

  const [currentUser, setCurrentUser] = useState<ProfileItem | null>(null);
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ProfileItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form Edit State
  const [fullName, setFullName] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus>('PNS');
  const [role, setRole] = useState<UserRole>('STAF');
  const [isUnitAdmin, setIsUnitAdmin] = useState(false);
  const [unitId, setUnitId] = useState('');
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>('APPROVED');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('*, unit:units(*)')
        .eq('id', user.id)
        .maybeSingle();

      if (!currentProfile) {
        setLoading(false);
        return;
      }

      setCurrentUser(currentProfile as any);
      const isSuperAdmin = String(currentProfile.role).toUpperCase() === 'SUPER_ADMIN';

      if (isSuperAdmin) {
        const { data: unitData } = await supabase
          .from('units')
          .select('id, name, code, level')
          .order('level', { ascending: true })
          .order('name', { ascending: true });
        if (unitData) setUnits(unitData);
      } else {
        const { data: unitData } = await supabase
          .from('units')
          .select('id, name, code, level')
          .or(`id.eq.${currentProfile.unit_id},parent_id.eq.${currentProfile.unit_id}`)
          .order('name', { ascending: true });
        if (unitData) setUnits(unitData || []);
      }

      let profileQuery = supabase
        .from('profiles')
        .select('*, unit:units(id, name, code, level)')
        .order('full_name', { ascending: true });

      if (!isSuperAdmin) {
        const { data: childUnits } = await supabase
          .from('units')
          .select('id')
          .or(`id.eq.${currentProfile.unit_id},parent_id.eq.${currentProfile.unit_id}`);
        const allowedUnitIds = (childUnits || []).map((u) => u.id);

        profileQuery = profileQuery
          .in('unit_id', allowedUnitIds)
          .neq('role', 'SUPER_ADMIN');
      }

      const { data: profileData, error: listErr } = await profileQuery;
      if (listErr) {
        setErrorMsg('Gagal memuat daftar pegawai: ' + listErr.message);
      } else if (profileData) {
        setProfiles(profileData as any);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem saat memuat data');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (user: ProfileItem) => {
    setSelectedUser(user);
    setFullName(user.full_name || '');
    setEmploymentStatus(user.employment_status || 'PNS');
    setRole(user.role || 'STAF');
    setIsUnitAdmin(user.is_unit_admin || false);
    setUnitId(user.unit_id || '');
    setApprovalStatus(user.approval_status || 'APPROVED');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setErrorMsg('');

    if (!fullName.trim()) {
      setErrorMsg('Nama pegawai tidak boleh kosong.');
      return;
    }

    if (!unitId) {
      setErrorMsg('Unit penempatan kerja wajib ditentukan.');
      return;
    }

    setIsSubmitting(true);
    const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

    const payload: any = {
      full_name: fullName.trim(),
      employment_status: employmentStatus,
      unit_id: unitId,
      approval_status: approvalStatus,
      updated_at: new Date().toISOString(),
    };

    if (isSuperAdmin) {
      payload.role = role;
      payload.is_unit_admin = isUnitAdmin;
    } else {
      payload.role = role === 'SUPER_ADMIN' ? 'STAF' : role;
    }

    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', selectedUser.id);

    if (error) {
      setErrorMsg(`Gagal memperbarui data: ${error.message}`);
      setIsSubmitting(false);
      return;
    }

    setSuccessMsg(`Data kepegawaian "${fullName}" berhasil diperbarui.`);
    setIsSubmitting(false);
    setIsModalOpen(false);
    loadData();
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleDeleteUser = async (user: ProfileItem) => {
    if (user.id === currentUser?.id) {
      alert('Anda tidak dapat menghapus akun Anda sendiri.');
      return;
    }

    const confirmed = window.confirm(
      `Peringatan: Apakah Anda yakin ingin menghapus data pegawai "${user.full_name}" (${user.nip}) secara permanen?\n\nAkun akan dihapus dari autentikasi dan database.`
    );
    if (!confirmed) return;

    try {
      // Panggil endpoint penghapusan permanen dari auth.users dan profiles
      const res = await fetch('/api/admin/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!res.ok) {
        // Fallback jika API route gagal
        const { error: directErr } = await supabase.from('profiles').delete().eq('id', user.id);
        if (directErr) {
          alert(`Gagal menghapus pegawai: ${directErr.message}`);
          return;
        }
      }

      setSuccessMsg(`Akun pegawai "${user.full_name}" berhasil dihapus permanen.`);
      loadData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const formatNIP = (nip: string) => {
    if (!nip || nip.length !== 18) return nip || '-';
    return `${nip.slice(0, 8)} ${nip.slice(8, 14)} ${nip.slice(14, 15)} ${nip.slice(15, 18)}`;
  };

  const getRoleBadge = (r: UserRole, isAdmin?: boolean) => {
    if (r === 'SUPER_ADMIN') {
      return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">SUPER ADMIN</span>;
    }
    return (
      <div className="flex items-center gap-1">
        {r === 'KEPALA_UNIT' && (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">KEPALA UNIT</span>
        )}
        {r === 'KEPALA_SEKSI' && (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">KEPALA SEKSI</span>
        )}
        {r === 'STAF' && (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-stone-100 text-stone-700 border border-stone-200">STAF</span>
        )}
        {isAdmin && (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-50 text-[#DF3B68] border border-rose-200 flex items-center gap-0.5">
            <Shield className="w-2.5 h-2.5" /> ADMIN UNIT
          </span>
        )}
      </div>
    );
  };

  const getApprovalBadge = (st: ApprovalStatus) => {
    switch (st) {
      case 'APPROVED':
        return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200"><UserCheck className="w-3 h-3" /> Aktif</span>;
      case 'PENDING':
        return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">Pending</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200"><UserX className="w-3 h-3" /> Ditolak</span>;
    }
  };

  const filteredProfiles = profiles.filter((p) => {
    const fullNameLower = (p.full_name || '').toLowerCase();
    const nipStr = p.nip || '';
    const searchLower = search.toLowerCase();

    const matchesSearch = fullNameLower.includes(searchLower) || nipStr.includes(searchLower);
    const matchesRole = roleFilter === 'ALL' || p.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Manajemen Pegawai & Mutasi</h1>
        <p className="text-xs text-stone-500 mt-1">
          {currentUser?.role === 'SUPER_ADMIN'
            ? 'Pengelolaan master seluruh pegawai, penetapan Admin Unit, dan mutasi nasional.'
            : `Daftar pegawai di lingkungan ${currentUser?.unit?.name || 'unit kerja Anda'}.`}
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Toolbar Filter & Pencarian */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-stone-200/70 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama atau 18 digit NIP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-stone-50/60 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#DF3B68]/20"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'ALL', label: 'Semua Role' },
            ...(currentUser?.role === 'SUPER_ADMIN' ? [{ id: 'SUPER_ADMIN', label: 'Super Admin' }] : []),
            { id: 'KEPALA_UNIT', label: 'Kepala Unit' },
            { id: 'KEPALA_SEKSI', label: 'Kasi' },
            { id: 'STAF', label: 'Staf' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRoleFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                roleFilter === tab.id
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabel Pegawai */}
      <div className="bg-white rounded-3xl border border-stone-200/70 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs text-stone-400">Memuat data pegawai...</div>
        ) : filteredProfiles.length === 0 ? (
          <div className="py-20 text-center space-y-1">
            <Users className="w-8 h-8 text-stone-300 mx-auto" />
            <p className="text-stone-500 font-semibold text-xs">Tidak ada data pegawai yang cocok</p>
            <p className="text-stone-400 text-[11px]">Silakan periksa kata kunci pencarian atau filter role Anda.</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {filteredProfiles.map((user) => (
              <div
                key={user.id}
                className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-stone-50/60 transition-colors"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 text-[#DF3B68] border border-rose-100 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {user.full_name?.substring(0, 2).toUpperCase() || 'U'}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-stone-900 text-sm">{user.full_name}</h3>
                      {getRoleBadge(user.role, user.is_unit_admin)}
                      {getApprovalBadge(user.approval_status)}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-stone-500">
                      <span className="font-mono text-[11px] text-stone-600">NIP: {formatNIP(user.nip)}</span>
                      <span>•</span>
                      <span className="font-semibold text-stone-700">{user.employment_status}</span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 text-stone-600">
                        <Building2 className="w-3.5 h-3.5 text-stone-400" />
                        {user.unit?.name || 'Belum ada unit'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <Button
                    onClick={() => openEditModal(user)}
                    variant="outline"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-stone-700 hover:bg-stone-100"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-[#DF3B68]" />
                    <span>Kelola & Mutasi</span>
                  </Button>
                  <button
                    onClick={() => handleDeleteUser(user)}
                    className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors"
                    title="Hapus Akun Pegawai"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Mutasi */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-stone-200/80 shadow-2xl p-6 md:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-[#DF3B68]" />
                <h3 className="font-bold text-stone-900 text-sm md:text-base">
                  Kelola Data & Mutasi Pegawai
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-stone-400 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <Input
                label="Nama Lengkap Pegawai *"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />

              <div className="space-y-1 text-left">
                <label className="block text-xs font-semibold text-stone-600">Nomor Induk Pegawai (NIP)</label>
                <input
                  type="text"
                  disabled
                  value={formatNIP(selectedUser.nip)}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-100 text-xs text-stone-500 font-mono cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 text-left">
                  <label className="block text-xs font-semibold text-stone-600">Status Kepegawaian</label>
                  <select
                    value={employmentStatus}
                    onChange={(e) => setEmploymentStatus(e.target.value as EmploymentStatus)}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-800"
                  >
                    <option value="PNS">PNS</option>
                    <option value="PPPK">PPPK</option>
                    <option value="PPNPN">PPNPN</option>
                    <option value="ASN">ASN</option>
                    <option value="TNI">TNI</option>
                    <option value="POLRI">POLRI</option>
                  </select>
                </div>

                <div className="space-y-1 text-left">
                  <label className="block text-xs font-semibold text-stone-600">Role Jabatan</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-800"
                  >
                    <option value="STAF">STAF</option>
                    <option value="KEPALA_SEKSI">KEPALA SEKSI</option>
                    <option value="KEPALA_UNIT">KEPALA UNIT</option>
                    {currentUser?.role === 'SUPER_ADMIN' && (
                      <option value="SUPER_ADMIN">SUPER ADMIN</option>
                    )}
                  </select>
                </div>
              </div>

              {currentUser?.role === 'SUPER_ADMIN' ? (
                <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-[#DF3B68]" /> Akses Administrator Unit
                    </p>
                    <p className="text-[10px] text-stone-500">Berikan hak verifikasi pegawai dan kelola seksi di unitnya.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isUnitAdmin}
                    onChange={(e) => setIsUnitAdmin(e.target.checked)}
                    className="w-4 h-4 rounded text-[#DF3B68] focus:ring-[#DF3B68]"
                  />
                </div>
              ) : (
                selectedUser.is_unit_admin && (
                  <div className="p-2.5 bg-rose-50/60 rounded-xl border border-rose-100 flex items-center gap-2 text-[11px] text-[#DF3B68] font-medium">
                    <Lock className="w-3.5 h-3.5" /> Pegawai ini memiliki hak Administrator Unit.
                  </div>
                )
              )}

              <div className="space-y-1 text-left">
                <label className="block text-xs font-semibold text-stone-600">Unit / Seksi Penempatan (Mutasi) *</label>
                <select
                  value={unitId}
                  onChange={(e) => setUnitId(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-800"
                >
                  <option value="">-- Pilih Unit Penempatan --</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      [{u.level}] {u.name} ({u.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 text-left">
                <label className="block text-xs font-semibold text-stone-600">Status Akses Akun</label>
                <select
                  value={approvalStatus}
                  onChange={(e) => setApprovalStatus(e.target.value as ApprovalStatus)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-800"
                >
                  <option value="APPROVED">APPROVED (Aktif & Berhak Akses)</option>
                  <option value="PENDING">PENDING (Tertunda Verifikasi)</option>
                  <option value="REJECTED">REJECTED (Akses Ditolak/Dinonaktifkan)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" isLoading={isSubmitting} className="bg-[#DF3B68] hover:bg-[#C72F58] text-white font-semibold">
                  Simpan Perubahan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
