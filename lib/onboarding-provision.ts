import { db } from "@/lib/db";
import { logger } from "@/lib/logging";
import { provisionTradieCommsWithFallback } from "@/lib/comms-provision";

function getWorkspaceSettings(settings: unknown): Record<string, unknown> {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return {};
  }

  return settings as Record<string, unknown>;
}

type TriggerSource = "stripe-webhook" | "billing-success" | "onboarding-check" | "onboarding-activation";

export type WorkspaceProvisioningStatus =
  | "not_requested"
  | "requested"
  | "provisioning"
  | "provisioned"
  | "failed"
  | "blocked_duplicate"
  | "already_provisioned";

function normalizePhone(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

export async function ensureWorkspaceProvisioned(params: {
  workspaceId: string;
  businessName: string;
  ownerPhone?: string | null;
  triggerSource: TriggerSource;
}): Promise<{
  success: boolean;
  phoneNumber?: string;
  provisioningStatus: WorkspaceProvisioningStatus;
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
      ownerId: true,
      subscriptionStatus: true,
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

  const settings = getWorkspaceSettings(workspace.settings);
  const provisionPhoneNumberRequested = settings.provisionPhoneNumberRequested === true;
  const normalizedOwnerPhone = normalizePhone(params.ownerPhone);

  if (!provisionPhoneNumberRequested) {
    const elapsedMs = Date.now() - startedAt;
    await db.workspace.update({
      where: { id: workspace.id },
      data: {
        settings: {
          ...settings,
          onboardingProvisioningStatus: "not_requested",
          onboardingProvisioningError: "Provision mobile business number was not enabled before payment.",
          onboardingProvisioningUpdatedAt: new Date().toISOString(),
          onboardingProvisioningTriggerSource: params.triggerSource,
          onboardingProvisioningLastElapsedMs: elapsedMs,
        },
      },
    });

    return {
      success: false,
      provisioningStatus: "not_requested",
      error: "Provision mobile business number was not enabled before payment.",
      elapsedMs,
    };
  }

  if (workspace.subscriptionStatus !== "active") {
    const elapsedMs = Date.now() - startedAt;
    await db.workspace.update({
      where: { id: workspace.id },
      data: {
        settings: {
          ...settings,
          onboardingProvisioningStatus: "requested",
          onboardingProvisioningError: "Provisioning is queued until Stripe payment completes.",
          onboardingProvisioningUpdatedAt: new Date().toISOString(),
          onboardingProvisioningTriggerSource: params.triggerSource,
          onboardingProvisioningLastElapsedMs: elapsedMs,
        },
      },
    });

    return {
      success: false,
      provisioningStatus: "requested",
      error: "Provisioning is queued until Stripe payment completes.",
      elapsedMs,
    };
  }

  if (workspace.twilioPhoneNumber) {
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

  if (normalizedOwnerPhone) {
    const usersWithPhone = await db.user.findMany({
      where: { phone: { not: null } },
      select: { id: true, email: true, phone: true, workspaceId: true },
    });
    const duplicateOwnerIds = usersWithPhone
      .filter((user) => normalizePhone(user.phone) === normalizedOwnerPhone)
      .map((user) => ({ id: user.id, email: user.email }));

    if (duplicateOwnerIds.length > 0) {
      const duplicateWorkspace = await db.workspace.findFirst({
        where: {
          id: { not: workspace.id },
          ownerId: { in: duplicateOwnerIds.map((owner) => owner.id) },
          twilioPhoneNumber: { not: null },
        },
        select: {
          id: true,
          name: true,
          twilioPhoneNumber: true,
          settings: true,
        },
      });

      if (duplicateWorkspace) {
        const elapsedMs = Date.now() - startedAt;
        const duplicateOwner = duplicateOwnerIds.find((owner) => owner.id !== workspace.ownerId) ?? duplicateOwnerIds[0];
        const currentWebsiteUrl = typeof settings.websiteUrl === "string" ? settings.websiteUrl : null;
        const duplicateSettings = getWorkspaceSettings(duplicateWorkspace.settings);
        await db.workspace.update({
          where: { id: workspace.id },
          data: {
            settings: {
              ...settings,
              onboardingProvisioningStatus: "blocked_duplicate",
              onboardingProvisioningError: `Provisioning blocked during beta. This owner phone is already linked to ${duplicateWorkspace.name || "another workspace"} (${duplicateWorkspace.twilioPhoneNumber}).`,
              onboardingProvisioningUpdatedAt: new Date().toISOString(),
              onboardingProvisioningTriggerSource: params.triggerSource,
              onboardingProvisioningLastElapsedMs: elapsedMs,
              onboardingProvisioningDuplicateWorkspaceId: duplicateWorkspace.id,
              onboardingProvisioningDuplicatePhone: duplicateWorkspace.twilioPhoneNumber,
              onboardingProvisioningDiagnosticEmail: duplicateOwner?.email ?? null,
              onboardingProvisioningDiagnosticWebsiteUrl: currentWebsiteUrl,
              onboardingProvisioningDuplicateWebsiteUrl:
                typeof duplicateSettings.websiteUrl === "string" ? duplicateSettings.websiteUrl : null,
            },
          },
        });

        return {
          success: false,
          provisioningStatus: "blocked_duplicate",
          error: `Provisioning blocked during beta. This owner phone is already linked to ${duplicateWorkspace.name || "another workspace"} (${duplicateWorkspace.twilioPhoneNumber}).`,
          elapsedMs,
        };
      }
    }
  }

  await db.workspace.update({
    where: { id: workspace.id },
    data: {
      settings: {
        ...settings,
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
