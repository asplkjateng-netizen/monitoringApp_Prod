import { CheckCircle2, ShieldCheck, Database, Layers } from 'lucide-react';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xl bg-white border border-stone-200/60 rounded-3xl p-8 shadow-soft text-center space-y-6">
        {/* Floating Tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          INISIALISASI SISTEM BERHASIL
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
            Gov-Task-Monitor
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Sistem Monitoring Kinerja & Tusi Berjenjang Instansi Vertikal
          </p>
        </div>

        {/* Status Checklist Grid */}
        <div className="grid grid-cols-2 gap-3 text-left">
          <div className="p-3.5 rounded-2xl bg-canvas border border-stone-200/40 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-stone-800">Next.js 15 Ready</p>
              <p className="text-[11px] text-stone-400">App Router & React 19</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-canvas border border-stone-200/40 flex items-center gap-3">
            <Layers className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-stone-800">Tailwind Theme</p>
              <p className="text-[11px] text-stone-400">Warm Ivory & Crimson</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-canvas border border-stone-200/40 flex items-center gap-3">
            <Database className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-stone-800">Supabase DDL</p>
              <p className="text-[11px] text-stone-400">Skema & Types Siap</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-canvas border border-stone-200/40 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-primary flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-stone-800">Vercel Ready</p>
              <p className="text-[11px] text-stone-400">Keep-Alive Cron Config</p>
            </div>
          </div>
        </div>

        {/* Action Button Preview */}
        <div className="pt-2">
          <div className="inline-block px-6 py-2.5 rounded-full bg-primary text-white text-xs font-medium shadow-md">
            Menunggu Fase 2: Autentikasi & Approval
          </div>
        </div>
      </div>
    </main>
  );
}
