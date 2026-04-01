import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const { generateObject, contextModel, logicModel } = vi.hoisted(() => ({
  generateObject: vi.fn(),
  contextModel: { id: "context-model" },
  logicModel: { id: "logic-model" },
}));

vi.mock("ai", () => ({
  generateObject,
}));

vi.mock("@/lib/ai-models", () => ({
  contextModel,
  logicModel,
}));

describe("lib/ai-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateObject.mockResolvedValue({ object: { ok: true } });
  });

  it("routes context tasks to the context model without injecting a system prompt", async () => {
    const { runDashboardTask } = await import("@/lib/ai-service");
    const schema = z.object({ ok: z.boolean() });

    await runDashboardTask({
      tier: "context",
      prompt: "Summarise this transcript",
      schema,
    });

    expect(generateObject).toHaveBeenCalledWith({
      model: contextModel,
      schema,
      prompt: "Summarise this transcript",
    });
  });

  it("prepends the json-only instruction for logic tasks", async () => {
    const { runDashboardTask } = await import("@/lib/ai-service");
    const schema = z.object({ ok: z.boolean() });

    await runDashboardTask({
      tier: "logic",
      prompt: "Format this CRM payload",
      schema,
      system: "Use Australian date formatting.",
    });

    expect(generateObject).toHaveBeenCalledWith({
      model: logicModel,
      schema,
      prompt: "Format this CRM payload",
      system:
        "You are a JSON-only API. Do not explain your reasoning. Output ONLY valid JSON.\n\nUse Australian date formatting.",
    });
  });
});
