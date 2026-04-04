/**
 * Deal Utility Functions
 * Helper functions for deal-related operations and validation
 */

import type { DealStage } from '@prisma/client';
import { cn } from "@/lib/utils";

/** Kanban column header background tokens — same as `kanban-board.tsx` COLUMNS `color`. */
export const KANBAN_COLUMN_HEADER_BG: Record<string, string> = {
  new_request: "bg-status-new",
  quote_sent: "bg-status-quote",
  scheduled: "bg-status-scheduled",
  ready_to_invoice: "bg-status-awaiting",
  completed: "bg-status-complete",
  deleted: "bg-neutral-400",
  lost: "bg-slate-500",
}

/** Static hover backgrounds (JIT-safe) so the stage pill keeps Kanban colour on hover. */
export const KANBAN_COLUMN_HEADER_HOVER_BG: Record<string, string> = {
  new_request: "hover:bg-status-new",
  quote_sent: "hover:bg-status-quote",
  scheduled: "hover:bg-status-scheduled",
  ready_to_invoice: "hover:bg-status-awaiting",
  completed: "hover:bg-status-complete",
  deleted: "hover:bg-neutral-400",
  lost: "hover:bg-slate-500",
}

/** Prisma or Kanban string (e.g. DealView uses "scheduled"). */
function isScheduledLikeStage(stage: string): boolean {
  const u = String(stage).toUpperCase();
  return u === 'SCHEDULED' || u === 'NEGOTIATION';
}

/**
 * Check if a deal is overdue (stale)
 * A deal is considered overdue if:
 * - It's in SCHEDULED (or NEGOTIATION) stage
 * - The scheduled date has passed
 * - No actual outcome has been recorded yet
 */
export function checkIfDealIsOverdue(deal: {
  stage: DealStage | string;
  scheduledAt: Date | null;
  actualOutcome: string | null;
}): boolean {
  if (!deal.scheduledAt) return false;

  const now = new Date();
  const scheduledDate = new Date(deal.scheduledAt);

  return (
    isScheduledLikeStage(String(deal.stage)) &&
    scheduledDate < now &&
    !deal.actualOutcome
  );
}

/**
 * Get the number of days a deal is overdue
 * Returns 0 if not overdue
 */
export function getOverdueDays(deal: {
  stage: DealStage | string;
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
  stage: DealStage | string;
  scheduledAt: Date | null;
  actualOutcome: string | null;
}): {
  borderClass: string;
  badgeText: string;
  badgeTitle: string;
  badgeClass: string;
  severity: "critical" | "warning" | "mild" | "none";
} {
  const isOverdue = checkIfDealIsOverdue(deal);
  const overdueDays = getOverdueDays(deal);

  if (!isOverdue) {
    return {
      borderClass: '',
      badgeText: '',
      badgeTitle: '',
      badgeClass: '',
      severity: 'none' as const
    };
  }

  const longTitle = `Scheduled in the past (${overdueDays} day${overdueDays === 1 ? '' : 's'} ago). Click to reconcile or record an outcome.`;

  return {
    borderClass: 'border-red-500 dark:border-red-800',
    badgeText: 'Overdue',
    badgeTitle: longTitle,
    badgeClass: 'bg-red-500 text-white dark:bg-red-900/40 dark:text-red-300 dark:border-red-800 border',
    severity: 'critical' as const
  };
}

/**
 * Valid outcome options for stale job reconciliation
 */
export const ACTUAL_OUTCOME_OPTIONS = [
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'RESCHEDULED', label: 'Rescheduled' },
  { value: 'PARKED', label: 'Parked (date unknown)' },
  { value: 'NO_SHOW', label: 'No Show' },
  { value: 'CANCELLED', label: 'Cancelled' },
] as const;

export const STAGE_OPTIONS = [
  { value: "new_request", label: "New request" },
  { value: "quote_sent", label: "Quote sent" },
  { value: "scheduled", label: "Scheduled" },
  { value: "ready_to_invoice", label: "Awaiting payment" },
  { value: "completed", label: "Completed" },
  { value: "lost", label: "Lost" },
  { value: "deleted", label: "Deleted" },
];

export const PRISMA_STAGE_TO_UI_STAGE: Record<string, string> = {
  NEW: "new_request",
  CONTACTED: "quote_sent",
  NEGOTIATION: "scheduled",
  SCHEDULED: "scheduled",
  PIPELINE: "quote_sent",
  INVOICED: "ready_to_invoice",
  PENDING_COMPLETION: "pending_approval",
  WON: "completed",
  LOST: "lost",
  DELETED: "deleted",
};

export const UI_STAGE_LABELS: Record<string, string> = {
  new_request: "New request",
  quote_sent: "Quote sent",
  scheduled: "Scheduled",
  ready_to_invoice: "Awaiting payment",
  pending_approval: "Pending approval",
  completed: "Completed",
  lost: "Lost",
  deleted: "Deleted",
};

