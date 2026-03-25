import { describe, expect, it } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  // Each test uses a unique key to avoid cross-test state
  let keyCounter = 0;
  function uniqueKey() {
    return `test:${++keyCounter}:${Date.now()}`;
  }

  it("allows requests under the limit", async () => {
    const key = uniqueKey();
    for (let i = 0; i < 5; i++) {
      const result = await rateLimit(key, 5, 60_000);
      expect(result.allowed).toBe(true);
    }
  });

  it("blocks requests over the limit", async () => {
    const key = uniqueKey();
    for (let i = 0; i < 3; i++) {
      await rateLimit(key, 3, 60_000);
    }
    const result = await rateLimit(key, 3, 60_000);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.retryAfterMs).toBeGreaterThan(0);
      expect(result.retryAfterMs).toBeLessThanOrEqual(60_000);
    }
  });

  it("resets after window expires", async () => {
    const key = uniqueKey();
    // Use a very short window
    await rateLimit(key, 1, 50);
    const blocked = await rateLimit(key, 1, 50);
    expect(blocked.allowed).toBe(false);

    // Wait for window to expire
    await new Promise((resolve) => setTimeout(resolve, 60));
    const result = await rateLimit(key, 1, 50);
    expect(result.allowed).toBe(true);
  });

  it("tracks different keys independently", async () => {
    const keyA = uniqueKey();
    const keyB = uniqueKey();
    await rateLimit(keyA, 1, 60_000);
    const blockedA = await rateLimit(keyA, 1, 60_000);
    const allowedB = await rateLimit(keyB, 1, 60_000);
    expect(blockedA.allowed).toBe(false);
    expect(allowedB.allowed).toBe(true);
  });
});
