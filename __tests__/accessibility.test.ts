import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  announceToScreenReader,
  checkContrast,
  createSkipLink,
  getAriaLabel,
  handleKeyboardNavigation,
  prefersHighContrast,
  prefersReducedMotion,
  trapFocus,
} from "@/lib/accessibility";

describe("lib/accessibility", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("announces messages and removes the node after a timeout", () => {
    announceToScreenReader("Saved");

    expect(document.body.textContent).toContain("Saved");
    vi.advanceTimersByTime(1000);
    expect(document.body.textContent).not.toContain("Saved");
  });

  it("traps focus between the first and last focusable elements", () => {
    const container = document.createElement("div");
    const first = document.createElement("button");
    const middle = document.createElement("input");
    const last = document.createElement("button");
    container.append(first, middle, last);
    document.body.appendChild(container);

    const cleanup = trapFocus(container);
    last.focus();
    const event = new KeyboardEvent("keydown", { key: "Tab" });
    Object.defineProperty(event, "preventDefault", { value: vi.fn() });
    container.dispatchEvent(event);

    expect(document.activeElement).toBe(first);
    cleanup();
  });

  it("creates a skip link at the top of the body", () => {
    createSkipLink();

    const firstChild = document.body.firstChild as HTMLAnchorElement | null;
    expect(firstChild?.tagName).toBe("A");
    expect(firstChild?.href).toContain("#main-content");
  });

  it("calculates higher contrast for black on white than grey on white", () => {
    expect(checkContrast("#000000", "#ffffff")).toBeGreaterThan(checkContrast("#777777", "#ffffff"));
  });

  it("routes keyboard events to the matching callbacks", () => {
    const onArrowDown = vi.fn();
    const onEnter = vi.fn();
    const arrowEvent = new KeyboardEvent("keydown", { key: "ArrowDown" });
    Object.defineProperty(arrowEvent, "preventDefault", { value: vi.fn() });

    handleKeyboardNavigation(arrowEvent, { onArrowDown });
    handleKeyboardNavigation(new KeyboardEvent("keydown", { key: "Enter" }), { onEnter });

    expect(onArrowDown).toHaveBeenCalledTimes(1);
    expect(onEnter).toHaveBeenCalledTimes(1);
    expect(arrowEvent.preventDefault).toHaveBeenCalledTimes(1);
  });

  it("resolves aria labels from attributes or text", () => {
    const labelled = document.createElement("button");
    labelled.setAttribute("aria-label", "Close dialog");
    const plain = document.createElement("button");
    plain.textContent = "Save";

    expect(getAriaLabel(labelled)).toBe("Close dialog");
    expect(getAriaLabel(plain)).toBe("Save");
  });

  it("detects reduced motion and high contrast preferences", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: query.includes("reduced-motion") || query.includes("prefers-contrast"),
      })),
    );

    expect(prefersReducedMotion()).toBe(true);
    expect(prefersHighContrast()).toBe(true);
  });
});
