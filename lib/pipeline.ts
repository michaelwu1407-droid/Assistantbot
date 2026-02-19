import { differenceInDays } from 'date-fns';

export interface DealHealth {
  status: 'FRESH' | 'STALE' | 'ROTTING';
  daysSinceActivity: number;
}

const DEFAULT_DAYS_UNTIL_STALE = 7;
const DEFAULT_DAYS_UNTIL_ROTTING = 14;

export interface DealHealthOptions {
  daysUntilStale?: number;
  daysUntilRotting?: number;
}

export function getDealHealth(
  lastActivityAt: Date,
  options?: DealHealthOptions
): DealHealth {
  const daysSinceActivity = differenceInDays(new Date(), lastActivityAt);
  const daysUntilStale = options?.daysUntilStale ?? DEFAULT_DAYS_UNTIL_STALE;
  const daysUntilRotting = options?.daysUntilRotting ?? DEFAULT_DAYS_UNTIL_ROTTING;

  let status: 'FRESH' | 'STALE' | 'ROTTING' = 'FRESH';
  if (daysSinceActivity >= daysUntilRotting) {
    status = 'ROTTING';
  } else if (daysSinceActivity >= daysUntilStale) {
    status = 'STALE';
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
