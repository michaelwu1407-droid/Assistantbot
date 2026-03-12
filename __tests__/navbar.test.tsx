import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({
    unoptimized: _unoptimized,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) => (
    <img {...props} alt={props.alt || ""} />
  ),
}));

import { Navbar } from "@/components/layout/navbar";

describe("Navbar", () => {
  it("keeps the auth CTA and contact CTA on the expected routes", () => {
    render(<Navbar />);

    const authLinks = screen.getAllByRole("link", { name: /Log in \/ Get started/i });
    const contactLinks = screen.getAllByRole("link", { name: /Contact us/i });

    expect(authLinks.some((link) => link.getAttribute("href") === "/auth")).toBe(true);
    expect(contactLinks.some((link) => link.getAttribute("href") === "/contact")).toBe(true);
  });
});
