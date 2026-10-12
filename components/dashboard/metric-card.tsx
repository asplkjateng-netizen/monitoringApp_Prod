import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  iconColor?: string;
  subLabel?: string;
  onClick?: () => void;
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  iconColor = "text-stone-400 dark:text-white/40",
  subLabel,
  onClick
}: MetricCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        // Tema Terang & Elevasi Level 1 Mode Gelap (#1E1E1E)
        "bg-white dark:bg-[#1E1E1E] border border-stone-200/70 dark:border-white/[0.08] rounded-3xl p-5 shadow-soft dark:shadow-dark-card transition-all duration-200",
        onClick && "cursor-pointer hover:border-primary/40 dark:hover:border-primary/50 hover:shadow-md dark:hover:shadow-dark-elevated"
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-stone-500 dark:text-white/60">{label}</p>
        <Icon className={cn("w-4 h-4", iconColor)} />
      </div>
      <div className="mt-3">
        <h3 className="text-2xl font-bold text-stone-900 dark:text-white/90 tracking-tight">{value}</h3>
        {subLabel && (
          <p className="text-[11px] text-stone-400 dark:text-white/40 mt-1">{subLabel}</p>
        )}
      </div>
    </div>
  );
}
