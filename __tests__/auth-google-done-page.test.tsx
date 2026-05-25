import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { signInWithIdToken, historyReplace } = vi.hoisted(() => ({
  signInWithIdToken: vi.fn(),
  historyReplace: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { signInWithIdToken },
  }),
}));

Object.defineProperty(window, "location", {
  value: { href: "", hash: "", pathname: "/auth/google-done", search: "" },
  writable: true,
});
Object.defineProperty(window, "history", {
  value: { replaceState: historyReplace },
  writable: true,
});

import GoogleDonePage from "@/app/auth/google-done/page";

describe("GoogleDonePage (auth-03)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.location.href = "";
    window.location.hash = "";
  });

  it("redirects to /auth?error=missing_token when hash contains no id_token", async () => {
    window.location.hash = "#access_token=tok123";

    render(<GoogleDonePage />);

    await waitFor(() => {
      expect(window.location.href).toBe("/auth?error=missing_token");
    });
  });

  it("calls signInWithIdToken with the hash tokens and redirects to /auth/next on success", async () => {
    window.location.hash = "#id_token=id-tok&access_token=acc-tok";
    signInWithIdToken.mockResolvedValue({ error: null });

    render(<GoogleDonePage />);

    await waitFor(() => {
      expect(signInWithIdToken).toHaveBeenCalledWith({
        provider: "google",
        token: "id-tok",
        access_token: "acc-tok",
      });
      expect(window.location.href).toBe("/auth/next");
    });
  });

  it("redirects to /auth?error=... when signInWithIdToken returns an error", async () => {
    window.location.hash = "#id_token=id-tok";
    signInWithIdToken.mockResolvedValue({ error: { message: "invalid token" } });

    render(<GoogleDonePage />);

    await waitFor(() => {
      expect(window.location.href).toContain("/auth?error=");
    });
  });
});
