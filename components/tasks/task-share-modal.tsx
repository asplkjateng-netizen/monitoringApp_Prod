'use client';

import { useState, useRef } from 'react';
import { 
  X, 
  Download, 
  Share2, 
  Copy, 
  Check, 
  Globe, 
  Lock, 
  MessageSquare, 
  Loader2, 
  AlertCircle,
  Eye
} from 'lucide-react';
import { TaskCardExport, TaskExportData } from './task-card-export';
import { createClient } from '@/lib/supabase/client';

interface TaskShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: TaskExportData & {
    share_token?: string;
    is_public_shared?: boolean;
  };
  onShareStatusChanged?: (isShared: boolean) => void;
}

// Helper: Muat html-to-image via CDN otomatis jika npm package belum terpasang
function loadHtmlToImageEngine(): Promise<any> {
  return new Promise(async (resolve, reject) => {
    // 1. Cek apakah sudah ada di window global
    if (typeof window !== 'undefined' && (window as any).htmlToImage) {
      return resolve((window as any).htmlToImage);
    }

    // 2. Coba import dari node_modules lokal
    try {
      // @ts-ignore
      const localModule = await import('html-to-image');
      if (localModule && localModule.toPng) {
        return resolve(localModule);
      }
    } catch (_) {
      // Modul lokal belum di-install, lanjutkan ke CDN fallback
    }

    // 3. Fallback CDN Otomatis (Cloudflare CDN / jsDelivr)
    if (typeof document !== 'undefined') {
      const existingScript = document.getElementById('html-to-image-cdn');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve((window as any).htmlToImage));
        existingScript.addEventListener('error', () => reject(new Error('Gagal memuat engine CDN')));
        return;
      }

      const script = document.createElement('script');
      script.id = 'html-to-image-cdn';
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js';
      script.async = true;
      script.onload = () => {
        if ((window as any).htmlToImage) {
          resolve((window as any).htmlToImage);
        } else {
          reject(new Error('Objek htmlToImage tidak ditemukan'));
        }
      };
      script.onerror = () => {
        // Coba mirror jsdelivr jika CDN utama gagal
        const backupScript = document.createElement('script');
        backupScript.src = 'https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js';
        backupScript.async = true;
        backupScript.onload = () => resolve((window as any).htmlToImage);
        backupScript.onerror = () => reject(new Error('Koneksi CDN terputus'));
        document.head.appendChild(backupScript);
      };
      document.head.appendChild(script);
    } else {
      reject(new Error('Browser environment tidak ditemukan'));
    }
  });
}

