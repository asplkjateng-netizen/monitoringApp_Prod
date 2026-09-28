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
  iconColor = "text-stone-400",
  subLabel,
  onClick
}: MetricCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white border border-stone-200/60 rounded-3xl p-5 shadow-soft transition-all duration-200",
        onClick && "cursor-pointer hover:border-primary/40 hover:shadow-md"
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-stone-500">{label}</p>
        <Icon className={cn("w-4 h-4", iconColor)} />
      </div>
      <div className="mt-3">
        <h3 className="text-2xl font-bold text-stone-900 tracking-tight">{value}</h3>
        {subLabel && (
          <p className="text-[11px] text-stone-400 mt-1">{subLabel}</p>
        )}
      </div>
    </div>
  );
}
