import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

vi.mock("@/components/crm/activity-feed", () => ({
  ActivityFeed: () => <div data-testid="activity-feed">Activity feed stub</div>,
}));

import { ActivityModal } from "@/components/modals/activity-modal";

describe("ActivityModal — accessibility", () => {
  it("open state: axe-clean", async () => {
    const { baseElement } = render(
      <ActivityModal isOpen onClose={vi.fn()} workspaceId="ws_1" />,
    );
    const results = await axe(baseElement);
    expect(results).toHaveNoViolations();
  });
});
