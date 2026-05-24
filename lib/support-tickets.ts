import "server-only";

import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { createNotification } from "@/actions/notification-actions";

type SupportPriority = "low" | "medium" | "high" | "urgent";

function normalizePriority(value: string | null | undefined): SupportPriority {
  const p = (value || "").trim().toLowerCase();
  if (p === "low" || p === "medium" || p === "high" || p === "urgent") return p;
  return "medium";
}

function getSlaHours(priority: SupportPriority): number {
  if (priority === "urgent") return 4;
  if (priority === "high") return 12;
  if (priority === "low") return 48;
  return 24;
}

export function buildSupportTicketReference(): string {
  return `SUP-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export async function createSupportTicket(input: {
  userId: string;
  workspaceId: string;
  subject: string;
  message: string;
  priority?: string | null;
  source: "settings_form" | "chatbot";
  requesterName?: string | null;
  requesterEmail?: string | null;
  requesterPhone?: string | null;
  workspaceName?: string | null;
  workspaceType?: string | null;
  traceyNumber?: string | null;
}) {
  const priority = normalizePriority(input.priority);
  const slaHours = getSlaHours(priority);
  const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000);
  const ref = buildSupportTicketReference();

  const ticket = await db.supportTicket.create({
    data: {
      ref,
      workspaceId: input.workspaceId,
      userId: input.userId,
      subject: input.subject,
      message: input.message,
      priority,
      source: input.source,
      slaDeadline,
      metadata: {
        requesterName: input.requesterName ?? null,
        requesterEmail: input.requesterEmail ?? null,
        requesterPhone: input.requesterPhone ?? null,
        workspaceName: input.workspaceName ?? null,
        workspaceType: input.workspaceType ?? null,
        traceyNumber: input.traceyNumber ?? null,
      },
    },
  });

  await createNotification({
    userId: input.userId,
    title: `Support ticket created: ${input.subject}`,
    message: `${ref} is open with ${priority} priority.`,
    type: priority === "urgent" || priority === "high" ? "WARNING" : "INFO",
    link: "/crm/settings/help#support-request",
    actionType: "VIEW_SUPPORT_TICKET",
    actionPayload: { ticketId: ticket.id, ticketRef: ref, status: "OPEN", priority },
  });

  return { ticketId: ticket.id, ticketRef: ref, priority, slaHours };
}

export async function appendSupportTicketNote(input: {
  workspaceId: string;
  ticketId: string;
  noteContent: string;
  userId?: string | null;
}) {
  const ticket = await db.supportTicket.findFirst({
    where: { id: input.ticketId, workspaceId: input.workspaceId },
    select: { id: true, ref: true },
  });

  if (!ticket) throw new Error("Ticket not found.");

  await db.supportTicketNote.create({
    data: { ticketId: ticket.id, content: input.noteContent },
  });

  return `Note added to ticket ${ticket.ref}.`;
}

export async function getSupportTickets(workspaceId: string, userId: string) {
  return db.supportTicket.findMany({
    where: { workspaceId, userId },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { notes: { orderBy: { createdAt: "asc" } } },
  });
}

export async function updateSupportTicketStatus(
  ticketId: string,
  workspaceId: string,
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED",
) {
  return db.supportTicket.update({
    where: { id: ticketId, workspaceId },
    data: {
      status,
      resolvedAt: status === "RESOLVED" || status === "CLOSED" ? new Date() : null,
    },
  });
}
