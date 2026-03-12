import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  db,
  logger,
  provisionTradieCommsWithFallback,
} = vi.hoisted(() => ({
  db: {
    workspace: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
  provisionTradieCommsWithFallback: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db,
}));

vi.mock("@/lib/logging", () => ({
  logger,
}));

vi.mock("@/lib/comms-provision", () => ({
  provisionTradieCommsWithFallback,
}));

import { ensureWorkspaceProvisioned } from "@/lib/onboarding-provision";

describe("ensureWorkspaceProvisioned", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.workspace.findFirst.mockResolvedValue(null);
    db.workspace.update.mockResolvedValue({});
    db.user.findMany.mockResolvedValue([]);
  });

  it("persists stage and Twilio diagnostics when provisioning fails", async () => {
    db.workspace.findUnique
      .mockResolvedValueOnce({
        id: "ws_123",
        ownerId: "user_123",
        subscriptionStatus: "active",
        twilioPhoneNumber: null,
        settings: { provisionPhoneNumberRequested: true, existing: "value" },
      })
      .mockResolvedValueOnce({
        settings: { persisted: true },
      });

    provisionTradieCommsWithFallback.mockResolvedValue({
      success: false,
      error: "bundle required",
      stageReached: "number-purchase",
      mode: "full",
      errorCode: 21649,
      status: 400,
      bundleSid: "BU_parent",
      subaccountSid: "AC_sub",
    });

    const result = await ensureWorkspaceProvisioned({
      workspaceId: "ws_123",
      businessName: "Alexandria Automotive Services",
      ownerPhone: "0434955958",
      triggerSource: "onboarding-check",
    });

    expect(result).toMatchObject({
      success: false,
      provisioningStatus: "failed",
      stageReached: "number-purchase",
      mode: "full",
      errorCode: 21649,
      status: 400,
      bundleSid: "BU_parent",
      subaccountSid: "AC_sub",
    });

    expect(db.workspace.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { id: "ws_123" },
        data: {
          settings: expect.objectContaining({
            onboardingProvisioningStatus: "provisioning",
            onboardingProvisioningStageReached: null,
            onboardingProvisioningMode: null,
            onboardingProvisioningErrorCode: null,
            onboardingProvisioningHttpStatus: null,
            onboardingProvisioningBundleSid: null,
            onboardingProvisioningSubaccountSid: null,
          }),
        },
      }),
    );

    expect(db.workspace.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { id: "ws_123" },
        data: {
          settings: expect.objectContaining({
            onboardingProvisioningStatus: "failed",
            onboardingProvisioningError: "bundle required",
            onboardingProvisioningStageReached: "number-purchase",
            onboardingProvisioningMode: "full",
            onboardingProvisioningErrorCode: 21649,
            onboardingProvisioningHttpStatus: 400,
            onboardingProvisioningBundleSid: "BU_parent",
            onboardingProvisioningSubaccountSid: "AC_sub",
          }),
        },
      }),
    );
  });

  it("short-circuits when a workspace already has a provisioned number", async () => {
    db.workspace.findUnique.mockResolvedValueOnce({
      id: "ws_existing",
      ownerId: "user_existing",
      subscriptionStatus: "active",
      twilioPhoneNumber: "+61485010634",
      settings: { provisionPhoneNumberRequested: true },
    });

    const result = await ensureWorkspaceProvisioned({
      workspaceId: "ws_existing",
      businessName: "Alexandria Automotive Services",
      ownerPhone: "0434955958",
      triggerSource: "billing-success",
    });

    expect(result).toMatchObject({
      success: true,
      provisioningStatus: "already_provisioned",
      phoneNumber: "+61485010634",
    });
    expect(provisionTradieCommsWithFallback).not.toHaveBeenCalled();
    expect(db.workspace.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ws_existing" },
        data: {
          settings: expect.objectContaining({
            onboardingProvisioningStatus: "already_provisioned",
            onboardingProvisioningStageReached: null,
            onboardingProvisioningMode: null,
            onboardingProvisioningErrorCode: null,
            onboardingProvisioningHttpStatus: null,
            onboardingProvisioningBundleSid: null,
            onboardingProvisioningSubaccountSid: null,
          }),
        },
      }),
    );
  });
});
