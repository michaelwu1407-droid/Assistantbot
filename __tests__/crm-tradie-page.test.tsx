import { describe, expect, it, vi } from "vitest";

const { redirect } = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("next/navigation", () => ({
  redirect,
}));

import LegacyTradiePage from "@/app/crm/tradie/page";

describe("LegacyTradiePage", () => {
  it("redirects stale crm tradie links into the tradie experience", () => {
    expect(() => LegacyTradiePage()).toThrow("REDIRECT:/tradie");
    expect(redirect).toHaveBeenCalledWith("/tradie");
  });
});
