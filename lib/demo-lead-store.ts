import { db, isDatabaseConfigured } from "@/lib/db";

export type DemoLeadInput = {
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  businessName?: string;
  source?: "homepage_form" | "contact_form" | "api";
  ipAddress?: string;
  userAgent?: string;
};

export type DemoLeadCallResult = {
  roomName?: string;
  resolvedTrunkId?: string;
  callerNumber?: string | null;
  warnings?: string[];
};

const STATUS_PENDING = "PENDING";
const STATUS_INITIATED = "INITIATED";
const STATUS_FAILED = "FAILED";

export async function persistDemoLeadAttempt(input: DemoLeadInput): Promise<string | null> {
  if (!isDatabaseConfigured) return null;

  try {
    const lead = await db.demoLead.create({
      data: {
        firstName: input.firstName.trim(),
        lastName: input.lastName?.trim() || null,
        phone: input.phone.trim(),
        email: input.email?.trim().toLowerCase() || null,
        businessName: input.businessName?.trim() || null,
        source: input.source || "homepage_form",
        callStatus: STATUS_PENDING,
        ipAddress: input.ipAddress || null,
        userAgent: input.userAgent || null,
      },
      select: { id: true },
    });
    return lead.id;
  } catch (error) {
    // Lead persistence must never block the demo call attempt.
    console.error("[demo-lead] Failed to persist lead", error);
    return null;
  }
}

export async function markDemoLeadInitiated(
  leadId: string | null,
  result: DemoLeadCallResult,
): Promise<void> {
  if (!leadId || !isDatabaseConfigured) return;

  try {
    await db.demoLead.update({
      where: { id: leadId },
      data: {
        callStatus: STATUS_INITIATED,
        roomName: result.roomName || null,
        resolvedTrunkId: result.resolvedTrunkId || null,
        callerNumber: result.callerNumber || null,
        warnings: result.warnings && result.warnings.length > 0 ? result.warnings : undefined,
      },
    });
  } catch (error) {
    console.error("[demo-lead] Failed to mark lead initiated", error);
  }
}

export async function markDemoLeadFailed(
  leadId: string | null,
  error: unknown,
): Promise<void> {
  if (!leadId || !isDatabaseConfigured) return;

  const message = error instanceof Error ? error.message : String(error);
  try {
    await db.demoLead.update({
      where: { id: leadId },
      data: {
        callStatus: STATUS_FAILED,
        callError: message.slice(0, 500),
      },
    });
  } catch (innerError) {
    console.error("[demo-lead] Failed to mark lead failed", innerError);
  }
}
