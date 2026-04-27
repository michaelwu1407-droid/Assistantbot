import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { isOpsAuthorized, getUnauthorizedJsonResponse, db, ensureWorkspaceProvisioned } = vi.hoisted(() => ({
  isOpsAuthorized: vi.fn(),
  getUnauthorizedJsonResponse: vi.fn(() => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 })),
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

vi.mock("@/lib/ops-auth", () => ({
  isOpsAuthorized,
  getUnauthorizedJsonResponse,
}));

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/onboarding-provision", () => ({ ensureWorkspaceProvisioned }));

import { POST } from "@/app/api/internal/provisioning-retry/route";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("https://www.earlymark.ai/api/internal/provisioning-retry", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/internal/provisioning-retry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isOpsAuthorized.mockReturnValue(true);
  });

  it("rejects unauthorized requests", async () => {
    isOpsAuthorized.mockReturnValue(false);

    const response = await POST(makeRequest({ workspaceId: "ws_1" }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("validates workspaceId", async () => {
    const response = await POST(makeRequest({}));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Missing workspaceId" });
  });

  it("returns 404 when the workspace cannot be found", async () => {
    db.workspace.findUnique.mockResolvedValue(null);

    const response = await POST(makeRequest({ workspaceId: "ws_missing" }));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Workspace not found" });
  });

  it("retries provisioning with workspace-derived business and owner context", async () => {
    db.workspace.findUnique.mockResolvedValue({
      id: "ws_1",
      name: "Friendly Plumbing",
      ownerId: "user_1",
    });
    db.user.findUnique.mockResolvedValue({ phone: "+61434955958" });
    ensureWorkspaceProvisioned.mockResolvedValue({
      success: true,
      provisioningStatus: "provisioned",
      phoneNumber: "+61485010634",
    });

    const response = await POST(makeRequest({ workspaceId: "ws_1" }));

    expect(ensureWorkspaceProvisioned).toHaveBeenCalledWith({
      workspaceId: "ws_1",
      businessName: "Friendly Plumbing",
      ownerPhone: "+61434955958",
      triggerSource: "onboarding-activation",
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      workspaceId: "ws_1",
      businessName: "Friendly Plumbing",
      ownerPhonePresent: true,
      result: {
        success: true,
        provisioningStatus: "provisioned",
        phoneNumber: "+61485010634",
      },
    });
  });
});
