import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const hoisted = vi.hoisted(() => ({
  getJobPortalStatus: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/actions/job-portal-actions", () => ({
  getJobPortalStatus: hoisted.getJobPortalStatus,
}));

vi.mock("next/navigation", () => ({
  notFound: hoisted.notFound,
}));

describe("JobPortalPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the customer portal shell for a valid token", async () => {
    hoisted.getJobPortalStatus.mockResolvedValue({
      jobStatus: "SCHEDULED",
      scheduledAt: "Monday 6 April, 11:30 AM",
      title: "Hot Water Fix",
      businessName: "Earlymark Plumbing",
      businessPhone: "+61485010634",
      isComplete: false,
      isCancelled: false,
      feedbackUrl: null,
    });

    const { default: JobPortalPage } = await import("@/app/portal/[token]/page");
    const page = await JobPortalPage({ params: Promise.resolve({ token: "token_123" }) });
    render(page);

    expect(screen.getByText("Your appointment")).toBeInTheDocument();
    expect(screen.getByText("Earlymark Plumbing")).toBeInTheDocument();
    expect(screen.getByText("Hot Water Fix")).toBeInTheDocument();
    expect(screen.getByText("Powered by Earlymark")).toBeInTheDocument();
  });

  it("delegates to notFound when the token cannot be resolved", async () => {
    hoisted.getJobPortalStatus.mockResolvedValue(null);

    const { default: JobPortalPage } = await import("@/app/portal/[token]/page");

    await expect(
      JobPortalPage({ params: Promise.resolve({ token: "missing_token" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(hoisted.notFound).toHaveBeenCalled();
  });
});
