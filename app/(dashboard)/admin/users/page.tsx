'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Edit3, 
  Building2, 
  ShieldCheck, 
  X, 
  CheckCircle2, 
  AlertCircle,
  ArrowRightLeft,
  UserCheck,
  UserX
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

  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Modal Mutasi & Edit State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ProfileItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form Edit State
  const [fullName, setFullName] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus>('PNS');
  const [role, setRole] = useState<UserRole>('STAF');
  const [unitId, setUnitId] = useState('');
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>('APPROVED');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    // Ambil daftar unit untuk opsi mutasi
    const { data: unitData } = await supabase
      .from('units')
      .select('id, name, code, level')
      .order('level', { ascending: true })
      .order('name', { ascending: true });

    if (unitData) setUnits(unitData);

    // Ambil daftar profil pegawai beserta data unit
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        nip,
        employment_status,
        role,
        unit_id,
        approval_status,
        created_at,
        unit:units (
          id,
          name,
          code,
          level
        )
      `)
      .order('full_name', { ascending: true });

    if (!error && profileData) {
      setProfiles(profileData as any);
    }

    setLoading(false);
  };

  const openEditModal = (user: ProfileItem) => {
    setSelectedUser(user);
    setFullName(user.full_name);
    setEmploymentStatus(user.employment_status);
    setRole(user.role);
    setUnitId(user.unit_id);
    setApprovalStatus(user.approval_status);
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

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        employment_status: employmentStatus,
        role,
        unit_id: unitId,
        approval_status: approvalStatus,
        updated_at: new Date().toISOString(),
      })
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

  const formatNIP = (nip: string) => {
    if (!nip || nip.length !== 18) return nip || '-';
    return `${nip.slice(0, 8)} ${nip.slice(8, 14)} ${nip.slice(14, 15)} ${nip.slice(15, 18)}`;
  };

  const getRoleBadge = (r: UserRole) => {
    switch (r) {
      case 'SUPER_ADMIN':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">SUPER ADMIN</span>;
      case 'KEPALA_UNIT':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">KEPALA UNIT</span>;
      case 'KEPALA_SEKSI':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">KEPALA SEKSI</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-stone-100 text-stone-700 border border-stone-200">STAF</span>;
    }
  };

  const getApprovalBadge = (st: ApprovalStatus) => {
    switch (st) {
      case 'APPROVED':
        return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200"><UserCheck className="w-3 h-3" /> Aktif</span>;
      case 'PENDING':
        return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">Pending</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200"><UserX className="w-3 h-3" /> Ditolak</span>;
    }
  };

  const filteredProfiles = profiles.filter((p) => {
    const matchesSearch = 
      p.full_name.toLowerCase().includes(search.toLowerCase()) || 
      p.nip.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || p.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Manajemen Pegawai & Mutasi</h1>
        <p className="text-xs text-stone-500 mt-1">
          Daftar seluruh pegawai terdaftar, pengelolaan hak akses jabatan, dan mutasi unit/seksi kerja.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter & Live Search Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-stone-200/70 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama atau 18 digit NIP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-stone-50/60 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        {/* Tab Filter Role */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'ALL', label: 'Semua Role' },
            { id: 'SUPER_ADMIN', label: 'Admin' },
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
            <p className="text-stone-500 font-medium text-xs">Tidak ada data pegawai yang cocok</p>
            <p className="text-stone-400 text-[11px]">Silakan periksa kata kunci pencarian atau filter role Anda.</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {filteredProfiles.map((user) => (
              <div
                key={user.id}
                className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-stone-50/60 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {user.full_name?.substring(0, 2).toUpperCase() || 'U'}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-stone-900 text-sm">{user.full_name}</h3>
                      {getRoleBadge(user.role)}
                      {getApprovalBadge(user.approval_status)}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-stone-500">
                      <span className="font-mono text-[11px] text-stone-600">NIP: {formatNIP(user.nip)}</span>
                      <span>•</span>
                      <span className="font-semibold text-stone-700">{user.employment_status}</span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 text-stone-600">
                        <Building2 className="w-3.5 h-3.5 text-stone-400" />
                        {user.unit?.name || 'Belum ada unit'} ({user.unit?.code || '-'})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="self-end md:self-center">
                  <Button
                    onClick={() => openEditModal(user)}
                    variant="outline"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-stone-700 hover:bg-stone-100"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-primary" />
                    <span>Mutasi & Role</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Mutasi & Update Data Pegawai */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-stone-200/80 shadow-2xl p-6 md:p-8 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-stone-900 text-sm md:text-base">
                  Mutasi & Perubahan Jabatan
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-stone-400 hover:bg-stone-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

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
                <p className="text-[10px] text-stone-400">NIP 18 digit terikat unik pada akun autentikasi.</p>
              </div>

              {/* Status Kepegawaian & Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 text-left">
                  <label className="block text-xs font-semibold text-stone-600">Status Kepegawaian</label>
                  <select
                    value={employmentStatus}
                    onChange={(e) => setEmploymentStatus(e.target.value as EmploymentStatus)}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                  <label className="block text-xs font-semibold text-stone-600">Role / Hak Akses</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="STAF">STAF</option>
                    <option value="KEPALA_SEKSI">KEPALA SEKSI</option>
                    <option value="KEPALA_UNIT">KEPALA UNIT</option>
                    <option value="SUPER_ADMIN">SUPER ADMIN</option>
                  </select>
                </div>
              </div>

              {/* Unit Penempatan (Mutasi) */}
              <div className="space-y-1 text-left">
                <label className="block text-xs font-semibold text-stone-600">Unit / Seksi Penempatan (Mutasi) *</label>
                <select
                  value={unitId}
                  onChange={(e) => setUnitId(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">-- Pilih Unit Kerja --</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      [{u.level}] {u.name} ({u.code})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-stone-400">
                  Mengubah unit akan memindahkan akses tugas dan delegasi PIC pegawai ke unit baru.
                </p>
              </div>

              {/* Status Verifikasi Akun */}
              <div className="space-y-1 text-left">
                <label className="block text-xs font-semibold text-stone-600">Status Akun</label>
                <select
                  value={approvalStatus}
                  onChange={(e) => setApprovalStatus(e.target.value as ApprovalStatus)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="APPROVED">APPROVED (Dapat Masuk Sistem)</option>
                  <option value="PENDING">PENDING (Layar Tunggu Persetujuan)</option>
                  <option value="REJECTED">REJECTED (Akses Ditolak)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  isLoading={isSubmitting}
                  className="bg-primary hover:bg-primary-hover text-white font-semibold"
                >
                  Simpan Mutasi & Role
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
