import { db } from "@/lib/db";
import { logger } from "@/lib/logging";
import { provisionTradieCommsWithFallback } from "@/lib/comms-provision";

function getWorkspaceSettings(settings: unknown): Record<string, unknown> {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return {};
  }

  return settings as Record<string, unknown>;
}

type TriggerSource = "stripe-webhook" | "billing-success" | "onboarding-check";

export async function ensureWorkspaceProvisioned(params: {
  workspaceId: string;
  businessName: string;
  ownerPhone?: string | null;
  triggerSource: TriggerSource;
}): Promise<{
  success: boolean;
  phoneNumber?: string;
  provisioningStatus: "already_provisioned" | "provisioned" | "failed";
  error?: string;
  stageReached?: string;
  mode?: "full" | "simple";
  elapsedMs: number;
}> {
  const startedAt = Date.now();

  const workspace = await db.workspace.findUnique({
    where: { id: params.workspaceId },
    select: {
      id: true,
      twilioPhoneNumber: true,
      settings: true,
    },
  });

  if (!workspace) {
    const elapsedMs = Date.now() - startedAt;
    logger.error("ONBOARDING PROVISION: Workspace not found", {
      workspaceId: params.workspaceId,
      triggerSource: params.triggerSource,
      elapsedMs,
    });
    return {
      success: false,
      provisioningStatus: "failed",
      error: "Workspace not found",
      elapsedMs,
    };
  }

  if (workspace.twilioPhoneNumber) {
    const settings = getWorkspaceSettings(workspace.settings);
    const elapsedMs = Date.now() - startedAt;

    await db.workspace.update({
      where: { id: workspace.id },
      data: {
        settings: {
          ...settings,
          onboardingProvisioningStatus: "already_provisioned",
          onboardingProvisionedNumber: workspace.twilioPhoneNumber,
          onboardingProvisioningError: null,
          onboardingProvisioningUpdatedAt: new Date().toISOString(),
          onboardingProvisioningLastElapsedMs: elapsedMs,
          onboardingProvisioningTriggerSource: params.triggerSource,
        },
      },
    });

    logger.info("ONBOARDING PROVISION: Existing number resolved", {
      workspaceId: workspace.id,
      triggerSource: params.triggerSource,
      provisioningStatus: "already_provisioned",
      phoneNumber: workspace.twilioPhoneNumber,
      elapsedMs,
    });

    return {
      success: true,
      phoneNumber: workspace.twilioPhoneNumber,
      provisioningStatus: "already_provisioned",
      elapsedMs,
    };
  }

  const existingSettings = getWorkspaceSettings(workspace.settings);
  await db.workspace.update({
    where: { id: workspace.id },
    data: {
      settings: {
        ...existingSettings,
        onboardingProvisioningStatus: "provisioning",
        onboardingProvisioningError: null,
        onboardingProvisioningStartedAt: new Date().toISOString(),
        onboardingProvisioningTriggerSource: params.triggerSource,
      },
    },
  });

  logger.info("ONBOARDING PROVISION: Starting provisioning", {
    workspaceId: workspace.id,
    triggerSource: params.triggerSource,
  });

  const result = await provisionTradieCommsWithFallback(
    workspace.id,
    params.businessName,
    params.ownerPhone || ""
  );

  const elapsedMs = Date.now() - startedAt;
  const latestWorkspace = await db.workspace.findUnique({
    where: { id: workspace.id },
    select: { settings: true },
  });
  const latestSettings = getWorkspaceSettings(latestWorkspace?.settings);
  const provisioningStatus = result.success ? "provisioned" : "failed";

  await db.workspace.update({
    where: { id: workspace.id },
    data: {
      settings: {
        ...latestSettings,
        onboardingProvisioningStatus: provisioningStatus,
        onboardingProvisionedNumber: result.phoneNumber ?? null,
        onboardingProvisioningError: result.error ?? null,
        onboardingProvisioningUpdatedAt: new Date().toISOString(),
        onboardingProvisioningLastElapsedMs: elapsedMs,
        onboardingProvisioningTriggerSource: params.triggerSource,
      },
    },
  });

  logger.info("ONBOARDING PROVISION: Provisioning finished", {
    workspaceId: workspace.id,
    triggerSource: params.triggerSource,
    provisioningStatus,
    stageReached: result.stageReached,
    mode: result.mode,
    elapsedMs,
    phoneNumber: result.phoneNumber,
    error: result.error,
  });

  return {
    success: result.success,
    phoneNumber: result.phoneNumber,
    provisioningStatus,
    error: result.error,
    stageReached: result.stageReached,
    mode: result.mode,
    elapsedMs,
  };
}
