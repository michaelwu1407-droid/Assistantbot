import { describe, expect, it, vi, beforeEach } from "vitest";

const hoisted = vi.hoisted(() => ({
  db: {
    user: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({
  db: hoisted.db,
}));

describe("findUserByPhone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefers provisioned twilio-backed workspaces when multiple users share a phone", async () => {
    hoisted.db.user.findMany.mockResolvedValue([
      {
        id: "user_old",
        name: "Old",
        phone: "+61434955958",
        workspaceId: "ws_old",
        workspace: {
          ownerId: "user_old",
          twilioPhoneNumber: null,
          settings: {
            onboardingProvisioningStatus: "not_requested",
          },
        },
      },
      {
        id: "user_live",
        name: "Live",
        phone: "+61434955958",
        workspaceId: "ws_live",
        workspace: {
          ownerId: "user_live",
          twilioPhoneNumber: "+61468167497",
          settings: {
            onboardingProvisioningStatus: "provisioned",
          },
        },
      },
    ]);

    const { findUserByPhone } = await import("@/lib/workspace-routing");
    const result = await findUserByPhone("+61434955958");

    expect(result).toEqual({
      id: "user_live",
      name: "Live",
      phone: "+61434955958",
      workspaceId: "ws_live",
    });
  });

  it("returns the only match when the phone is unambiguous", async () => {
    hoisted.db.user.findMany.mockResolvedValue([
      {
        id: "user_1",
        name: "Miguel",
        phone: "+61434955958",
        workspaceId: "ws_1",
        workspace: {
          ownerId: "user_1",
          twilioPhoneNumber: "+61468167497",
          settings: {
            onboardingProvisioningStatus: "provisioned",
          },
        },
      },
    ]);

    const { findUserByPhone } = await import("@/lib/workspace-routing");
    const result = await findUserByPhone("+61434955958");

    expect(result).toEqual({
      id: "user_1",
      name: "Miguel",
      phone: "+61434955958",
      workspaceId: "ws_1",
    });
  });
});
