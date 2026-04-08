import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      whileHover,
      whileTap,
      drag,
      dragConstraints,
      dragElastic,
      initial,
      animate,
      exit,
      transition,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => <div {...props}>{children}</div>,
    button: ({
      children,
      whileHover,
      whileTap,
      transition,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & Record<string, unknown>) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/tradie/material-picker", () => ({
  MaterialPicker: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
}));

vi.mock("@/components/tradie/job-status-bar", () => ({
  JobStatusBar: () => <div>Job Status Bar</div>,
}));

import { JobBottomSheet } from "@/components/tradie/job-bottom-sheet";

describe("JobBottomSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("open", vi.fn());
  });

  it("uses the Parts quick action as a real shortcut into the billing tab", async () => {
    const user = userEvent.setup();
    const setIsOpen = vi.fn();

    render(
      <JobBottomSheet
        job={{
          id: "deal_1",
          title: "Blocked Drain",
          clientName: "Alex Harper",
          address: "1 Test St, Sydney",
          status: "SCHEDULED",
          value: 320,
          scheduledAt: new Date(),
          description: "Drain blockage",
          contactPhone: "0400000000",
        }}
        isOpen
        setIsOpen={setIsOpen}
        onAddVariation={vi.fn()}
        safetyCheckCompleted={false}
      />,
    );

    await user.click(screen.getByRole("button", { name: /parts/i }));

    expect(screen.getByText(/Current Total/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /search material database/i })).toBeInTheDocument();
  });

  it("disables call and text quick actions when the job has no customer phone", () => {
    const setIsOpen = vi.fn();

    render(
      <JobBottomSheet
        job={{
          id: "deal_2",
          title: "Hot Water Service",
          clientName: "Taylor Smith",
          address: "2 Test St, Sydney",
          status: "SCHEDULED",
          value: 480,
          scheduledAt: new Date(),
          description: "Hot water fault",
        }}
        isOpen
        setIsOpen={setIsOpen}
        onAddVariation={vi.fn()}
        safetyCheckCompleted={false}
      />,
    );

    expect(screen.getAllByRole("button", { name: /no phone/i })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /no phone/i })[0]).toBeDisabled();
    expect(screen.getAllByRole("button", { name: /no phone/i })[1]).toBeDisabled();
  });
});
