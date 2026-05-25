import { describe, expect, it } from "vitest";

import { POST } from "@/app/api/retell/webhook/route";

describe("POST /api/retell/webhook (voice-10)", () => {
  it("returns 410 Gone with a deprecation message (migrated to LiveKit)", async () => {
    const response = await POST();

    expect(response.status).toBe(410);
    const body = await response.json();
    expect(body.error).toBe("Gone");
    expect(body.message).toMatch(/deprecated|LiveKit/i);
  });
});
