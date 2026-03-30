import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirect } = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("next/navigation", () => ({
  redirect,
}));

import DiagnosticsPage from "@/app/admin/diagnostics/page";
import OpsStatusPage from "@/app/admin/ops-status/page";

describe("internal admin route redirects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects /admin/ops-status to the unified ops tab", async () => {
    await expect(OpsStatusPage()).rejects.toThrow("REDIRECT:/admin/customer-usage?tab=ops");
  });

  it("redirects /admin/diagnostics to webhook diagnostics inside the unified ops tab", async () => {
    await expect(DiagnosticsPage()).rejects.toThrow("REDIRECT:/admin/customer-usage?tab=ops#webhooks");
  });
});
