import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirect } = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("next/navigation", () => ({ redirect }));

import CrmIndexPage from "@/app/crm/page";
import ContactPage from "@/app/contacts/[id]/page";
import LoginPage from "@/app/(auth)/login/[[...rest]]/page";
import SignUpPage from "@/app/(auth)/signup/[[...rest]]/page";

describe("legacy route redirects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("/crm root redirects to /crm/dashboard (crm-01)", () => {
    expect(() => CrmIndexPage()).toThrow("REDIRECT:/crm/dashboard");
  });

  it("/contacts/[id] redirects to /crm/contacts/[id] (crm-12)", async () => {
    await expect(
      ContactPage({ params: Promise.resolve({ id: "contact_abc" }) }),
    ).rejects.toThrow("REDIRECT:/crm/contacts/contact_abc");
  });

  it("/(auth)/login redirects to /auth (auth-meta)", () => {
    expect(() => LoginPage()).toThrow("REDIRECT:/auth");
  });

  it("/(auth)/signup redirects to /auth (auth-meta)", () => {
    expect(() => SignUpPage()).toThrow("REDIRECT:/auth");
  });
});
