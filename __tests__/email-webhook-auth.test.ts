import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  db: {
    workspace: {
      findUnique: vi.fn(),
    },
  },
  findWorkspaceByInboundEmail: vi.fn(),
  classifyMessage: vi.fn(),
  generateObject: vi.fn(),
  createGoogleGenerativeAI: vi.fn(() => () => ({})),
}));

vi.mock("@/lib/db", () => ({ db: hoisted.db }));
vi.mock("@/lib/workspace-routing", () => ({
  findWorkspaceByInboundEmail: hoisted.findWorkspaceByInboundEmail,
}));
vi.mock("@/lib/spam-classifier", () => ({
  classifyMessage: hoisted.classifyMessage,
}));
vi.mock("ai", () => ({ generateObject: hoisted.generateObject }));
vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: hoisted.createGoogleGenerativeAI,
}));

import { POST } from "@/app/api/webhooks/email/route";

function emailRequest(headers: Record<string, string>): Request {
  return new Request("https://earlymark.ai/api/webhooks/email", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({
      to: "ws_alias@earlymark.ai",
      from: "jobs@hipages.com.au",
      subject: "New lead",
      text: "phone: 0434955958",
    }),
  });
}

describe("POST /api/webhooks/email auth gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 503 when EMAIL_WEBHOOK_SECRET is missing and never routes the email", async () => {
    vi.stubEnv("EMAIL_WEBHOOK_SECRET", "");

    const res = await POST(emailRequest({}));

    expect(res.status).toBe(503);
    expect(hoisted.findWorkspaceByInboundEmail).not.toHaveBeenCalled();
  });

  it("returns 401 when the header is missing", async () => {
    vi.stubEnv("EMAIL_WEBHOOK_SECRET", "the-secret");

    const res = await POST(emailRequest({}));

    expect(res.status).toBe(401);
    expect(hoisted.findWorkspaceByInboundEmail).not.toHaveBeenCalled();
  });

  it("returns 401 when the header value is wrong", async () => {
    vi.stubEnv("EMAIL_WEBHOOK_SECRET", "the-secret");

    const res = await POST(emailRequest({ "x-email-webhook-secret": "wrong" }));

    expect(res.status).toBe(401);
    expect(hoisted.findWorkspaceByInboundEmail).not.toHaveBeenCalled();
  });

  it("passes the auth gate when the header matches and proceeds to routing", async () => {
    vi.stubEnv("EMAIL_WEBHOOK_SECRET", "the-secret");
    hoisted.findWorkspaceByInboundEmail.mockResolvedValue(null);

    const res = await POST(emailRequest({ "x-email-webhook-secret": "the-secret" }));

    expect(hoisted.findWorkspaceByInboundEmail).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(404);
  });
});
