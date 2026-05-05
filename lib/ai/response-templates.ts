/**
 * Response Templates — lightweight templates for simple confirmations.
 *
 * For purely confirmatory responses ("Done! Moved X to Scheduled."), we can
 * use templates instead of LLM generation. This saves ~500ms on the simplest
 * operations where the response is entirely predictable.
 */

type TemplateContext = {
  dealTitle?: string;
  contactName?: string;
  stage?: string;
  note?: string;
  taskTitle?: string;
  teamMember?: string;
  amount?: number;
};

const STAGE_LABELS: Record<string, string> = {
  new_request: "New request",
  quote_sent: "Quote sent",
  scheduled: "Scheduled",
  ready_to_invoice: "Ready to invoice",
  pending_approval: "Pending approval",
  completed: "Completed",
  lost: "Lost",
  deleted: "Deleted",
};

export function templateMoveDeal(ctx: TemplateContext): string {
  const label = STAGE_LABELS[ctx.stage ?? ""] ?? ctx.stage ?? "unknown";
  return `Done! Moved "${ctx.dealTitle}" to ${label}.`;
}

export function templateAddNote(ctx: TemplateContext): string {
  const target = ctx.dealTitle ?? ctx.contactName ?? "the record";
  return `Note added to ${target}.`;
}

export function templateCreateTask(ctx: TemplateContext): string {
  return `Task created: "${ctx.taskTitle}".`;
}

export function templateAssign(ctx: TemplateContext): string {
  return `Assigned "${ctx.dealTitle}" to ${ctx.teamMember}.`;
}

export function templateContactCreated(ctx: TemplateContext): string {
  return `Contact created: ${ctx.contactName}.`;
}

export function templateDealRestored(ctx: TemplateContext): string {
  return `Restored "${ctx.dealTitle}".`;
}

/**
 * Try to select a response template for a direct command result.
 * Returns null if no template matches (caller should use LLM instead).
 */
export function selectResponseTemplate(
  action: string,
  ctx: TemplateContext,
): string | null {
  switch (action) {
    case "move_deal":
      return ctx.dealTitle && ctx.stage ? templateMoveDeal(ctx) : null;
    case "add_note":
      return (ctx.dealTitle || ctx.contactName) ? templateAddNote(ctx) : null;
    case "create_task":
      return ctx.taskTitle ? templateCreateTask(ctx) : null;
    case "assign":
      return ctx.dealTitle && ctx.teamMember ? templateAssign(ctx) : null;
    case "create_contact":
      return ctx.contactName ? templateContactCreated(ctx) : null;
    case "restore_deal":
      return ctx.dealTitle ? templateDealRestored(ctx) : null;
    default:
      return null;
  }
}
