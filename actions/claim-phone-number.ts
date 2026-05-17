"use server";

/**
 * claimBusinessPhoneNumber — server action for tradies who don't yet have a
 * Twilio number (e.g. they declined during onboarding, or initial
 * provisioning failed). Marks the workspace as wanting a number, then
 * synchronously triggers the same ensureWorkspaceProvisioned path that
 * normally fires on Stripe payment.
 *
 * Returns the new phone number (E.164) on success, or a structured error.
 */
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/auth";
import { getOrCreateWorkspace } from "./workspace-actions";
import { ensureWorkspaceProvisioned } from "@/lib/onboarding-provision";

export async function claimBusinessPhoneNumber(): Promise<
  | { success: true; phoneNumber: string }
  | { success: false; error: string; stageReached?: string }
> {
  const userId = await getAuthUserId();
  if (!userId) return { success: false, error: "Not authenticated" };

  const workspaceView = await getOrCreateWorkspace(userId);
  const workspaceId = workspaceView.id;

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      name: true,
      twilioPhoneNumber: true,
      settings: true,
      ownerId: true,
    },
  });

  if (!workspace) return { success: false, error: "Workspace not found" };

  // Authorisation: only the workspace owner can claim the workspace's
  // business number. Teammates share the resource but don't manage it.
  if (workspace.ownerId !== userId) {
    console.warn(
      `[claim-phone-number] User ${userId} (not owner) attempted to claim number for workspace ${workspaceId}`,
    );
    return { success: false, error: "Only the workspace owner can claim a business number." };
  }

  if (workspace.twilioPhoneNumber) {
    return { success: true, phoneNumber: workspace.twilioPhoneNumber };
  }

  const owner = workspace.ownerId
    ? await db.user.findUnique({ where: { id: workspace.ownerId }, select: { phone: true } })
    : null;

  // Mark the workspace as wanting a number so ensureWorkspaceProvisioned
  // proceeds past its opt-in gate.
  const settings = (workspace.settings as Record<string, unknown> | null) ?? {};
  await db.workspace.update({
    where: { id: workspaceId },
    data: {
      settings: {
        ...settings,
        provisionPhoneNumberRequested: true,
      },
    },
  });

  const result = await ensureWorkspaceProvisioned({
    workspaceId,
    businessName: workspace.name || "",
    ownerPhone: owner?.phone ?? null,
    triggerSource: "manual_claim",
  });

  if (!result.success || !result.phoneNumber) {
    return {
      success: false,
      error: result.error || "Provisioning failed",
      stageReached: result.stageReached,
    };
  }

  revalidatePath("/crm/settings");
  revalidatePath("/crm/dashboard");
  return { success: true, phoneNumber: result.phoneNumber };
}
