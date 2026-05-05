import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { getJobDetails, notFound } = vi.hoisted(() => ({
  getJobDetails: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

vi.mock("@/actions/tradie-actions", () => ({
  getJobDetails,
}));

vi.mock("next/navigation", () => ({
  notFound,
}));

vi.mock("@/components/tradie/job-detail-view", () => ({
  JobDetailView: ({ job }: { job: { title: string } }) => <div>Job detail for {job.title}</div>,
}));

import JobDetailPage from "@/app/(dashboard)/tradie/jobs/[id]/page";

describe("Tradie job page", () => {
  it("uses the shared scoped job details loader", async () => {
    getJobDetails.mockResolvedValue({
      id: "deal_1",
      title: "Blocked drain",
      client: { name: "Alex", phone: null, email: null, address: null },
      status: "SCHEDULED",
      value: 120,
      description: "Drain issue",
      safetyCheckCompleted: false,
      activities: [],
      invoices: [],
      photos: [],
    });

    render(await JobDetailPage({ params: Promise.resolve({ id: "deal_1" }) }));

    expect(getJobDetails).toHaveBeenCalledWith("deal_1");
    expect(screen.getByText("Job detail for Blocked drain")).toBeInTheDocument();
  });

  it("uses notFound when the scoped job cannot be loaded", async () => {
    getJobDetails.mockResolvedValue(null);

    await expect(JobDetailPage({ params: Promise.resolve({ id: "deal_404" }) })).rejects.toThrow("NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });
});
