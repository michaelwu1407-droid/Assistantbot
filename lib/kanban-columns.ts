/**
 * Maps a DealView.stage string to the Kanban column id (same rules as `kanban-board.tsx` grouping).
 */
export function kanbanColumnIdForDealStage(stage: string): string {
  let s = stage === "pipeline" ? "quote_sent" : stage
  if (s === "pending_approval") return "completed"
  return s
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
