import { differenceInDays } from 'date-fns'; // Assuming date-fns is installed

export interface DealHealth {
  status: 'FRESH' | 'STALE' | 'ROTTING';
  daysSinceActivity: number;
}

export function getDealHealth(lastActivityAt: Date): DealHealth {
  const daysSinceActivity = differenceInDays(new Date(), lastActivityAt);

  let status: 'FRESH' | 'STALE' | 'ROTTING' = 'FRESH';
  if (daysSinceActivity >= 7 && daysSinceActivity <= 14) {
    status = 'STALE';
  } else if (daysSinceActivity > 14) {
    status = 'ROTTING';
  }

  return { status, daysSinceActivity };
}

export type DealStatus = DealHealth['status'];

export function getCardColorClass(status: DealStatus): string {
  switch (status) {
    case 'FRESH':
      return 'bg-white border-slate-100';
    case 'STALE':
      return 'bg-orange-50 border-orange-100';
    case 'ROTTING':
      return 'bg-red-50 border-red-100';
    default:
      return 'bg-white';
  }
}
