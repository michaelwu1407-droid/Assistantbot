/**
 * Maps a DealView.stage string to the Kanban column id (same rules as `kanban-board.tsx` grouping).
 * Note: "pipeline" is a legacy stage — deal-actions.ts now maps PIPELINE → "quote_sent" upstream.
 */
export function kanbanColumnIdForDealStage(stage: string): string {
  if (stage === "pending_approval") return "completed"
  return stage
}

/** Left-to-right column order for sorting fetched deals. */
export const KANBAN_COLUMN_SORT_ORDER = [
  "new_request",
  "quote_sent",
  "scheduled",
  "ready_to_invoice",
  "completed",
  "deleted",
  "lost",
] as const
