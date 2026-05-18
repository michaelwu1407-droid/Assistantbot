import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const hoisted = vi.hoisted(() => ({
  requireCurrentWorkspaceAccess: vi.fn(),
  requireDealInCurrentWorkspace: vi.fn(),
  manualSendJobReminder: vi.fn(),
  manualSendTripSms: vi.fn(),
  getReminderStats: vi.fn(),
}));

vi.mock("@/lib/workspace-access", () => ({
  requireCurrentWorkspaceAccess: hoisted.requireCurrentWorkspaceAccess,
  requireDealInCurrentWorkspace: hoisted.requireDealInCurrentWorkspace,
}));

vi.mock("@/actions/reminder-actions", () => ({
  manualSendJobReminder: hoisted.manualSendJobReminder,
  manualSendTripSms: hoisted.manualSendTripSms,
  getReminderStats: hoisted.getReminderStats,
}));

import { GET, POST } from "@/app/api/reminders/route";

function postRequest(body: unknown): NextRequest {
  return new NextRequest("https://earlymark.ai/api/reminders", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/reminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.requireCurrentWorkspaceAccess.mockResolvedValue({
      id: "user_1",
      workspaceId: "ws_1",
      role: "OWNER",
    });
    hoisted.requireDealInCurrentWorkspace.mockResolvedValue({
      actor: { id: "user_1", workspaceId: "ws_1", role: "OWNER" },
      deal: { id: "deal_1", workspaceId: "ws_1" },
    });
    hoisted.manualSendJobReminder.mockResolvedValue({ success: true });
    hoisted.manualSendTripSms.mockResolvedValue({ success: true });
  });

  it("rejects unauthenticated callers with 401 and sends nothing", async () => {
    hoisted.requireCurrentWorkspaceAccess.mockRejectedValue(new Error("Unauthorized"));

    const res = await POST(postRequest({ action: "sendReminder", dealId: "deal_1" }));

    expect(res.status).toBe(401);
    expect(hoisted.manualSendJobReminder).not.toHaveBeenCalled();
    expect(hoisted.manualSendTripSms).not.toHaveBeenCalled();
  });

  it("refuses to send a reminder for a deal in another workspace", async () => {
    hoisted.requireDealInCurrentWorkspace.mockRejectedValue(new Error("Deal not found"));

    const res = await POST(postRequest({ action: "sendReminder", dealId: "deal_other" }));

    expect(res.status).toBe(403);
    expect(hoisted.manualSendJobReminder).not.toHaveBeenCalled();
  });

  it("refuses to send a trip SMS for a deal in another workspace", async () => {
    hoisted.requireDealInCurrentWorkspace.mockRejectedValue(new Error("Deal not found"));

    const res = await POST(postRequest({ action: "sendTripSms", dealId: "deal_other" }));

    expect(res.status).toBe(403);
    expect(hoisted.manualSendTripSms).not.toHaveBeenCalled();
  });

  it("sends a reminder when the deal is in the caller's workspace", async () => {
    const res = await POST(postRequest({ action: "sendReminder", dealId: "deal_1" }));

    expect(res.status).toBe(200);
    expect(hoisted.manualSendJobReminder).toHaveBeenCalledWith("deal_1", "user_1");
  });

  it("rejects unknown actions with 400", async () => {
    const res = await POST(postRequest({ action: "dropAllReminders", dealId: "deal_1" }));

    expect(res.status).toBe(400);
    expect(hoisted.manualSendJobReminder).not.toHaveBeenCalled();
    expect(hoisted.manualSendTripSms).not.toHaveBeenCalled();
  });

  it("requires both action and dealId", async () => {
    const res = await POST(postRequest({ action: "sendReminder" }));

    expect(res.status).toBe(400);
    expect(hoisted.requireDealInCurrentWorkspace).not.toHaveBeenCalled();
  });
});

describe("GET /api/reminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.requireCurrentWorkspaceAccess.mockResolvedValue({
      id: "user_1",
      workspaceId: "ws_1",
      role: "OWNER",
    });
    hoisted.getReminderStats.mockResolvedValue({ sent: 0 });
  });

  it("rejects unauthenticated callers with 401", async () => {
    hoisted.requireCurrentWorkspaceAccess.mockRejectedValue(new Error("Unauthorized"));

    const res = await GET(new NextRequest("https://earlymark.ai/api/reminders"));

    expect(res.status).toBe(401);
    expect(hoisted.getReminderStats).not.toHaveBeenCalled();
  });

  it("refuses to return stats for another workspace via query string", async () => {
    const res = await GET(new NextRequest("https://earlymark.ai/api/reminders?workspaceId=ws_other"));

    expect(res.status).toBe(403);
    expect(hoisted.getReminderStats).not.toHaveBeenCalled();
  });

  it("returns stats for the session workspace by default", async () => {
    const res = await GET(new NextRequest("https://earlymark.ai/api/reminders"));

    expect(res.status).toBe(200);
    expect(hoisted.getReminderStats).toHaveBeenCalledWith("ws_1");
  });
});
