import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { LossReasonModal } from "@/components/crm/loss-reason-modal";

const deal = { id: "deal_1", title: "Kitchen Reno Quote", contactName: "Sam Nguyen" };

describe("LossReasonModal — accessibility", () => {
  it("open state: axe-clean", async () => {
    const { baseElement } = render(
      <LossReasonModal open onOpenChange={vi.fn()} deal={deal} onConfirm={vi.fn()} />,
    );
    const results = await axe(baseElement);
    expect(results).toHaveNoViolations();
  });
});
