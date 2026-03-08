/**
 * Deal Utility Functions
 * Helper functions for deal-related operations and validation
 */

import type { Deal, DealStage } from '@prisma/client';

/**
 * Check if a deal is overdue (stale)
 * A deal is considered overdue if:
 * - It's in SCHEDULED stage
 * - The scheduled date has passed
 * - No actual outcome has been recorded yet
 */
export function checkIfDealIsOverdue(deal: {
  stage: DealStage;
  scheduledAt: Date | null;
  actualOutcome: string | null;
}): boolean {
  if (!deal.scheduledAt) return false;

  const now = new Date();
  const scheduledDate = new Date(deal.scheduledAt);

  return (
    deal.stage === 'SCHEDULED' &&
    scheduledDate < now &&
    !deal.actualOutcome
  );
}

/**
 * Get the number of days a deal is overdue
 * Returns 0 if not overdue
 */
export function getOverdueDays(deal: {
  stage: DealStage;
  scheduledAt: Date | null;
  actualOutcome: string | null;
}): number {
  if (!checkIfDealIsOverdue(deal)) return 0;

  const now = new Date();
  const scheduledDate = new Date(deal.scheduledAt!);
  const diffTime = Math.abs(now.getTime() - scheduledDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Get visual styling for overdue deals
 */
export function getOverdueStyling(deal: {
  stage: DealStage;
  scheduledAt: Date | null;
  actualOutcome: string | null;
}) {
  const isOverdue = checkIfDealIsOverdue(deal);
  const overdueDays = getOverdueDays(deal);

  if (!isOverdue) {
    return {
      borderClass: '',
      badgeText: '',
      badgeClass: '',
      severity: 'none' as const
    };
  }

  if (overdueDays >= 7) {
    return {
      borderClass: 'border-red-500 dark:border-red-800',
      badgeText: `Action Required: ${overdueDays} days overdue`,
      badgeClass: 'bg-red-500 text-white dark:bg-red-900/40 dark:text-red-300 dark:border-red-800 border',
      severity: 'critical' as const
    };
  } else if (overdueDays >= 3) {
    return {
      borderClass: 'border-orange-500 dark:border-orange-800',
      badgeText: `Past Date: ${overdueDays} days ago`,
      badgeClass: 'bg-orange-500 text-white dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800 border',
      severity: 'warning' as const
    };
    return {
      borderClass: 'border-orange-500',
      badgeText: `Past Date: ${overdueDays} days ago`,
      badgeClass: 'bg-orange-500 text-white',
      severity: 'warning' as const
    };
  } else {
    return {
      borderClass: 'border-amber-500 dark:border-amber-800',
      badgeText: 'Past Date',
      badgeClass: 'bg-amber-500 text-white dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800 border',
      severity: 'mild' as const
    };
  }
}

/**
 * Valid outcome options for stale job reconciliation
 */
export const ACTUAL_OUTCOME_OPTIONS = [
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'RESCHEDULED', label: 'Rescheduled' },
  { value: 'NO_SHOW', label: 'No Show' },
  { value: 'CANCELLED', label: 'Cancelled' },
] as const;

export const STAGE_OPTIONS = [
  { value: "new_request", label: "New request" },
  { value: "quote_sent", label: "Quote sent" },
  { value: "scheduled", label: "Scheduled" },
  { value: "pipeline", label: "Pipeline" },
  { value: "ready_to_invoice", label: "Ready to invoice" },
  { value: "completed", label: "Completed" },
  { value: "lost", label: "Lost" },
  { value: "deleted", label: "Deleted jobs" },
];

export const PRISMA_STAGE_TO_UI_STAGE: Record<string, string> = {
  NEW: "new_request",
  CONTACTED: "quote_sent",
  NEGOTIATION: "scheduled",
  SCHEDULED: "scheduled",
  PIPELINE: "pipeline",
  INVOICED: "ready_to_invoice",
  PENDING_COMPLETION: "pending_approval",
  WON: "completed",
  LOST: "lost",
  DELETED: "deleted",
};

export const PRISMA_STAGE_LABELS: Record<string, string> = {
  NEW: "New request",
  CONTACTED: "Quote sent",
  NEGOTIATION: "Negotiation",
  SCHEDULED: "Scheduled",
  PIPELINE: "Pipeline",
  INVOICED: "Ready to invoice",
  PENDING_COMPLETION: "Pending approval",
  WON: "Completed",
  LOST: "Lost",
  DELETED: "Deleted jobs",
};

export type ActualOutcome = typeof ACTUAL_OUTCOME_OPTIONS[number]['value'];
