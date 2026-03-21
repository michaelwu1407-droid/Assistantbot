/**
 * Kanban column ids (client) that require a job scheduled date before a deal can sit there.
 * Aligns with product rule: nothing in Scheduled or later without `scheduledAt`.
 */
export const KANBAN_STAGES_REQUIRING_SCHEDULED_DATE = ["scheduled", "ready_to_invoice", "completed"] as const

export function kanbanStageRequiresScheduledDate(stage: string): boolean {
  return (KANBAN_STAGES_REQUIRING_SCHEDULED_DATE as readonly string[]).includes(stage)
}

/** Prisma DealStage values that imply Scheduled column or later in the pipeline. */
export function prismaStageRequiresScheduledDate(prismaStage: string): boolean {
  return ["SCHEDULED", "NEGOTIATION", "INVOICED", "WON", "PENDING_COMPLETION"].includes(prismaStage)
}
