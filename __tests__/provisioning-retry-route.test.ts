import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const hoisted = vi.hoisted(() => ({
  db: {
    workspace: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
  ensureWorkspaceProvisioned: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: hoisted.db }));
vi.mock("@/lib/onboarding-provision", () => ({
  ensureWorkspaceProvisioned: hoisted.ensureWorkspaceProvisioned,
}));

import { POST } from "@/app/api/internal/provisioning-retry/route";

function makeRequest(body: Record<string, unknown> = {}) {
  return new NextRequest("https://app.example.com/api/internal/provisioning-retry", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/internal/provisioning-retry (onb-12)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.db.workspace.findUnique.mockResolvedValue({
      id: "ws_1",
      name: "Acme Plumbing",
      ownerId: "owner_1",
    });
    hoisted.db.user.findUnique.mockResolvedValue({ phone: "0400000000" });
    hoisted.ensureWorkspaceProvisioned.mockResolvedValue({
      provisioningStatus: "provisioned",
      elapsedMs: 100,
      phoneNumber: "+61400000000",
    });
  });

  it("returns 400 when workspaceId is missing from the request body", async () => {
    const response = await POST(makeRequest({}));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Missing workspaceId" });
    expect(hoisted.ensureWorkspaceProvisioned).not.toHaveBeenCalled();
  });

  it("returns 404 when the workspace is not found in the database", async () => {
    hoisted.db.workspace.findUnique.mockResolvedValue(null);

    const response = await POST(makeRequest({ workspaceId: "ws_ghost" }));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Workspace not found" });
    expect(hoisted.ensureWorkspaceProvisioned).not.toHaveBeenCalled();
  });

  it("calls ensureWorkspaceProvisioned with triggerSource onboarding-activation and returns ok", async () => {
    const response = await POST(makeRequest({ workspaceId: "ws_1" }));

    expect(response.status).toBe(200);
    expect(hoisted.ensureWorkspaceProvisioned).toHaveBeenCalledWith({
      workspaceId: "ws_1",
      businessName: "Acme Plumbing",
      ownerPhone: "0400000000",
      triggerSource: "onboarding-activation",
    });
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.workspaceId).toBe("ws_1");
    expect(body.businessName).toBe("Acme Plumbing");
    expect(body.ownerPhonePresent).toBe(true);
  });

  it("handles missing owner gracefully (ownerPhone becomes null)", async () => {
    hoisted.db.workspace.findUnique.mockResolvedValue({
      id: "ws_nophone",
      name: "No Phone Co",
      ownerId: null,
    });

    const response = await POST(makeRequest({ workspaceId: "ws_nophone" }));

    expect(response.status).toBe(200);
    expect(hoisted.ensureWorkspaceProvisioned).toHaveBeenCalledWith(
      expect.objectContaining({ ownerPhone: null }),
    );
    const body = await response.json();
    expect(body.ownerPhonePresent).toBe(false);
  });
});
