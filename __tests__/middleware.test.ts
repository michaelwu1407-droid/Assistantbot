import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { updateSession } = vi.hoisted(() => ({
  updateSession: vi.fn(),
}));

vi.mock("@/lib/supabase/middleware", () => ({
  updateSession,
}));

import { middleware } from "@/middleware";

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateSession.mockImplementation(async () => new Response(null, { status: 200 }));
  });

  it("blocks internal debug routes in production when the flag is disabled", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ENABLE_INTERNAL_DEBUG_ROUTES", "false");

    const response = await middleware(new NextRequest("https://app.example.com/api/check-env"));

    expect(response.status).toBe(404);
    expect(response.headers.get("x-middleware-rewrite")).toContain("/404");
    expect(updateSession).not.toHaveBeenCalled();
  });

  it("does not rewrite public auth routes", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ENABLE_INTERNAL_DEBUG_ROUTES", "false");

    const response = await middleware(new NextRequest("https://app.example.com/auth"));

    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
    expect(updateSession).not.toHaveBeenCalled();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });
});
