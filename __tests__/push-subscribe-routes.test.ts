import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAuthUser, db, savePushSubscription, removePushSubscriptionByEndpoint } = vi.hoisted(() => ({
  getAuthUser: vi.fn(),
  db: {
    user: {
      findFirst: vi.fn(),
    },
  },
  savePushSubscription: vi.fn(),
  removePushSubscriptionByEndpoint: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getAuthUser,
}));

vi.mock("@/lib/db", () => ({ db }));

vi.mock("@/lib/push-notifications", () => ({
  savePushSubscription,
  removePushSubscriptionByEndpoint,
}));

describe("push subscription routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires authentication to subscribe", async () => {
    const { POST } = await import("@/app/api/push/subscribe/route");
    getAuthUser.mockResolvedValue(null);

    const response = await POST(
      new Request("https://www.earlymark.ai/api/push/subscribe", {
        method: "POST",
        body: JSON.stringify({
          endpoint: "https://push.example/sub_1",
          keys: { p256dh: "p", auth: "a" },
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("validates subscribe payloads", async () => {
    const { POST } = await import("@/app/api/push/subscribe/route");
    getAuthUser.mockResolvedValue({ email: "miguel@example.com" });
    db.user.findFirst.mockResolvedValue({ id: "user_1" });

    const response = await POST(
      new Request("https://www.earlymark.ai/api/push/subscribe", {
        method: "POST",
        body: JSON.stringify({ endpoint: "https://push.example/sub_1", keys: { p256dh: "p" } }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid subscription payload" });
  });

  it("saves push subscriptions for authenticated users", async () => {
    const { POST } = await import("@/app/api/push/subscribe/route");
    getAuthUser.mockResolvedValue({ email: "miguel@example.com" });
    db.user.findFirst.mockResolvedValue({ id: "user_1" });

    const response = await POST(
      new Request("https://www.earlymark.ai/api/push/subscribe", {
        method: "POST",
        body: JSON.stringify({
          endpoint: "https://push.example/sub_1",
          keys: { p256dh: "p256", auth: "auth-token" },
        }),
        headers: {
          "Content-Type": "application/json",
          "user-agent": "Vitest Browser",
        },
      }),
    );

    expect(savePushSubscription).toHaveBeenCalledWith(
      "user_1",
      {
        endpoint: "https://push.example/sub_1",
        keys: { p256dh: "p256", auth: "auth-token" },
      },
      "Vitest Browser",
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
  });

  it("removes subscriptions by endpoint", async () => {
    const { POST } = await import("@/app/api/push/unsubscribe/route");

    const response = await POST(
      new Request("https://www.earlymark.ai/api/push/unsubscribe", {
        method: "POST",
        body: JSON.stringify({ endpoint: "https://push.example/sub_1" }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(removePushSubscriptionByEndpoint).toHaveBeenCalledWith("https://push.example/sub_1");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
  });

  it("validates unsubscribe payloads", async () => {
    const { POST } = await import("@/app/api/push/unsubscribe/route");

    const response = await POST(
      new Request("https://www.earlymark.ai/api/push/unsubscribe", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Missing endpoint" });
  });
});
