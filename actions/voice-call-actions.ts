"use server";

import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { scheduleLeadCallback } from "@/lib/lead-callback";
import { hasRecentCallbackInProgress } from "@/lib/callback-events";

export type VoiceCallView = {
  id: string;
  callType: string;
  callerName: string | null;
  callerPhone: string | null;
  businessName: string | null;
  summary: string | null;
  transcriptText: string | null;
  startedAt: Date;
  endedAt: Date | null;
};

export async function getRecentVoiceCallsForWorkspace(limit = 10): Promise<VoiceCallView[]> {
  const authUser = await getAuthUser();
  if (!authUser?.email) return [];

  const user = await db.user.findFirst({
    where: { email: authUser.email },
    select: { workspaceId: true },
  });

  if (!user?.workspaceId) return [];

  const calls = await db.voiceCall.findMany({
    where: { workspaceId: user.workspaceId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      callType: true,
      callerName: true,
      callerPhone: true,
      businessName: true,
      summary: true,
      transcriptText: true,
      startedAt: true,
      endedAt: true,
    },
  });

  return calls;
}

export async function requestTraceyRecall(input: {
  contactId: string;
  dealId?: string | null;
}) {
  const authUser = await getAuthUser();
  if (!authUser?.email) {
    return { success: false, error: "Unauthorized" };
  }

  const user = await db.user.findFirst({
    where: { email: authUser.email },
    select: { id: true, workspaceId: true },
  });
  if (!user?.workspaceId) {
    return { success: false, error: "Workspace not found" };
  }

  const [workspace, contact] = await Promise.all([
    db.workspace.findUnique({
      where: { id: user.workspaceId },
      select: {
        id: true,
        twilioPhoneNumber: true,
        voiceEnabled: true,
        agentMode: true,
      },
    }),
    db.contact.findFirst({
      where: {
        id: input.contactId,
        workspaceId: user.workspaceId,
      },
      select: {
        id: true,
        name: true,
        phone: true,
      },
    }),
  ]);

  if (!workspace) {
    return { success: false, error: "Workspace not found" };
  }

  if (!contact) {
    return { success: false, error: "Contact not found" };
  }

  if (!contact.phone) {
    return { success: false, error: "This contact has no phone number yet." };
  }

  if (workspace.voiceEnabled === false) {
    return { success: false, error: "Tracey voice is temporarily disabled for this workspace." };
  }

  if (workspace.agentMode !== "EXECUTION") {
    return { success: false, error: "Tracey is not allowed to place calls in the current agent mode." };
  }

  if (!workspace.twilioPhoneNumber) {
    return { success: false, error: "Your business number is not ready yet." };
  }

  if (await hasRecentCallbackInProgress({
    workspaceId: workspace.id,
    contactId: contact.id,
    dealId: input.dealId || null,
    contactPhone: contact.phone,
  })) {
    return { success: false, error: "Tracey is already working this callback. Give it a minute before trying again." };
  }

  let dealId = input.dealId || null;
  if (!dealId) {
    const latestDeal = await db.deal.findFirst({
      where: {
        workspaceId: workspace.id,
        contactId: contact.id,
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
    dealId = latestDeal?.id || null;
  }

  if (!dealId) {
    return { success: false, error: "Tracey needs a lead or job thread before placing the recall." };
  }

  await scheduleLeadCallback({
    workspaceId: workspace.id,
    contactId: contact.id,
    contactPhone: contact.phone,
    contactName: contact.name || undefined,
    dealId,
    reason: "manual_recall:inbox",
    delaySec: 0,
    triggerSource: "inbox_recall",
    callbackKind: "manual",
    initiatedByUserId: user.id,
  });

  revalidatePath("/crm/inbox");
  revalidatePath(`/crm/deals/${dealId}`);
  revalidatePath(`/crm/contacts/${contact.id}`);

  return { success: true };
}
