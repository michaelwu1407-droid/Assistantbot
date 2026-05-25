import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import NotFound from "@/app/not-found";

describe("Custom 404 page (acq-16)", () => {
  it("renders friendly heading and a link back to the homepage", () => {
    render(<NotFound />);

    expect(screen.getByText("Page Not Found")).toBeTruthy();
    expect(screen.getByText(/page you are looking for doesn/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: /return to dashboard/i })).toHaveAttribute("href", "/crm/dashboard");
  });
});
