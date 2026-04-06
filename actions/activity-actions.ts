"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { runIdempotent } from "@/lib/idempotency";
import { revalidatePath } from "next/cache";

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
  contactPhone?: string | null;
  contactEmail?: string | null;
  content?: string | null;
}

type VoiceCallActivityRow = {
  id: string;
  callType: string;
  callerName: string | null;
  businessName: string | null;
  callerPhone: string | null;
  transcriptText: string | null;
  summary: string | null;
  startedAt: Date;
  contactId: string | null;
  contact?: {
    name: string | null;
    phone: string | null;
    email: string | null;
  } | null;
};

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

function snippet(value: string | null | undefined, max = 180) {
  const normalized = (value || "").replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  return normalized.length > max ? `${normalized.slice(0, max - 1)}...` : normalized;
}

function formatVoiceCallTitle(callType: string) {
  switch ((callType || "").toLowerCase()) {
    case "inbound_demo":
      return "Earlymark inbound call";
    case "demo":
      return "Tracey demo call";
    case "normal":
      return "Customer call";
    default:
      return `${callType.replace(/_/g, " ")} call`.trim() || "Voice call";
  }
}

function mapVoiceCallToActivity(call: VoiceCallActivityRow): ActivityView {
  const transcriptSnippet = snippet(call.transcriptText, 220);
  const summary = snippet(call.summary, 140);
  const callerIdentity =
    call.contact?.name ||
    call.callerName ||
    call.businessName ||
    call.callerPhone ||
    "Voice caller";

  return {
    id: `voice-call:${call.id}`,
    type: "call",
    title: formatVoiceCallTitle(call.callType),
    description: summary || `Phone call with ${callerIdentity}`,
    content: transcriptSnippet || summary,
    time: relativeTime(call.startedAt),
    createdAt: call.startedAt,
    contactId: call.contactId ?? undefined,
    contactName: call.contact?.name || call.callerName || call.businessName || undefined,
    contactPhone: call.contact?.phone || call.callerPhone || undefined,
    contactEmail: call.contact?.email || undefined,
  };
}

// ─── Voicemail helpers ───────────────────────────────────────────────

function normalizePhone(phone: string) {
  return phone.replace(/[\s\-()]+/g, "").replace(/^0/, "+61");
}

async function fetchVoicemailActivities(workspaceId: string, limit: number): Promise<ActivityView[]> {
  try {
    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      select: { twilioPhoneNumber: true },
    });
    if (!workspace?.twilioPhoneNumber) return [];

    const normalized = normalizePhone(workspace.twilioPhoneNumber);

    const events = await db.webhookEvent.findMany({
      where: {
        provider: "twilio_voice_fallback",
        eventType: "voicemail_recorded",
      },
      orderBy: { createdAt: "desc" },
      take: limit * 2,
    });

    const matched = events.filter((e) => {
      if (!e.payload || typeof e.payload !== "object") return false;
      const p = e.payload as Record<string, unknown>;
      const called = String(p.called || "").replace(/[\s\-()]+/g, "");
      return called === normalized || called === workspace.twilioPhoneNumber;
    });

    const contactCache = new Map<string, { name: string; phone: string | null; email: string | null } | null>();

    return Promise.all(
      matched.slice(0, limit).map(async (e) => {
        const p = e.payload as Record<string, string>;
        const callerPhone = p.from || "";
        const duration = p.recordingDuration ? `${p.recordingDuration}s` : "";
        const transcription = snippet(p.transcriptionText, 180);

        if (callerPhone && !contactCache.has(callerPhone)) {
          const c = await db.contact.findFirst({
            where: { workspaceId, phone: { contains: callerPhone.slice(-9) } },
            select: { name: true, phone: true, email: true },
          });
          contactCache.set(callerPhone, c);
        }
        const contact = contactCache.get(callerPhone) ?? null;

        return {
          id: `voicemail:${e.id}`,
          type: "call",
          title: "Voicemail received",
          description: transcription || `${duration} voicemail from ${contact?.name || callerPhone || "unknown"}`,
          content: transcription,
          time: relativeTime(e.createdAt),
          createdAt: e.createdAt,
          contactName: contact?.name || undefined,
          contactPhone: contact?.phone || callerPhone || undefined,
          contactEmail: contact?.email || undefined,
        } satisfies ActivityView;
      })
    );
  } catch (err) {
    console.error("[fetchVoicemailActivities] Error:", err);
    return [];
  }
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
  typeIn?: ("CALL" | "EMAIL" | "NOTE" | "TASK" | "MEETING")[];
}): Promise<ActivityView[]> {
  try {
    const where: Record<string, unknown> = {};
    const shouldIncludeVoiceCalls = !options?.typeIn?.length || options.typeIn.includes("CALL");

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

    const dealContextPromise =
      options?.dealId && !options?.contactId
        ? db.deal.findUnique({
            where: { id: options.dealId },
            select: { contactId: true, workspaceId: true },
          })
        : Promise.resolve(null);

    const [dealContext, activities] = await Promise.all([
      dealContextPromise,
      db.activity.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: options?.limit ?? 20,
        include: {
          contact: { select: { name: true, phone: true, email: true } },
          deal: { select: { contact: { select: { name: true, phone: true, email: true } } } },
        },
      }),
    ]);

    const voiceCallWhere: Record<string, unknown> | null = shouldIncludeVoiceCalls
      ? options?.contactId
        ? { contactId: options.contactId }
        : dealContext?.contactId
          ? { contactId: dealContext.contactId }
          : options?.workspaceId
            ? { workspaceId: options.workspaceId }
            : null
      : null;

    const voiceCalls = voiceCallWhere
      ? await db.voiceCall.findMany({
          where: voiceCallWhere,
          orderBy: { startedAt: "desc" },
          take: options?.limit ?? 20,
          select: {
            id: true,
            callType: true,
            callerName: true,
            businessName: true,
            callerPhone: true,
            transcriptText: true,
            summary: true,
            startedAt: true,
            contactId: true,
            contact: {
              select: {
                name: true,
                phone: true,
                email: true,
              },
            },
          },
        })
      : [];

    const activityRows = activities.map((a) => {
      const contactName = a.contact?.name ?? a.deal?.contact?.name ?? null;
      const contactPhone = a.contact?.phone ?? a.deal?.contact?.phone ?? null;
      const contactEmail = a.contact?.email ?? a.deal?.contact?.email ?? null;
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
        contactPhone,
        contactEmail,
      };
    });

    const voicemailRows = shouldIncludeVoiceCalls && options?.workspaceId
      ? await fetchVoicemailActivities(options.workspaceId, options.limit ?? 20)
      : [];

    return [...activityRows, ...voiceCalls.map(mapVoiceCallToActivity), ...voicemailRows]
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, options?.limit ?? 20);
  } catch (error) {
    console.error("Database Error in getActivities:", error);
    return [];
  }
}

