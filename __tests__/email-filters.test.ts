import { beforeEach, describe, expect, it, vi } from "vitest";

const { db, decrypt, encrypt } = vi.hoisted(() => ({
  db: {
    emailIntegration: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
  decrypt: vi.fn(),
  encrypt: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/encryption", () => ({ decrypt, encrypt }));

describe("email filter provisioning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.unstubAllEnvs();
    decrypt.mockImplementation((value: string) => `plain:${value}`);
    encrypt.mockImplementation((value: string) => `enc:${value}`);
  });

  it("rejects missing gmail integrations", async () => {
    db.emailIntegration.findUnique.mockResolvedValue(null);
    const { createGmailFilter } = await import("@/lib/email-filters");

    await expect(createGmailFilter("user_1", "integration_1")).rejects.toThrow("Gmail integration not found");
  });

  it("creates a gmail filter, label, and watch subscription", async () => {
    db.emailIntegration.findUnique.mockResolvedValue({
      id: "integration_1",
      userId: "user_1",
      provider: "gmail",
      refreshToken: "refresh-token",
    });
    vi.stubEnv("GMAIL_CLIENT_ID", "gmail-client-id");
    vi.stubEnv("GMAIL_CLIENT_SECRET", "gmail-client-secret");
    vi.stubEnv("GMAIL_PUBSUB_TOPIC", "projects/demo/topics/gmail");
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          json: vi.fn().mockResolvedValue({ access_token: "gmail-access", expires_in: 3600 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ id: "filter_123" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: vi.fn().mockResolvedValue(""),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ historyId: "history_123" }),
        }),
    );

    const { createGmailFilter } = await import("@/lib/email-filters");
    const filter = await createGmailFilter("user_1", "integration_1");

    expect(filter).toEqual({ id: "filter_123" });
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "https://www.googleapis.com/gmail/v1/users/me/settings/filters",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer gmail-access",
        }),
        body: expect.stringContaining("from:hipages.com.au"),
      }),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "https://www.googleapis.com/gmail/v1/users/me/settings/filters",
      expect.objectContaining({
        body: expect.stringContaining("subject:job request"),
      }),
    );
    expect(db.emailIntegration.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { id: "integration_1" },
        data: expect.objectContaining({
          accessToken: "enc:gmail-access",
          tokenExpiry: expect.any(Date),
        }),
      }),
    );
    expect(db.emailIntegration.update).toHaveBeenNthCalledWith(2, {
      where: { id: "integration_1" },
      data: { webhookId: "history_123" },
    });
  });

  it("creates an outlook rule and subscription", async () => {
    db.emailIntegration.findUnique.mockResolvedValue({
      id: "integration_2",
      userId: "user_2",
      provider: "outlook",
      refreshToken: "refresh-token",
    });
    vi.stubEnv("OUTLOOK_CLIENT_ID", "outlook-client-id");
    vi.stubEnv("OUTLOOK_CLIENT_SECRET", "outlook-client-secret");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://assistantbot.example.com");
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          json: vi.fn().mockResolvedValue({ access_token: "outlook-access", expires_in: 1800 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ id: "rule_456" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ id: "subscription_789" }),
        }),
    );

    const { createOutlookRule } = await import("@/lib/email-filters");
    const rule = await createOutlookRule("user_2", "integration_2");

    expect(rule).toEqual({ id: "rule_456" });
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messageRules",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("\"Pj-Buddy Lead Capture\""),
      }),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      3,
      "https://graph.microsoft.com/v1.0/subscriptions",
      expect.objectContaining({
        body: expect.stringContaining("https://assistantbot.example.com/api/webhooks/email-received"),
      }),
    );
    expect(db.emailIntegration.update).toHaveBeenNthCalledWith(2, {
      where: { id: "integration_2" },
      data: { webhookId: "subscription_789" },
    });
  });
});
