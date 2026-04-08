import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, authError, cookiesMock, headersMock, dbUserFindUnique } = vi.hoisted(() => ({
  createClient: vi.fn(),
  authError: vi.fn(),
  cookiesMock: vi.fn(),
  headersMock: vi.fn(),
  dbUserFindUnique: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient,
}));

vi.mock("@/lib/logging", () => ({
  logger: {
    authError,
  },
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
  headers: headersMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: dbUserFindUnique,
    },
  },
}));

describe("lib/auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    cookiesMock.mockResolvedValue({ get: vi.fn(() => undefined) });
    headersMock.mockResolvedValue({ get: vi.fn(() => null) });
    dbUserFindUnique.mockResolvedValue(null);
  });

  async function loadModule() {
    vi.resetModules();
    return import("@/lib/auth");
  }

  it("returns null when Supabase auth env is missing", async () => {
    const { getAuthUserId } = await loadModule();

    await expect(getAuthUserId()).resolves.toBeNull();
    expect(createClient).not.toHaveBeenCalled();
  });

  it("returns the user id from the current session", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "user_123",
              email: "owner@example.com",
              user_metadata: {},
            },
          },
          error: null,
        }),
      },
    });

    const { getAuthUserId } = await loadModule();

    await expect(getAuthUserId()).resolves.toBe("user_123");
  });

  it("accepts a cron-authenticated internal probe user override", async () => {
    vi.stubEnv("CRON_SECRET", "probe-secret");
    headersMock.mockResolvedValue({
      get: vi.fn((key: string) => {
        if (key === "authorization") return "Bearer probe-secret";
        if (key === "x-user-id") return "user_probe";
        return null;
      }),
    });
    dbUserFindUnique.mockResolvedValue({
      id: "user_probe",
      name: "Probe Owner",
      email: "probe@example.com",
      bio: "Ops",
    });

    const { getAuthUserId, getAuthUser } = await loadModule();

    await expect(getAuthUserId()).resolves.toBe("user_probe");
    await expect(getAuthUser()).resolves.toEqual({
      id: "user_probe",
      name: "Probe Owner",
      email: "probe@example.com",
      bio: "Ops",
    });
  });

  it("builds a display name from Supabase metadata", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "user_456",
              email: "owner@example.com",
              user_metadata: {
                given_name: "Mick",
                family_name: "Wu",
                avatar_url: "https://example.com/avatar.png",
                bio: "Founder",
              },
            },
          },
          error: null,
        }),
      },
    });

    const { getAuthUser } = await loadModule();

    await expect(getAuthUser()).resolves.toEqual({
      id: "user_456",
      name: "Mick Wu",
      email: "owner@example.com",
      bio: "Founder",
      image: "https://example.com/avatar.png",
    });
  });

  it("logs and returns null when the workspace id is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "user_789",
              email: "owner@example.com",
              user_metadata: {},
            },
          },
          error: null,
        }),
      },
    });

    const { getWorkspaceId } = await loadModule();

    await expect(getWorkspaceId()).resolves.toBeNull();
    expect(authError).toHaveBeenCalledWith("No workspace ID found for user", { userId: "user_789" });
  });

  it("suppresses expected server bootstrap errors", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    createClient.mockRejectedValue(new Error("Supabase server configuration is incomplete"));

    const { getAuthUser } = await loadModule();

    await expect(getAuthUser()).resolves.toBeNull();
    expect(authError).not.toHaveBeenCalled();
  });

  it("logs unexpected auth errors and returns null", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    createClient.mockRejectedValue(new Error("boom"));

    const { getAuthUserId } = await loadModule();

    await expect(getAuthUserId()).resolves.toBeNull();
    expect(authError).toHaveBeenCalledWith(
      "Unexpected error in getAuthUserId",
      { error: "boom" },
      expect.any(Error),
    );
  });
});
