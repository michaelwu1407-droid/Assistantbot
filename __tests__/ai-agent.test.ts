import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  generateText: vi.fn(),
  createGoogleGenerativeAI: vi.fn(() => vi.fn(() => "model")),
  db: {
    user: {
      findUnique: vi.fn(),
    },
  },
  buildAgentContext: vi.fn(),
  fetchMemoryContext: vi.fn(),
  getAgentTools: vi.fn(),
  saveUserMessage: vi.fn(),
  instrumentToolsWithLatency: vi.fn((tools) => tools),
  nowMs: vi.fn(),
  recordLatencyMetric: vi.fn(),
}));

vi.mock("ai", () => ({
  generateText: hoisted.generateText,
}));
vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: hoisted.createGoogleGenerativeAI,
}));
vi.mock("@/lib/db", () => ({
  db: hoisted.db,
}));
vi.mock("@/lib/ai/context", () => ({
  buildAgentContext: hoisted.buildAgentContext,
  fetchMemoryContext: hoisted.fetchMemoryContext,
}));
vi.mock("@/lib/ai/tools", () => ({
  getAgentTools: hoisted.getAgentTools,
}));
vi.mock("@/actions/chat-actions", () => ({
  saveUserMessage: hoisted.saveUserMessage,
}));
vi.mock("@/lib/telemetry/latency", () => ({
  instrumentToolsWithLatency: hoisted.instrumentToolsWithLatency,
  nowMs: hoisted.nowMs,
  recordLatencyMetric: hoisted.recordLatencyMetric,
}));

describe("processAgentCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    hoisted.db.user.findUnique.mockResolvedValue({ workspaceId: "ws_1" });
    hoisted.buildAgentContext.mockResolvedValue({
      settings: {},
      userRole: "OWNER",
      knowledgeBaseStr: "",
      agentModeStr: "",
      workingHoursStr: "",
      agentScriptStr: "",
      allowedTimesStr: "",
      preferencesStr: "",
      pricingRulesStr: "",
      bouncerStr: "",
      attachmentsStr: "",
    });
    hoisted.fetchMemoryContext.mockResolvedValue("");
    hoisted.getAgentTools.mockReturnValue({});
    hoisted.saveUserMessage.mockResolvedValue({});
    hoisted.nowMs.mockReturnValueOnce(0).mockReturnValueOnce(10).mockReturnValueOnce(20).mockReturnValueOnce(30);
  });

  it("returns a non-empty fallback when the model reply text is blank", async () => {
    hoisted.generateText.mockResolvedValue({ text: "   " });
    const { processAgentCommand } = await import("@/lib/services/ai-agent");

    const result = await processAgentCommand("user_1", "show me today's jobs");

    expect(result).toBe("I processed that in Earlymark, but I don't have a text summary to send back yet.");
  });
});
