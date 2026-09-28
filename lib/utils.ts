import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNIP(nip: string): string {
  // Format standar: 19850101 201012 1 001
  if (nip.length !== 18) return nip;
  return `${nip.slice(0, 8)} ${nip.slice(8, 14)} ${nip.slice(14, 15)} ${nip.slice(15, 18)}`;
}