export const PRISMA_STAGE_LABELS: Record<string, string> = {
  NEW: UI_STAGE_LABELS.new_request,
  CONTACTED: UI_STAGE_LABELS.quote_sent,
  NEGOTIATION: UI_STAGE_LABELS.scheduled,
  SCHEDULED: UI_STAGE_LABELS.scheduled,
  PIPELINE: UI_STAGE_LABELS.quote_sent,
  INVOICED: UI_STAGE_LABELS.ready_to_invoice,
  PENDING_COMPLETION: UI_STAGE_LABELS.pending_approval,
  WON: UI_STAGE_LABELS.completed,
  LOST: UI_STAGE_LABELS.lost,
  DELETED: UI_STAGE_LABELS.deleted,
};

export function getUserFacingDealStageLabel(stage: string): string {
  const normalized = String(stage).trim();
  if (!normalized) return normalized;

  const lower = normalized.toLowerCase();
  if (UI_STAGE_LABELS[lower]) {
    return UI_STAGE_LABELS[lower];
  }

  const upper = normalized.toUpperCase();
  if (PRISMA_STAGE_LABELS[upper]) {
    return PRISMA_STAGE_LABELS[upper];
  }

  return normalized;
}

/** Kanban column ids + labels for the deal modal stage picker (same order as `kanban-board.tsx` columns + lost). */
export const KANBAN_STAGE_PICKER_OPTIONS = [
  { id: "new_request", label: "New request" },
  { id: "quote_sent", label: "Quote sent" },
  { id: "scheduled", label: "Scheduled" },
  { id: "ready_to_invoice", label: "Awaiting payment" },
  { id: "completed", label: "Completed" },
  { id: "lost", label: "Lost" },
  { id: "deleted", label: "Deleted" },
] as const

/** Stages available when creating a new job from the dashboard. */
export const NEW_JOB_STAGE_OPTIONS = [
  { value: "new_request", label: "New request" },
  { value: "quote_sent", label: "Quote sent" },
  { value: "scheduled", label: "Scheduled" },
  { value: "ready_to_invoice", label: "Awaiting payment" },
  { value: "completed", label: "Completed" },
] as const

export type NewJobStage = (typeof NEW_JOB_STAGE_OPTIONS)[number]["value"]

export function isNewJobStage(value: string): value is NewJobStage {
  return NEW_JOB_STAGE_OPTIONS.some((option) => option.value === value)
}

/**
 * Maps Prisma `deal.stage` to the Kanban column id passed to `updateDealStage` / board grouping.
 * Pending approval and completed both map to `completed` for column equality.
 */
export function prismaStageToKanbanColumn(prismaStage: string): string {
  const ui = PRISMA_STAGE_TO_UI_STAGE[prismaStage] ?? "new_request"
  if (ui === "pending_approval") return "completed"
  if (ui === "pipeline") return "quote_sent"
  return ui
}

/**
 * Deal modal stage pill / trigger — fills with the same colour as the matching Kanban column header.
 * Pending approval uses amber (same as strip) even though it sits in the Completed column.
 */
export function getKanbanStagePillClasses(prismaStage: string): string {
  const ui = PRISMA_STAGE_TO_UI_STAGE[prismaStage] ?? ""
  if (ui === "pending_approval") {
    return "bg-amber-500 text-white hover:bg-amber-600 focus-visible:ring-amber-400"
  }
  if (ui === "pipeline") {
    return "bg-violet-600 text-white hover:bg-violet-700 focus-visible:ring-violet-500"
  }
  const col = prismaStageToKanbanColumn(prismaStage)
  const bg = KANBAN_COLUMN_HEADER_BG[col] ?? "bg-slate-500"
  const hoverBg = KANBAN_COLUMN_HEADER_HOVER_BG[col] ?? "hover:bg-slate-500"
  return cn(
    bg,
    hoverBg,
    "text-white border-transparent shadow-sm hover:brightness-[0.97] focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
  )
}

/** Small swatch for dropdown rows — Kanban column id. */
export function getKanbanColumnSwatchClass(columnId: string): string {
  return KANBAN_COLUMN_HEADER_BG[columnId] ?? "bg-slate-500"
}

/** Full-width stage strip background (aligned with Kanban column colours in `kanban-board.tsx`). */
export function getStageStripBarClass(prismaStage: string): string {
  const ui = PRISMA_STAGE_TO_UI_STAGE[prismaStage] ?? ""
  const map: Record<string, string> = {
    new_request: "bg-status-new",
    quote_sent: "bg-status-quote",
    scheduled: "bg-status-scheduled",
    pipeline: "bg-violet-600",
    ready_to_invoice: "bg-status-awaiting",
    completed: "bg-status-complete",
    deleted: "bg-neutral-400",
    pending_approval: "bg-amber-500",
    lost: "bg-slate-500",
  }
  return map[ui] ?? "bg-slate-500"
}

export type ActualOutcome = typeof ACTUAL_OUTCOME_OPTIONS[number]['value'];
