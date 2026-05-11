import "server-only";

import { db } from "@/lib/db";
import { createNotification } from "@/actions/notification-actions";

type SupportPriority = "low" | "medium" | "high" | "urgent";

function normalizePriority(value: string | null | undefined): SupportPriority {
  const normalized = (value || "").trim().toLowerCase();
  if (normalized === "low" || normalized === "medium" || normalized === "high" || normalized === "urgent") {
    return normalized;
  }
  return "medium";
}

function getSlaHours(priority: SupportPriority) {
  switch (priority) {
    case "urgent":
      return 4;
    case "high":
      return 12;
    case "low":
      return 48;
    default:
      return 24;
  }
}

export function buildSupportTicketReference(ticketId: string) {
  return `SUP-${ticketId.slice(-6).toUpperCase()}`;
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

  const activity = await db.activity.create({
    data: {
      type: "NOTE",
      title: `${input.source === "chatbot" ? "Chatbot Support Request" : "Support Request"}: ${input.subject}`,
      content: [
        `Priority: ${priority}`,
        `Source: ${input.source}`,
        "",
        input.message,
        "",
        `User: ${input.requesterEmail || "Unknown user"}`,
        `Workspace: ${input.workspaceName || "Unknown workspace"}`,
        `Tracey number: ${input.traceyNumber || "Not configured"}`,
      ].join("\n"),
      userId: input.userId,
    },
  });

  await db.activityLog.create({
    data: {
      workspaceId: input.workspaceId,
      userId: input.userId,
      action: "support.ticket.created",
      entityType: "support_ticket",
      entityId: activity.id,
      metadata: {
        ticketId: activity.id,
        ticketRef: buildSupportTicketReference(activity.id),
        status: "open",
        priority,
        source: input.source,
        slaHours,
        requesterName: input.requesterName || null,
        requesterEmail: input.requesterEmail || null,
        requesterPhone: input.requesterPhone || null,
        workspaceName: input.workspaceName || null,
        workspaceType: input.workspaceType || null,
        traceyNumber: input.traceyNumber || null,
      },
    },
  });

  await createNotification({
    userId: input.userId,
    title: `Support ticket created: ${input.subject}`,
    message: `${buildSupportTicketReference(activity.id)} is open with ${priority} priority.`,
    type: priority === "urgent" || priority === "high" ? "WARNING" : "INFO",
    link: "/crm/settings/help#support-request",
    actionType: "VIEW_SUPPORT_TICKET",
    actionPayload: {
      ticketId: activity.id,
      ticketRef: buildSupportTicketReference(activity.id),
      status: "open",
      priority,
    },
  });

  return {
    ticketId: activity.id,
    ticketRef: buildSupportTicketReference(activity.id),
    priority,
    slaHours,
  };
}

export async function appendSupportTicketNote(input: {
  workspaceId: string;
  ticketId: string;
  noteContent: string;
  userId?: string | null;
}) {
  const ticket = await db.activity.findFirst({
    where: {
      id: input.ticketId,
      userId: input.userId ?? undefined,
      title: { startsWith: "Support Request:" },
    },
    select: {
      id: true,
      title: true,
      userId: true,
    },
  });

  const chatbotTicket =
    ticket ||
    (await db.activity.findFirst({
      where: {
        id: input.ticketId,
        userId: input.userId ?? undefined,
        title: { startsWith: "Chatbot Support Request:" },
      },
      select: {
        id: true,
        title: true,
        userId: true,
      },
    }));

  if (!chatbotTicket) {
    throw new Error("Ticket not found.");
  }

  await db.activity.create({
    data: {
      type: "NOTE",
      title: `Support ticket note: ${buildSupportTicketReference(chatbotTicket.id)}`,
      content: input.noteContent,
      userId: chatbotTicket.userId ?? undefined,
    },
  });

  await db.activityLog.create({
    data: {
      workspaceId: input.workspaceId,
      userId: input.userId ?? undefined,
      action: "support.ticket.note_added",
      entityType: "support_ticket",
      entityId: chatbotTicket.id,
      metadata: {
        ticketId: chatbotTicket.id,
        ticketRef: buildSupportTicketReference(chatbotTicket.id),
        note: input.noteContent,
      },
    },
  });

  return `Note added to ticket ${buildSupportTicketReference(chatbotTicket.id)}.`;
}
