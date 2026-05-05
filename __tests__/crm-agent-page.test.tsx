import { describe, expect, it, vi } from "vitest";

const { redirect } = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("next/navigation", () => ({
  redirect,
}));

import LegacyAgentPage from "@/app/crm/agent/page";

describe("LegacyAgentPage", () => {
  it("redirects old crm agent links into AI Assistant settings", () => {
    expect(() => LegacyAgentPage()).toThrow("REDIRECT:/crm/settings/agent");
    expect(redirect).toHaveBeenCalledWith("/crm/settings/agent");
  });
});
