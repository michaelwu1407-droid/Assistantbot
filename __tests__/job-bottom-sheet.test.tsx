import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

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

  it("shows the actual scheduled time in the collapsed header instead of a hard-coded placeholder", () => {
    const setIsOpen = vi.fn();
    const scheduledAt = new Date("2026-04-08T09:30:00+10:00");

    render(
      <JobBottomSheet
        job={{
          id: "deal_3",
          title: "Blocked Drain",
          clientName: "Alex Harper",
          address: "1 Test St, Sydney",
          status: "SCHEDULED",
          value: 320,
          scheduledAt,
          description: "Drain blockage",
          company: "Harper Plumbing",
          contactPhone: "0400000000",
        }}
        isOpen={false}
        setIsOpen={setIsOpen}
        onAddVariation={vi.fn()}
        safetyCheckCompleted={false}
      />,
    );

    expect(screen.getByText(/9:30 AM • Harper Plumbing/i)).toBeInTheDocument();
  });

  it("routes missing phone quick actions back into CRM instead of dead-ending", () => {
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

    expect(screen.getByRole("link", { name: /add phone/i })).toHaveAttribute("href", "/crm/deals/deal_2");
    expect(screen.getByRole("link", { name: /open crm/i })).toHaveAttribute("href", "/crm/deals/deal_2");
  });

  it("replaces fake capture actions with honest guidance into the full CRM completion flow", async () => {
    const user = userEvent.setup();

    render(
      <JobBottomSheet
        job={{
          id: "deal_4",
          title: "Leak Investigation",
          clientName: "Jamie Rivers",
          address: "4 Test St, Sydney",
          status: "SCHEDULED",
          value: 210,
          scheduledAt: new Date(),
          description: "Find leak source",
          contactPhone: "0400000000",
        }}
        isOpen
        setIsOpen={vi.fn()}
        onAddVariation={vi.fn()}
        safetyCheckCompleted={false}
      />,
    );

    await user.click(screen.getByRole("button", { name: /billing/i }));

    expect(screen.getByText(/video explanations and customer signatures are captured from the full completion flow/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open full crm job/i })).toHaveAttribute("href", "/crm/deals/deal_4");
    expect(screen.queryByRole("button", { name: /add video explanation/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/tap to sign on glass/i)).not.toBeInTheDocument();
  });

  it("replaces the fake photo tile with an honest link into full job mode", async () => {
    const user = userEvent.setup();

    render(
      <JobBottomSheet
        job={{
          id: "deal_5",
          title: "Photo Follow-up",
          clientName: "Morgan Reed",
          address: "5 Test St, Sydney",
          status: "SCHEDULED",
          value: 260,
          scheduledAt: new Date(),
          description: "Take site photos",
          contactPhone: "0400000000",
        }}
        isOpen
        setIsOpen={vi.fn()}
        onAddVariation={vi.fn()}
        safetyCheckCompleted={false}
      />,
    );

    await user.click(screen.getByRole("button", { name: /photos/i }));

    expect(screen.getByText(/capture photos from the full job mode so they save against the right job/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open full job mode/i })).toHaveAttribute("href", "/tradie/jobs/deal_5");
    expect(screen.queryByText(/add photo/i)).not.toBeInTheDocument();
  });
});
