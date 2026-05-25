import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import { Footer } from "@/components/layout/footer";

describe("Footer (cpl-11, acq-14)", () => {
  it("renders a link to /cookies so the cookie policy is reachable app-wide", () => {
    render(<Footer />);

    const cookieLink = screen.getByRole("link", { name: /website tech/i });
    expect(cookieLink).toBeTruthy();
    expect(cookieLink.getAttribute("href")).toBe("/cookies");
  });

  it("renders links to Privacy and Terms", () => {
    render(<Footer />);

    expect(screen.getByRole("link", { name: /privacy/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /terms/i })).toBeTruthy();
  });
});