/**
 * Log a new activity (call, email, note, job update, task).
 * Polymorphic — can attach to a deal, contact, or both.
 */
export async function logActivity(
  input: z.infer<typeof LogActivitySchema>
) {
  const parsed = LogActivitySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const res = await runIdempotent<{ activityId: string }>({
    actionType: "ACTIVITY_LOG",
    bucketAt: new Date(),
    parts: [
      parsed.data.type,
      parsed.data.title.trim().toLowerCase(),
      parsed.data.content ?? "",
      parsed.data.description ?? "",
      parsed.data.dealId ?? "",
      parsed.data.contactId ?? "",
    ],
    resultFactory: async () => {
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
      return { activityId: activity.id };
    },
  });

  if (!res.result?.activityId) {
    return { success: false, error: "Idempotent activity logging returned no result" };
  }

  if (parsed.data.dealId) revalidatePath(`/crm/deals/${parsed.data.dealId}`);
  if (parsed.data.contactId) revalidatePath(`/crm/contacts/${parsed.data.contactId}`);

  return { success: true, activityId: res.result.activityId };
}

/**
 * Auto-log: simulates the "invisible data entry" pattern.
 * Called when the system detects an email/job visit/call automatically.
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

/**
 * Append a NOTE activity to an existing ticket/deal.
 */
export async function appendTicketNote(ticketId: string, noteContent: string) {
  const content = noteContent.trim();
  if (!content) {
    throw new Error("Note content is required.");
  }

  const authUser = await getAuthUser();
  if (!authUser?.email) {
    throw new Error("Unauthorized");
  }

  const user = await db.user.findFirst({
    where: { email: authUser.email },
    select: { workspaceId: true },
  });
  if (!user) {
    throw new Error("Unauthorized");
  }

  const ticket = await db.deal.findFirst({
    where: { id: ticketId, workspaceId: user.workspaceId },
    select: { id: true, contactId: true },
  });
  if (!ticket) {
    throw new Error("Ticket not found.");
  }

  await db.activity.create({
    data: {
      type: "NOTE",
      title: "Ticket note added",
      content,
      dealId: ticket.id,
      contactId: ticket.contactId ?? undefined,
    },
  });

  revalidatePath(`/crm/deals/${ticket.id}`);
  if (ticket.contactId) revalidatePath(`/crm/contacts/${ticket.contactId}`);

  return `Note added to ticket #${ticket.id}.`;
}
