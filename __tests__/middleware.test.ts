import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

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
    updateSession.mockImplementation(async () => NextResponse.next());
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

  it("refreshes the session for protected page routes", async () => {
    const response = NextResponse.next();
    updateSession.mockResolvedValue(response);

    const result = await middleware(new NextRequest("https://app.example.com/dashboard"));

    expect(updateSession).toHaveBeenCalledTimes(1);
    expect(result.status).toBe(200);
  });

  it("skips session refresh for api routes and public pricing pages", async () => {
    const apiResponse = await middleware(new NextRequest("https://app.example.com/api/chat"));
    const pricingResponse = await middleware(new NextRequest("https://app.example.com/pricing"));

    expect(apiResponse.status).toBe(200);
    expect(pricingResponse.status).toBe(200);
    expect(updateSession).not.toHaveBeenCalled();
  });

  it("persists referral codes in a cookie", async () => {
    vi.stubEnv("NODE_ENV", "development");

    const response = await middleware(new NextRequest("https://app.example.com/setup?ref=partner-123"));

    const cookieHeader = response.headers.get("set-cookie");
    expect(cookieHeader).toContain("referral_code=partner-123");
    expect(cookieHeader).toContain("HttpOnly");
    expect(cookieHeader).toContain("SameSite=lax");
  });

  it("adds the Supabase origin into the CSP header", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");

    const response = await middleware(new NextRequest("https://app.example.com/dashboard"));

    expect(response.headers.get("Content-Security-Policy")).toContain("https://project.supabase.co");
  });

  it("allows production analytics workers and Google Maps font styles in the CSP header", async () => {
    const response = await middleware(new NextRequest("https://app.example.com/crm/map"));
    const csp = response.headers.get("Content-Security-Policy");

    expect(csp).toContain("script-src 'self' 'unsafe-eval' 'unsafe-inline' blob:");
    expect(csp).toContain("worker-src 'self' blob:");
    expect(csp).toContain("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com");
    expect(csp).toContain("font-src 'self' data: https://fonts.gstatic.com");
  });

  it("fixes the forwarded host for the local proxy case", async () => {
    const request = new NextRequest("https://app.example.com/dashboard", {
      headers: {
        "x-forwarded-host": "localhost:3000",
        origin: "http://127.0.0.1:51280",
      },
    });

    const response = await middleware(request);

    expect(response.headers.get("x-forwarded-host")).toBe("127.0.0.1:51280");
  });

  it("falls back to a passthrough response when updateSession throws", async () => {
    updateSession.mockRejectedValue(new Error("session refresh failed"));

    const response = await middleware(new NextRequest("https://app.example.com/dashboard"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Security-Policy")).toBeNull();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });
});
