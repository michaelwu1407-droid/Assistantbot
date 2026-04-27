import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const hoisted = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  isProductionDestructiveOperationBlocked: vi.fn(),
  deleteUser: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: hoisted.createAdminClient,
}));

vi.mock("@/lib/production-safety", () => ({
  isProductionDestructiveOperationBlocked: hoisted.isProductionDestructiveOperationBlocked,
}));

import { POST } from "@/app/api/delete-user/route";

describe("POST /api/delete-user", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.isProductionDestructiveOperationBlocked.mockReturnValue(false);
    hoisted.deleteUser.mockResolvedValue({ error: null });
    hoisted.createAdminClient.mockReturnValue({
      auth: {
        admin: {
          deleteUser: hoisted.deleteUser,
        },
      },
    });
  });

  it("blocks delete-user when production destructive actions are disabled", async () => {
    hoisted.isProductionDestructiveOperationBlocked.mockReturnValue(true);

    const response = await POST(
      new NextRequest("https://earlymark.ai/api/delete-user", {
        method: "POST",
        body: JSON.stringify({ userId: "user_1" }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Delete-user API is blocked in production",
    });
    expect(hoisted.createAdminClient).not.toHaveBeenCalled();
  });

  it("requires a user id", async () => {
    const response = await POST(
      new NextRequest("https://earlymark.ai/api/delete-user", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "User ID is required" });
  });

  it("deletes the Supabase auth user when allowed", async () => {
    const response = await POST(
      new NextRequest("https://earlymark.ai/api/delete-user", {
        method: "POST",
        body: JSON.stringify({ userId: "user_1" }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(hoisted.deleteUser).toHaveBeenCalledWith("user_1");
  });

  it("returns 500 when Supabase deletion fails", async () => {
    hoisted.deleteUser.mockResolvedValue({ error: { message: "delete failed" } });

    const response = await POST(
      new NextRequest("https://earlymark.ai/api/delete-user", {
        method: "POST",
        body: JSON.stringify({ userId: "user_1" }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Failed to delete user from authentication system",
    });
  });
});
