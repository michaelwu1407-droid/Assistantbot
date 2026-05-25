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
import LegacyInboxPage from "@/app/inbox/page";
import LegacyHubPage from "@/app/crm/hub/page";
import LegacyDealCardsPage from "@/app/crm/design/deal-cards/page";
import GoogleSigninPage from "@/app/(auth)/login/google/page";
import GoogleSignupPage from "@/app/(auth)/signup/google/page";

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

  it("/inbox redirects to /crm/inbox (crm-29)", () => {
    expect(() => LegacyInboxPage()).toThrow("REDIRECT:/crm/inbox");
  });

  it("/crm/hub redirects to /crm/dashboard (crm-35)", () => {
    expect(() => LegacyHubPage()).toThrow("REDIRECT:/crm/dashboard");
  });

  it("/crm/design/deal-cards redirects to /crm/dashboard (crm-40)", () => {
    expect(() => LegacyDealCardsPage()).toThrow("REDIRECT:/crm/dashboard");
  });

  it("/(auth)/login/google redirects to /auth (auth-06)", () => {
    expect(() => GoogleSigninPage()).toThrow("REDIRECT:/auth");
  });

  it("/(auth)/signup/google redirects to /auth (auth-08)", () => {
    expect(() => GoogleSignupPage()).toThrow("REDIRECT:/auth");
  });
});
