import { beforeEach, describe, expect, it, vi } from "vitest";

describe("useShellStore assistant panel persistence", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  it("defaults the assistant panel to closed on first boot", async () => {
    const { useShellStore } = await import("@/lib/store");

    useShellStore.getState()._hydrate();

    expect(useShellStore.getState().assistantPanelExpanded).toBe(false);
  });

  it("persists the user's assistant panel open/closed state", async () => {
    const { useShellStore } = await import("@/lib/store");

    useShellStore.getState().setAssistantPanelExpanded(true);
    expect(localStorage.getItem("pj_assistant_panel_expanded")).toBe("true");

    vi.resetModules();
    const reloaded = await import("@/lib/store");
    reloaded.useShellStore.getState()._hydrate();

    expect(reloaded.useShellStore.getState().assistantPanelExpanded).toBe(true);
  });
});
