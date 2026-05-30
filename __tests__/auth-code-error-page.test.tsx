import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const signOutMock = vi.fn();
const pushMock = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { signOut: signOutMock },
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

import AuthCodeErrorPage from "@/app/auth/auth-code-error/page";

describe("AuthCodeErrorPage (auth-04)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signOutMock.mockResolvedValue({});
  });

  it("renders the generic error copy when no error_code is present", () => {
    render(<AuthCodeErrorPage />);
    expect(screen.getByText(/authentication error/i)).toBeTruthy();
    expect(screen.getByText(/there was an issue/i)).toBeTruthy();
  });

  it("calls signOut then navigates to /auth when Try Again is clicked (auth-04)", async () => {
    render(<AuthCodeErrorPage />);

    fireEvent.click(screen.getByText(/try again/i));

    await waitFor(() => {
      expect(signOutMock).toHaveBeenCalledTimes(1);
      expect(pushMock).toHaveBeenCalledWith("/auth");
    });
  });

  it("still navigates to /auth even when signOut throws (stale session)", async () => {
    signOutMock.mockRejectedValue(new Error("session already gone"));

    render(<AuthCodeErrorPage />);
    fireEvent.click(screen.getByText(/try again/i));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/auth");
    });
  });
});
