import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const hoisted = vi.hoisted(() => ({
  db: {
    contact: { update: vi.fn() },
  },
  verifyUnsubscribeToken: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: hoisted.db }));
vi.mock("@/lib/email-unsubscribe-token", () => ({
  verifyUnsubscribeToken: hoisted.verifyUnsubscribeToken,
}));

import { GET } from "@/app/api/unsubscribe/email/route";

function buildRequest(token: string) {
  return new NextRequest(`https://app.example.com/api/unsubscribe/email?token=${token}`);
}

describe("GET /api/unsubscribe/email (cpl-08)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.db.contact.update.mockResolvedValue({});
  });

  it("sets emailOptedOut=true on the contact for a valid token", async () => {
    hoisted.verifyUnsubscribeToken.mockReturnValue("contact_1");

    const response = await GET(buildRequest("valid-token-xyz"));

    expect(response.status).toBe(200);
    expect(hoisted.db.contact.update).toHaveBeenCalledWith({
      where: { id: "contact_1" },
      data: { emailOptedOut: true },
    });
    const body = await response.text();
    expect(body).toContain("Unsubscribed");
  });

  it("returns 400 HTML when the token is invalid (tamper protection)", async () => {
    hoisted.verifyUnsubscribeToken.mockReturnValue(null);

    const response = await GET(buildRequest("bad-token"));

    expect(response.status).toBe(400);
    expect(hoisted.db.contact.update).not.toHaveBeenCalled();
    const body = await response.text();
    expect(body).toContain("Invalid link");
  });

  it("returns 200 success even when the contact no longer exists (no enumeration)", async () => {
    hoisted.verifyUnsubscribeToken.mockReturnValue("contact_deleted");
    hoisted.db.contact.update.mockRejectedValue(new Error("Record not found"));

    const response = await GET(buildRequest("valid-token-xyz"));

    expect(response.status).toBe(200);
  });
});
