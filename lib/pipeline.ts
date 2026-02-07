import { differenceInDays } from 'date-fns'; // Assuming date-fns is installed

export type RottingStatus = 'FRESH' | 'STAGNANT' | 'ROTTING';

export function getRottingStatus(lastActivityAt: Date): RottingStatus {
  const daysInactive = differenceInDays(new Date(), lastActivityAt);

  if (daysInactive < 3) {
    return 'FRESH';
  } else if (daysInactive >= 3 && daysInactive < 7) {
    return 'STAGNANT';
  } else {
    return 'ROTTING';
  }
}

export function getCardColorClass(status: RottingStatus): string {
  switch (status) {
    case 'FRESH':
      return 'bg-white border-slate-100';
    case 'STAGNANT':
      return 'bg-orange-50 border-orange-100';
    case 'ROTTING':
      return 'bg-red-50 border-red-100';
    default:
      return 'bg-white';
  }
}
