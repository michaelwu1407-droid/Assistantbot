import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const hoisted = vi.hoisted(() => ({
  db: {
    workspace: {
      findUnique: vi.fn(),
    },
    contact: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    deal: {
      create: vi.fn(),
    },
    activity: {
      create: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
  },
  evaluateAutomations: vi.fn(),
  triageIncomingLead: vi.fn(),
  saveTriageRecommendation: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: hoisted.db }));
vi.mock("@/actions/automation-actions", () => ({
  evaluateAutomations: hoisted.evaluateAutomations,
}));
vi.mock("@/lib/ai/triage", () => ({
  triageIncomingLead: hoisted.triageIncomingLead,
  saveTriageRecommendation: hoisted.saveTriageRecommendation,
}));

import { POST } from "@/app/api/webhooks/webform/route";

function buildJsonRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("https://app.example.com/api/webhooks/webform", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/webhooks/webform", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    hoisted.evaluateAutomations.mockResolvedValue(undefined);
    hoisted.triageIncomingLead.mockResolvedValue({ recommendation: "ACCEPT", flags: [] });
    hoisted.saveTriageRecommendation.mockResolvedValue(undefined);
  });

  it("rejects requests that do not include a workspace id", async () => {
    const response = await POST(
      buildJsonRequest({
        name: "Alex",
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "workspace_id is required" });
  });

  it("rejects invalid shared secrets when the webhook secret is configured", async () => {
    vi.stubEnv("WEBFORM_WEBHOOK_SECRET", "secret-123");

    const response = await POST(
      buildJsonRequest({
        workspace_id: "ws_1",
        secret: "wrong-secret",
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Invalid secret" });
  });

  it("creates a contact, lead, activity, and owner notification for a valid enquiry", async () => {
    hoisted.db.workspace.findUnique.mockResolvedValue({
      id: "ws_1",
      name: "Acme Plumbing",
    });
    hoisted.db.contact.findFirst.mockResolvedValue(null);
    hoisted.db.contact.create.mockResolvedValue({
      id: "contact_1",
    });
    hoisted.db.deal.create.mockResolvedValue({
      id: "deal_1",
    });
    hoisted.db.user.findFirst.mockResolvedValue({
      id: "owner_1",
    });
    hoisted.db.notification.create.mockResolvedValue({});

    const response = await POST(
      buildJsonRequest({
        workspace_id: "ws_1",
        name: "Alex",
        email: "alex@example.com",
        phone: "0400000000",
        message: "Blocked drain at the back of the property",
        job_type: "Drain repair",
        address: "12 King St",
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      dealId: "deal_1",
      contactId: "contact_1",
      heldForReview: false,
      triageRecommendation: "ACCEPT",
      triageFlags: [],
    });
    expect(hoisted.db.contact.create).toHaveBeenCalledWith({
      data: {
        workspaceId: "ws_1",
        name: "Alex",
        email: "alex@example.com",
        phone: "0400000000",
      },
    });
    expect(hoisted.db.deal.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspaceId: "ws_1",
        contactId: "contact_1",
        title: "Drain repair — Alex",
        stage: "NEW",
        address: "12 King St",
        source: "website",
      }),
    });
    expect(hoisted.db.activity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "Website enquiry received",
        dealId: "deal_1",
        contactId: "contact_1",
      }),
    });
    expect(hoisted.evaluateAutomations).toHaveBeenCalledWith("ws_1", {
      type: "new_lead",
      contactId: "contact_1",
      dealId: "deal_1",
    });
    expect(hoisted.triageIncomingLead).toHaveBeenCalledWith("ws_1", {
      title: "Drain repair — Alex",
      description: "Blocked drain at the back of the property",
      address: "12 King St",
    });
    expect(hoisted.saveTriageRecommendation).toHaveBeenCalledWith("deal_1", {
      recommendation: "ACCEPT",
      flags: [],
    });
    expect(hoisted.db.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "owner_1",
        title: "New website enquiry - Alex",
        type: "INFO",
        link: "/crm/deals/deal_1",
      }),
    });
  });

  it("holds risky website leads for owner review and does not trigger customer automations", async () => {
    hoisted.db.workspace.findUnique.mockResolvedValue({
      id: "ws_1",
      name: "Acme Plumbing",
    });
    hoisted.db.contact.findFirst.mockResolvedValue(null);
    hoisted.db.contact.create.mockResolvedValue({
      id: "contact_1",
    });
    hoisted.db.deal.create.mockResolvedValue({
      id: "deal_1",
    });
    hoisted.db.user.findFirst.mockResolvedValue({
      id: "owner_1",
    });
    hoisted.db.notification.create.mockResolvedValue({});
    hoisted.triageIncomingLead.mockResolvedValue({
      recommendation: "HOLD_REVIEW",
      flags: ["Needs review: Missing address", "Needs review: roofing"],
    });

    const response = await POST(
      buildJsonRequest({
        workspace_id: "ws_1",
        name: "Alex",
        email: "alex@example.com",
        message: "Can you do roofing work? Budget is tiny.",
        job_type: "Roof repair",
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      dealId: "deal_1",
      contactId: "contact_1",
      heldForReview: true,
      triageRecommendation: "HOLD_REVIEW",
      triageFlags: ["Needs review: Missing address", "Needs review: roofing"],
    });
    expect(hoisted.saveTriageRecommendation).toHaveBeenCalledWith("deal_1", {
      recommendation: "HOLD_REVIEW",
      flags: ["Needs review: Missing address", "Needs review: roofing"],
    });
    expect(hoisted.evaluateAutomations).not.toHaveBeenCalled();
    expect(hoisted.db.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "owner_1",
        title: "Review website enquiry - Alex",
        message: "Tracey held this lead for review: Needs review: Missing address; Needs review: roofing",
        type: "WARNING",
        link: "/crm/deals/deal_1",
      }),
    });
  });
});