export function TaskShareModal({
  isOpen,
  onClose,
  task,
  onShareStatusChanged,
}: TaskShareModalProps) {
  const supabase = createClient();
  const exportCardRef = useRef<HTMLDivElement>(null);

  const [isPublic, setIsPublic] = useState(Boolean(task.is_public_shared));
  const [togglingPublic, setTogglingPublic] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [downloadingImg, setDownloadingImg] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  if (!isOpen) return null;

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const shareToken = task.share_token || task.id;
  const publicShareUrl = `${baseUrl}/share/task/${shareToken}`;

  // 1. Aksi Unduh Snapshot Gambar PNG (Menggunakan Dual-Engine)
  const handleDownloadImage = async () => {
    if (!exportCardRef.current) return;
    setDownloadingImg(true);
    setErrorMsg('');

    try {
      const engine = await loadHtmlToImageEngine();
      if (!engine || !engine.toPng) {
        throw new Error('Engine render gambar tidak tersedia.');
      }

      const dataUrl = await engine.toPng(exportCardRef.current, {
        quality: 0.98,
        pixelRatio: 2, // Resolusi 2x Ultra HD
        backgroundColor: '#FFFFFF',
      });

      const cleanTitle = (task.title || 'tugas')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .slice(0, 30);
      const fileName = `Kinerja-${cleanTitle}-${new Date().toISOString().slice(0, 10)}.png`;

      const link = document.createElement('a');
      link.download = fileName;
      link.href = dataUrl;
      link.click();
    } catch (err: any) {
      console.error('Gagal membuat gambar PNG:', err);
      setErrorMsg(
        'Gagal mengunduh gambar. Pastikan perangkat Anda terhubung ke internet untuk memuat renderer gambar.'
      );
    } finally {
      setDownloadingImg(false);
    }
  };

  // 2. Aksi Toggle Sakelar Publik (Supabase Update)
  const handleTogglePublicShare = async () => {
    setTogglingPublic(true);
    setErrorMsg('');
    const nextStatus = !isPublic;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          is_public_shared: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', task.id);

      if (error) {
        setErrorMsg('Gagal memperbarui status publik: ' + error.message);
      } else {
        setIsPublic(nextStatus);
        if (onShareStatusChanged) {
          onShareStatusChanged(nextStatus);
        }
      }
    } catch (err: any) {
      setErrorMsg('Terjadi kesalahan: ' + err.message);
    } finally {
      setTogglingPublic(false);
    }
  };

  // 3. Aksi Salin Tautan Publik
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicShareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      console.error('Gagal menyalin tautan:', err);
    }
  };

  // 4. Aksi Bagikan Ringkasan ke WhatsApp
  const handleShareToWhatsApp = () => {
    const totalSub = task.subtasks?.length || 0;
    const completedSub = task.subtasks?.filter((s) => s.is_completed).length || 0;
    const progressVal = task.status === 'SELESAI' ? 100 : task.progress_pct || 0;

    let waText = `*LEMBAR MONITORING TUGAS DINAS*\n`;
    waText += `----------------------------------------\n`;
    waText += `📌 *Uraian Tugas:* ${task.title}\n`;
    waText += `🏢 *Unit Kerja:* ${task.unit?.name || '-'}\n`;
    waText += `📅 *Batas Tenggat:* ${task.deadline}\n`;
    waText += `📊 *Status Progres:* ${progressVal}% (${task.status})\n`;
    waText += `📋 *Tahapan Sub-tugas:* ${completedSub}/${totalSub} Selesai\n`;

    if (task.pics && task.pics.length > 0) {
      const picNames = task.pics.map((p) => p.full_name).join(', ');
      waText += `👥 *PIC Pelaksana:* ${picNames}\n`;
    }

    if (task.kendala_note && task.status === 'TERKENDALA') {
      waText += `⚠️ *Catatan Kendala:* ${task.kendala_note}\n`;
    }

    if (isPublic) {
      waText += `\n🔗 *Lihat Progres Realtime (Tanpa Login):*\n${publicShareUrl}\n`;
    }

    waText += `\n_Dikirim otomatis via Gov-Task-Monitor_`;

    const encoded = encodeURIComponent(waText);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl p-6 shadow-2xl border border-stone-200 dark:border-slate-800 space-y-5 my-8">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-[#DF3B68] flex items-center justify-center border border-rose-200 dark:border-rose-900/50">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-slate-100">Pusat Berbagi Pekerjaan</h2>
              <p className="text-xs text-stone-400 dark:text-slate-500">Ekspor laporan, tautan publik, & WhatsApp</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. SEKSI TAUTAN PUBLIK READ-ONLY */}
        <div className="p-4 rounded-2xl bg-stone-50 dark:bg-slate-800/60 border border-stone-200/80 dark:border-slate-700/80 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {isPublic ? (
                <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Lock className="w-4 h-4 text-stone-400 dark:text-slate-500" />
              )}
              <div>
                <span className="text-xs font-bold text-stone-900 dark:text-slate-100 block">
                  Akses Tautan Publik (Read-Only)
                </span>
                <span className="text-[11px] text-stone-500 dark:text-slate-400">
                  {isPublic
                    ? 'Siapa pun yang memiliki tautan dapat melihat progres tugas ini tanpa login.'
                    : 'Tautan saat ini dikunci. Hanya staf berwenang yang dapat melihat.'}
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={togglingPublic}
              onClick={handleTogglePublicShare}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isPublic ? 'bg-emerald-500' : 'bg-stone-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isPublic ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Kotak Input Salin Link */}
          {isPublic && (
            <div className="pt-2 flex items-center gap-2 animate-in fade-in duration-150">
              <input
                type="text"
                readOnly
                value={publicShareUrl}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-xl font-mono text-stone-700 dark:text-slate-300 select-all"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-2 rounded-xl bg-stone-900 dark:bg-slate-100 hover:bg-stone-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>
          )}
        </div>

        {/* 2. TOMBOL AKSI CEPAT (PNG & WA) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Tombol Unduh PNG */}
          <button
            type="button"
            disabled={downloadingImg}
            onClick={handleDownloadImage}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-white dark:bg-slate-800 hover:bg-stone-50 dark:hover:bg-slate-700 border border-stone-200 dark:border-slate-700 text-stone-800 dark:text-slate-200 text-xs font-bold transition-all shadow-xs"
          >
            {downloadingImg ? (
              <Loader2 className="w-4 h-4 text-[#DF3B68] animate-spin" />
            ) : (
              <Download className="w-4 h-4 text-[#DF3B68]" />
            )}
            <span>Unduh Kartu Gambar (PNG)</span>
          </button>

          {/* Tombol Bagikan WhatsApp */}
          <button
            type="button"
            onClick={handleShareToWhatsApp}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Bagikan Ringkasan ke WA</span>
          </button>
        </div>

        {/* 3. TOGGLE PREVIEW KARTU GAMBAR RESMI */}
        <div className="pt-2 border-t border-stone-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="text-[11px] font-semibold text-stone-500 dark:text-slate-400 hover:text-[#DF3B68] flex items-center gap-1.5 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{showPreview ? 'Tutup Pratinjau Gambar KOP Dinas' : 'Lihat Pratinjau Format KOP Dinas'}</span>
          </button>

          {showPreview && (
            <div className="mt-3 p-3 bg-stone-100 dark:bg-slate-950 rounded-2xl overflow-x-auto border border-stone-200 dark:border-slate-800 max-h-72">
              <div className="scale-75 origin-top-left -mr-40 -mb-28">
                <TaskCardExport task={task} />
              </div>
            </div>
          )}
        </div>

        {/* Offscreen Node Khusus Snapshot Resolusi Tinggi */}
        <div className="fixed -left-[9999px] -top-[9999px] pointer-events-none opacity-0">
          <TaskCardExport ref={exportCardRef} task={task} />
        </div>

      </div>
    </div>
  );
}
