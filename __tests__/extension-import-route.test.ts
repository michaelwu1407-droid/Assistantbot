import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const hoisted = vi.hoisted(() => ({
  createContact: vi.fn(),
  importFromPortal: vi.fn(),
  requireCurrentWorkspaceAccess: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("@/actions/contact-actions", () => ({
  createContact: hoisted.createContact,
}));

vi.mock("@/actions/portal-actions", () => ({
  importFromPortal: hoisted.importFromPortal,
}));

vi.mock("@/lib/workspace-access", () => ({
  requireCurrentWorkspaceAccess: hoisted.requireCurrentWorkspaceAccess,
}));

vi.mock("@/lib/logging", () => ({
  logger: {
    error: hoisted.loggerError,
  },
}));

import { POST } from "@/app/api/extension/import/route";

describe("POST /api/extension/import", () => {
  const originalFlag = process.env.ENABLE_ARCHIVED_REAL_ESTATE_EXTENSION;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ENABLE_ARCHIVED_REAL_ESTATE_EXTENSION = "true";
    hoisted.requireCurrentWorkspaceAccess.mockResolvedValue({
      id: "user_1",
      workspaceId: "ws_1",
      role: "OWNER",
    });
    hoisted.createContact.mockResolvedValue({ success: true, contactId: "contact_1" });
    hoisted.importFromPortal.mockResolvedValue({ success: true, imported: 1 });
  });

  afterAll(() => {
    if (originalFlag === undefined) delete process.env.ENABLE_ARCHIVED_REAL_ESTATE_EXTENSION;
    else process.env.ENABLE_ARCHIVED_REAL_ESTATE_EXTENSION = originalFlag;
  });

  it("returns 410 when the archived feature flag is disabled", async () => {
    process.env.ENABLE_ARCHIVED_REAL_ESTATE_EXTENSION = "false";

    const response = await POST(
      new NextRequest("https://earlymark.ai/api/extension/import", {
        method: "POST",
        body: JSON.stringify({ type: "contact", workspaceId: "ws_1" }),
      }),
    );

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Archived feature (real-estate extension is paused).",
    });
  });

  it("rejects forbidden workspace access", async () => {
    const response = await POST(
      new NextRequest("https://earlymark.ai/api/extension/import", {
        method: "POST",
        body: JSON.stringify({ type: "contact", workspaceId: "ws_other", name: "Jane" }),
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Forbidden workspace access",
    });
  });

  it("imports contact data for the extension", async () => {
    const response = await POST(
      new NextRequest("https://earlymark.ai/api/extension/import", {
        method: "POST",
        body: JSON.stringify({ type: "contact", workspaceId: "ws_1", name: "Jane", company: "Acme" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(hoisted.createContact).toHaveBeenCalledWith({
      name: "Jane",
      company: "Acme",
      workspaceId: "ws_1",
    });
    await expect(response.json()).resolves.toEqual({ success: true, contactId: "contact_1" });
  });

  it("imports listing data from a portal URL", async () => {
    const response = await POST(
      new NextRequest("https://earlymark.ai/api/extension/import", {
        method: "POST",
        body: JSON.stringify({ type: "listing", workspaceId: "ws_1", sourceUrl: "https://rea.example/listing/1" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(hoisted.importFromPortal).toHaveBeenCalledWith("https://rea.example/listing/1", "ws_1");
    await expect(response.json()).resolves.toEqual({ success: true, imported: 1 });
  });
});
