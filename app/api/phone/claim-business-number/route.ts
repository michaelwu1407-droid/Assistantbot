import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { db } from "@/lib/db";
import { ensureWorkspaceProvisioned } from "@/lib/onboarding-provision";
import { requireCurrentWorkspaceAccess } from "@/lib/workspace-access";

function getWorkspaceSettings(settings: unknown): Record<string, unknown> {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return {};
  }

  return settings as Record<string, unknown>;
}

export async function POST() {
  try {
    const actor = await requireCurrentWorkspaceAccess();
    const workspace = await db.workspace.findUnique({
      where: { id: actor.workspaceId },
      select: {
        id: true,
        name: true,
        ownerId: true,
        twilioPhoneNumber: true,
        settings: true,
      },
    });

    if (!workspace) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 });
    }

    if (workspace.ownerId !== actor.id) {
      return NextResponse.json(
        { success: false, error: "Only the workspace owner can claim a business number." },
        { status: 403 },
      );
    }

    if (workspace.twilioPhoneNumber) {
      return NextResponse.json({ success: true, started: false, phoneNumber: workspace.twilioPhoneNumber });
    }

    const owner = await db.user.findUnique({
      where: { id: workspace.ownerId },
      select: { phone: true },
    });

    const settings = getWorkspaceSettings(workspace.settings);
    await db.workspace.update({
      where: { id: workspace.id },
      data: {
        settings: {
          ...settings,
          provisionPhoneNumberRequested: true,
          onboardingProvisioningStatus: "requested",
          onboardingProvisioningError: null,
          onboardingProvisioningUpdatedAt: new Date().toISOString(),
          onboardingProvisioningTriggerSource: "manual_claim",
        },
      },
    });

    waitUntil(
      ensureWorkspaceProvisioned({
        workspaceId: workspace.id,
        businessName: workspace.name || "",
        ownerPhone: owner?.phone ?? null,
        triggerSource: "manual_claim",
      }).catch((error) => {
        console.error("[claim-business-number] Background provisioning failed:", error);
      }),
    );

    return NextResponse.json({
      success: true,
      started: true,
      message: "We are setting up your business number now.",
    });
  } catch (error) {
    console.error("[claim-business-number] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Could not claim a number" },
      { status: 500 },
    );
  }
}
