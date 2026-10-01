'use client';

import { useState, useEffect, Suspense } from 'react';
import { 
  Search, 
  Download, 
  Printer, 
  Archive, 
  CheckCircle2, 
  ExternalLink,
  Filter,
  FileSpreadsheet
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface UnifiedTaskReport {
  id: string;
  title: string;
  legal_basis?: string | null;
  period_type: string;
  period_month?: number | null;
  period_year: number;
  deadline: string;
  completed_at?: string | null;
  status: string;
  progress_pct: number;
  evidence_link?: string | null;
  kendala_note?: string | null;
  pics_names: string;
  source: 'ACTIVE' | 'ARCHIVE';
  unit_name?: string;
}

function ReportsContent() {
  const supabase = createClient();
  const [data, setData] = useState<UnifiedTaskReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [unitInfo, setUnitInfo] = useState<{ id: string; name: string } | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedPeriod, setSelectedPeriod] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'ACTIVE' | 'ARCHIVE'>('ALL');

  useEffect(() => {
    fetchReportData();
  }, [selectedYear, selectedPeriod]);

  const fetchReportData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('unit_id, units(id, name)')
        .eq('id', user.id)
        .single();

      if (profile?.unit_id) {
        setUnitInfo({
          id: profile.unit_id,
          name: (profile.units as any)?.name || 'Unit Kerja',
        });

        // 1. Ambil Data Tugas Berjalan
        let activeQuery = supabase
          .from('tasks')
          .select(`
            id, title, legal_basis, period_type, period_month, period_year,
            deadline, completed_at, status, progress_pct, evidence_link, kendala_note,
            task_pics(profiles(full_name))
          `)
          .eq('unit_id', profile.unit_id)
          .eq('period_year', selectedYear);

        // 2. Ambil Data Arsip Historis
        let archiveQuery = supabase
          .from('task_archives')
          .select('*')
          .eq('unit_id', profile.unit_id)
          .eq('period_year', selectedYear);

        const [activeRes, archiveRes] = await Promise.all([activeQuery, archiveQuery]);

        const combinedList: UnifiedTaskReport[] = [];

        // Petakan Data Aktif
        if (activeRes.data) {
          activeRes.data.forEach((t: any) => {
            const pics = (t.task_pics || [])
              .map((tp: any) => tp.profiles?.full_name)
              .filter(Boolean)
              .join(', ');

            combinedList.push({
              id: t.id,
              title: t.title,
              legal_basis: t.legal_basis,
              period_type: t.period_type,
              period_month: t.period_month,
              period_year: t.period_year,
              deadline: t.deadline,
              completed_at: t.completed_at,
              status: t.status,
              progress_pct: t.progress_pct || 0,
              evidence_link: t.evidence_link,
              kendala_note: t.kendala_note,
              pics_names: pics || '-',
              source: 'ACTIVE',
            });
          });
        }

        // Petakan Data Arsip
        if (archiveRes.data) {
          archiveRes.data.forEach((a: any) => {
            const pics = (a.pics_summary || [])
              .map((p: any) => p.name)
              .filter(Boolean)
              .join(', ');

            combinedList.push({
              id: a.id,
              title: a.title,
              legal_basis: a.legal_basis,
              period_type: a.period_type,
              period_month: a.period_month,
              period_year: a.period_year,
              deadline: a.deadline,
              completed_at: a.completed_at,
              status: 'SELESAI (ARSIP)',
              progress_pct: 100,
              evidence_link: a.evidence_link,
              kendala_note: a.kendala_note,
              pics_names: pics || '-',
              source: 'ARCHIVE',
            });
          });
        }

        setData(combinedList);
      }
    }
    setLoading(false);
  };

  // Filter Data
  const filteredData = data.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      (item.legal_basis && item.legal_basis.toLowerCase().includes(search.toLowerCase())) ||
      item.pics_names.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (sourceFilter !== 'ALL' && item.source !== sourceFilter) return false;

    const month = item.period_month || (item.deadline ? new Date(item.deadline).getMonth() + 1 : 0);

    switch (selectedPeriod) {
      case 'TW_1': return [1, 2, 3].includes(month);
      case 'TW_2': return [4, 5, 6].includes(month);
      case 'TW_3': return [7, 8, 9].includes(month);
      case 'TW_4': return [10, 11, 12].includes(month);
      case 'SEM_1': return [1, 2, 3, 4, 5, 6].includes(month);
      case 'SEM_2': return [7, 8, 9, 10, 11, 12].includes(month);
      case 'TAHUNAN': return item.period_type === 'TAHUNAN';
      default: return true;
    }
  });

  // Fungsi Ekspor CSV Kompatibel Microsoft Excel (UTF-8 BOM)
  const exportToCSV = () => {
    const headers = [
      'No',
      'Uraian Tugas',
      'Dasar Hukum',
      'Siklus',
      'Tahun',
      'Batas Tenggat',
      'Tanggal Selesai',
      'Status',
      'Progres (%)',
      'Pelaksana (PIC)',
      'Bukti Dukung (URL)',
      'Tipe Data',
    ];

    const rows = filteredData.map((item, index) => [
      index + 1,
      `"${(item.title || '').replace(/"/g, '""')}"`,
      `"${(item.legal_basis || '-').replace(/"/g, '""')}"`,
      item.period_type,
      item.period_year,
      item.deadline,
      item.completed_at ? item.completed_at.split('T')[0] : '-',
      item.status,
      `${item.progress_pct}%`,
      `"${(item.pics_names || '-').replace(/"/g, '""')}"`,
      `"${(item.evidence_link || '-').replace(/"/g, '""')}"`,
      item.source === 'ARCHIVE' ? 'Arsip Historis' : 'Tugas Berjalan',
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Laporan_Kinerja_${unitInfo?.name || 'Unit'}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const totalTasks = filteredData.length;
  const completedTasks = filteredData.filter((t) => t.status.includes('SELESAI')).length;
  const complianceRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Halaman (Disembunyikan saat cetak) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Laporan & Riwayat Kinerja</h1>
          <p className="text-sm text-stone-500 mt-1">
            Rekapitulasi komprehensif tugas berjalan dan arsip historis {unitInfo ? `(${unitInfo.name})` : ''}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportToCSV}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" /> Ekspor Excel (CSV)
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 bg-stone-800 hover:bg-stone-900 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" /> Cetak Laporan (PDF)
          </button>
        </div>
      </div>

      {/* KOP RESMI LAPORAN (HANYA MUNCUL SAAT DICETAK) */}
      <div className="hidden print:block text-center border-b-2 border-stone-800 pb-4 mb-6">
        <h2 className="text-base font-bold uppercase tracking-wider">KEMENTERIAN KEUANGAN REPUBLIK INDONESIA</h2>
        <h3 className="text-sm font-semibold uppercase">{unitInfo?.name || 'DIREKTORAT JENDERAL PERBENDAHARAAN'}</h3>
        <p className="text-xs text-stone-600 mt-1">
          LAPORAN CAPAIAN KINERJA DAN KEPATUHAN INTERNAL TAHUN {selectedYear}
        </p>
      </div>

      {/* Ringkasan Metrik (Disembunyikan saat cetak) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
        <div className="bg-white p-4 rounded-2xl border border-stone-200/70 shadow-sm">
          <p className="text-xs font-semibold text-stone-400">TOTAL TUGAS TEREKAM</p>
          <p className="text-2xl font-bold text-stone-900 mt-1">{totalTasks}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-stone-200/70 shadow-sm">
          <p className="text-xs font-semibold text-stone-400">TOTAL TUNTAS (SELESAI / ARSIP)</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{completedTasks}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-stone-200/70 shadow-sm">
          <p className="text-xs font-semibold text-stone-400">TINGKAT KEPATUHAN PENYELESAIAN</p>
          <p className="text-2xl font-bold text-primary mt-1">{complianceRate}%</p>
        </div>
      </div>

      {/* Filter Bar (Disembunyikan saat cetak) */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200/70 shadow-sm space-y-3 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari tugas / dasar hukum / PIC..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 text-xs bg-stone-50 rounded-xl border border-stone-200 text-stone-700"
          >
            {[0, 1, 2].map((offset) => {
              const y = new Date().getFullYear() - offset;
              return <option key={y} value={y}>Tahun Anggaran {y}</option>;
            })}
          </select>

          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 text-xs bg-stone-50 rounded-xl border border-stone-200 text-stone-700"
          >
            <option value="ALL">Semua Siklus</option>
            <option value="TW_1">Triwulan I</option>
            <option value="TW_2">Triwulan II</option>
            <option value="TW_3">Triwulan III</option>
            <option value="TW_4">Triwulan IV</option>
            <option value="SEM_1">Semester I</option>
            <option value="SEM_2">Semester II</option>
            <option value="TAHUNAN">Tahunan</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as any)}
            className="px-3 py-2 text-xs bg-stone-50 rounded-xl border border-stone-200 text-stone-700"
          >
            <option value="ALL">Semua Data (Aktif + Arsip)</option>
            <option value="ACTIVE">Tugas Berjalan Saja</option>
            <option value="ARCHIVE">Arsip Historis Saja</option>
          </select>
        </div>
      </div>

      {/* Tabel Laporan & History */}
      <div className="bg-white rounded-3xl border border-stone-200/70 shadow-sm overflow-hidden print:border-none print:shadow-none">
        {loading ? (
          <div className="py-20 text-center text-xs text-stone-400">Memuat laporan rekapitulasi...</div>
        ) : filteredData.length === 0 ? (
          <div className="py-20 text-center text-xs text-stone-400">
            Tidak ada riwayat pekerjaan ditemukan untuk parameter filter ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-700 border-collapse">
              <thead className="bg-stone-50 text-stone-500 font-semibold border-b border-stone-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3.5 text-center w-10">No</th>
                  <th className="p-3.5 min-w-[200px]">Uraian Tugas & Dasar Hukum</th>
                  <th className="p-3.5">Siklus</th>
                  <th className="p-3.5">Tenggat</th>
                  <th className="p-3.5">Pelaksana (PIC)</th>
                  <th className="p-3.5 text-center">Status / Progres</th>
                  <th className="p-3.5 text-center print:hidden">Bukti Dukung</th>
                  <th className="p-3.5 text-center">Sumber</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredData.map((item, index) => (
                  <tr key={item.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="p-3.5 text-center text-stone-400 font-medium">{index + 1}</td>
                    <td className="p-3.5">
                      <p className="font-semibold text-stone-900">{item.title}</p>
                      {item.legal_basis && (
                        <p className="text-[11px] text-stone-400 mt-0.5">{item.legal_basis}</p>
                      )}
                    </td>
                    <td className="p-3.5 whitespace-nowrap font-medium text-stone-600">
                      {item.period_type}
                    </td>
                    <td className="p-3.5 whitespace-nowrap text-stone-600">
                      {item.deadline}
                    </td>
                    <td className="p-3.5 text-stone-600">
                      {item.pics_names}
                    </td>
                    <td className="p-3.5 text-center whitespace-nowrap">
                      {item.status.includes('SELESAI') ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Selesai
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-stone-100 text-stone-700 border border-stone-200">
                          {item.status} ({item.progress_pct}%)
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-center whitespace-nowrap print:hidden">
                      {item.evidence_link ? (
                        <a
                          href={item.evidence_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
                        >
                          Lihat Bukti
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-stone-300">-</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center whitespace-nowrap">
                      {item.source === 'ARCHIVE' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <Archive className="w-3 h-3" /> Arsip
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                          Aktif
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* LEMBAR PENGESAHAN LAPORAN (HANYA MUNCUL SAAT CETAK PDF) */}
      <div className="hidden print:grid grid-cols-2 gap-8 pt-10 mt-6 border-t border-stone-300 text-xs">
        <div className="text-center">
          <p className="font-semibold text-stone-600">Mengetahui,</p>
          <p className="font-bold text-stone-900 mt-0.5">Kepala Unit Kerja</p>
          <div className="h-16" />
          <p className="font-bold underline text-stone-900">( .................................................. )</p>
          <p className="text-stone-500">NIP. ..................................................</p>
        </div>
        <div className="text-center">
          <p className="font-semibold text-stone-600">Semarang, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p className="font-bold text-stone-900 mt-0.5">Penanggung Jawab Kepatuhan Internal</p>
          <div className="h-16" />
          <p className="font-bold underline text-stone-900">( .................................................. )</p>
          <p className="text-stone-500">NIP. ..................................................</p>
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-stone-400">Memuat laporan...</div>}>
      <ReportsContent />
    </Suspense>
  );
}
