import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

vi.mock("@/actions/tradie-actions", () => ({
  completeSafetyCheck: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { SafetyModal } from "@/components/tradie/safety-modal";

describe("SafetyModal — accessibility", () => {
  it("open state (no checks): axe-clean", async () => {
    const { baseElement } = render(
      <SafetyModal open onOpenChange={vi.fn()} onConfirm={vi.fn()} dealId="deal_1" />,
    );
    const results = await axe(baseElement);
    expect(results).toHaveNoViolations();
  });
});
