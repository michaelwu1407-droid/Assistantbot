"use server";

import { z } from "zod";
import { db } from "@/lib/db";

// ─── Types ──────────────────────────────────────────────────────────

export interface ActivityView {
  id: string;
  type: string;
  title: string;
  description: string | null;
  time: string; // relative time string for the frontend
  createdAt: Date;
  dealId?: string;
  contactId?: string;
  contactName?: string | null; // for display: "Contact Name — Change"
  content?: string | null;
}

// ─── Validation ─────────────────────────────────────────────────────

const LogActivitySchema = z.object({
  type: z.enum(["CALL", "EMAIL", "NOTE", "MEETING", "TASK"]),
  title: z.string().min(1),
  content: z.string().min(1),
  description: z.string().optional(),
  dealId: z.string().optional(),
  contactId: z.string().optional(),
});

// ─── Helpers ────────────────────────────────────────────────────────

function relativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-AU", { month: "short", day: "numeric" });
}

// ─── Server Actions ─────────────────────────────────────────────────

/**
 * Fetch recent activities, optionally filtered by deal or contact.
 */
export async function getActivities(options?: {
  dealId?: string;
  contactId?: string;
  workspaceId?: string;
  limit?: number;
  /** For inbox: only return these activity types (e.g. CALL, EMAIL, NOTE). */
  typeIn?: ("CALL" | "EMAIL" | "NOTE" | "TASK")[];
}): Promise<ActivityView[]> {
  try {
    const where: Record<string, unknown> = {};

    if (options?.dealId) where.dealId = options.dealId;
    if (options?.contactId) where.contactId = options.contactId;
    if (options?.workspaceId && !options.dealId && !options.contactId) {
      where.OR = [
        { deal: { workspaceId: options.workspaceId } },
        { contact: { workspaceId: options.workspaceId } },
      ];
    }
    if (options?.typeIn?.length) {
      where.type = { in: options.typeIn };
    }

    const activities = await db.activity.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: options?.limit ?? 20,
      include: {
        contact: { select: { name: true } },
        deal: { select: { contact: { select: { name: true } } } },
      },
    });

    return activities.map((a) => {
      const contactName =
        a.contact?.name ?? a.deal?.contact?.name ?? null;
      return {
        id: a.id,
        type: a.type.toLowerCase(),
        title: a.title,
        description: a.description,
        content: a.content,
        time: relativeTime(a.createdAt),
        createdAt: a.createdAt,
        dealId: a.dealId ?? undefined,
        contactId: a.contactId ?? undefined,
        contactName: contactName ?? undefined,
      };
    });
  } catch (error) {
    console.error("Database Error in getActivities:", error);
    return [];
  }
}

/**
 * Log a new activity (call, email, note, meeting, task).
 * Polymorphic — can attach to a deal, contact, or both.
 */
export async function logActivity(
  input: z.infer<typeof LogActivitySchema>
) {
  const parsed = LogActivitySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const activity = await db.activity.create({
    data: {
      type: parsed.data.type,
      title: parsed.data.title,
      content: parsed.data.content,
      description: parsed.data.description,
      dealId: parsed.data.dealId,
      contactId: parsed.data.contactId,
    },
  });

  return { success: true, activityId: activity.id };
}

/**
 * Auto-log: simulates the "invisible data entry" pattern.
 * Called when the system detects an email/meeting/call automatically.
 */
export async function autoLogActivity(payload: {
  type: "EMAIL" | "MEETING" | "CALL";
  contactEmail: string;
  subject: string;
  summary: string;
  workspaceId: string;
}) {
  // Find the contact by email
  const contact = await db.contact.findFirst({
    where: {
      email: payload.contactEmail,
      workspaceId: payload.workspaceId,
    },
    include: {
      deals: {
        where: { stage: { notIn: ["WON", "LOST"] } },
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!contact) {
    // Auto-create the contact if not found
    const newContact = await db.contact.create({
      data: {
        name: payload.contactEmail.split("@")[0].replace(/[._]/g, " "),
        email: payload.contactEmail,
        workspaceId: payload.workspaceId,
      },
    });

    await db.activity.create({
      data: {
        type: payload.type,
        title: `${payload.type.toLowerCase()} logged from ${payload.contactEmail}`,
        content: payload.summary,
        description: payload.subject,
        contactId: newContact.id,
      },
    });

    return { success: true, contactCreated: true, contactId: newContact.id };
  }

  // Log against the most active deal for this contact
  const activeDeal = contact.deals[0];

  await db.activity.create({
    data: {
      type: payload.type,
      title: `${payload.type.toLowerCase()} logged from ${payload.contactEmail}`,
      content: payload.summary,
      description: payload.subject,
      dealId: activeDeal?.id,
      contactId: contact.id,
    },
  });

  return {
    success: true,
    contactCreated: false,
    contactId: contact.id,
    dealId: activeDeal?.id,
  };
}
