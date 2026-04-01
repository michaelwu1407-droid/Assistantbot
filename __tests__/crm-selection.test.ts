import { describe, expect, it, vi } from "vitest";
import { CRM_SELECTION_EVENT, publishCrmSelection } from "@/lib/crm-selection";

describe("lib/crm-selection", () => {
  it("publishes the current crm selection as a window event", () => {
    const listener = vi.fn();
    window.addEventListener(CRM_SELECTION_EVENT, listener);

    publishCrmSelection([{ id: "deal_1", title: "Kitchen fitout" }]);

    expect(listener).toHaveBeenCalledTimes(1);
    const event = listener.mock.calls[0]?.[0] as CustomEvent;
    expect(event.detail).toEqual([{ id: "deal_1", title: "Kitchen fitout" }]);
    window.removeEventListener(CRM_SELECTION_EVENT, listener);
  });
});
