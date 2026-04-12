import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const hoisted = vi.hoisted(() => ({
  getAuthUserId: vi.fn(),
  ensureWorkspaceProvisioned: vi.fn(),
  loggerInfo: vi.fn(),
  db: {
    workspace: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  getAuthUserId: hoisted.getAuthUserId,
}));

vi.mock("@/lib/db", () => ({
  db: hoisted.db,
}));

vi.mock("@/lib/logging", () => ({
  logger: {
    info: hoisted.loggerInfo,
  },
}));

vi.mock("@/lib/onboarding-provision", () => ({
  ensureWorkspaceProvisioned: hoisted.ensureWorkspaceProvisioned,
}));

describe("POST /api/workspace/setup-comms", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns 401 when the caller is not authenticated", async () => {
    hoisted.getAuthUserId.mockResolvedValue(null);
    const { POST } = await import("@/app/api/workspace/setup-comms/route");

    const response = await POST(
      new NextRequest("https://app.example.com/api/workspace/setup-comms", {
        method: "POST",
        body: JSON.stringify({ businessName: "Acme Plumbing", ownerPhone: "0400000000" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Not authenticated" });
  });

  it("returns 404 when the owner does not have a workspace", async () => {
    hoisted.getAuthUserId.mockResolvedValue("user_1");
    hoisted.db.workspace.findFirst.mockResolvedValue(null);
    const { POST } = await import("@/app/api/workspace/setup-comms/route");

    const response = await POST(
      new NextRequest("https://app.example.com/api/workspace/setup-comms", {
        method: "POST",
        body: JSON.stringify({ businessName: "Acme Plumbing", ownerPhone: "0400000000" }),
      }),
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "No workspace found for this user" });
  });

  it("returns the provisioning payload when setup succeeds", async () => {
    hoisted.getAuthUserId.mockResolvedValue("user_1");
    hoisted.db.workspace.findFirst.mockResolvedValue({
      id: "ws_1",
      twilioPhoneNumber: null,
      settings: {},
    });
    hoisted.ensureWorkspaceProvisioned.mockResolvedValue({
      success: true,
      phoneNumber: "+61485010634",
      provisioningStatus: "provisioned",
      error: null,
      stageReached: "number-purchase",
      mode: "full",
      errorCode: null,
      status: null,
      bundleSid: "BU_123",
      subaccountSid: "AC_123",
      elapsedMs: 3200,
    });
    const { POST } = await import("@/app/api/workspace/setup-comms/route");

    const response = await POST(
      new NextRequest("https://app.example.com/api/workspace/setup-comms", {
        method: "POST",
        body: JSON.stringify({ businessName: "Acme Plumbing", ownerPhone: "0400000000" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(hoisted.ensureWorkspaceProvisioned).toHaveBeenCalledWith({
      workspaceId: "ws_1",
      businessName: "Acme Plumbing",
      ownerPhone: "0400000000",
      triggerSource: "onboarding-check",
    });
    expect(await response.json()).toEqual(
      expect.objectContaining({
        success: true,
        phoneNumber: "+61485010634",
        provisioningStatus: "provisioned",
        mode: "full",
        bundleSid: "BU_123",
        subaccountSid: "AC_123",
      }),
    );
  });
});
