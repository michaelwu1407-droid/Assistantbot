import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  streamText: vi.fn(),
  convertToModelMessages: vi.fn(),
  stepCountIs: vi.fn(),
  createUIMessageStream: vi.fn(),
  createUIMessageStreamResponse: vi.fn(),
  createGoogleGenerativeAI: vi.fn(),
  saveUserMessage: vi.fn(),
  getDeals: vi.fn(),
  getWorkspaceSettingsById: vi.fn(),
  buildJobDraftFromParams: vi.fn(),
  parseJobWithAI: vi.fn(),
  parseMultipleJobsWithAI: vi.fn(),
  extractAllJobsFromParagraph: vi.fn(),
  appendTicketNote: vi.fn(),
  addMem0Memory: vi.fn(),
  buildAgentContext: vi.fn(),
  fetchMemoryContext: vi.fn(),
  buildCrmChatSystemPrompt: vi.fn(),
  normalizeAppAgentMode: vi.fn(),
  getAgentToolsForIntent: vi.fn(),
  preClassify: vi.fn(),
  validatePricingInResponse: vi.fn(),
  instrumentToolsWithLatency: vi.fn((tools: unknown) => tools),
  nowMs: vi.fn(() => 0),
  recordLatencyMetric: vi.fn(),
  rateLimit: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("ai", () => ({
  streamText: hoisted.streamText,
  convertToModelMessages: hoisted.convertToModelMessages,
  stepCountIs: hoisted.stepCountIs,
  createUIMessageStream: hoisted.createUIMessageStream,
  createUIMessageStreamResponse: hoisted.createUIMessageStreamResponse,
}));
vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: hoisted.createGoogleGenerativeAI,
}));
vi.mock("@/actions/chat-actions", () => ({
  saveUserMessage: hoisted.saveUserMessage,
}));
vi.mock("@/actions/deal-actions", () => ({
  getDeals: hoisted.getDeals,
}));
vi.mock("@/actions/settings-actions", () => ({
  getWorkspaceSettingsById: hoisted.getWorkspaceSettingsById,
}));
vi.mock("@/lib/chat-utils", () => ({
  buildJobDraftFromParams: hoisted.buildJobDraftFromParams,
}));
vi.mock("@/lib/ai/job-parser", () => ({
  parseJobWithAI: hoisted.parseJobWithAI,
  parseMultipleJobsWithAI: hoisted.parseMultipleJobsWithAI,
  extractAllJobsFromParagraph: hoisted.extractAllJobsFromParagraph,
}));
vi.mock("@/actions/activity-actions", () => ({
  appendTicketNote: hoisted.appendTicketNote,
}));
vi.mock("@/lib/ai/context", () => ({
  addMem0Memory: hoisted.addMem0Memory,
  buildAgentContext: hoisted.buildAgentContext,
  fetchMemoryContext: hoisted.fetchMemoryContext,
}));
vi.mock("@/lib/ai/prompt-contract", () => ({
  buildCrmChatSystemPrompt: hoisted.buildCrmChatSystemPrompt,
}));
vi.mock("@/lib/agent-mode", () => ({
  normalizeAppAgentMode: hoisted.normalizeAppAgentMode,
}));
vi.mock("@/lib/ai/tools", () => ({
  getAgentToolsForIntent: hoisted.getAgentToolsForIntent,
}));
vi.mock("@/lib/ai/pre-classifier", () => ({
  preClassify: hoisted.preClassify,
}));
vi.mock("@/lib/ai/response-validator", () => ({
  validatePricingInResponse: hoisted.validatePricingInResponse,
}));
vi.mock("@/lib/telemetry/latency", () => ({
  instrumentToolsWithLatency: hoisted.instrumentToolsWithLatency,
  nowMs: hoisted.nowMs,
  recordLatencyMetric: hoisted.recordLatencyMetric,
}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: hoisted.rateLimit,
}));
vi.mock("@/lib/logging", () => ({
  logger: {
    error: hoisted.loggerError,
  },
}));

import { POST } from "@/app/api/chat/route";

describe("POST /api/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    hoisted.rateLimit.mockResolvedValue({ allowed: true, retryAfterMs: 0 });
    hoisted.preClassify.mockReturnValue({ intent: "unknown", contextHints: [] });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects requests without a workspaceId", async () => {
    const response = await POST(
      new Request("https://app.example.com/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [],
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "workspaceId is required" });
  });

  it("rate limits chat requests and returns retry metadata", async () => {
    hoisted.rateLimit.mockResolvedValue({ allowed: false, retryAfterMs: 4500 });

    const response = await POST(
      new Request("https://app.example.com/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId: "ws_1",
          messages: [],
        }),
      }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("5");
    expect(await response.json()).toEqual({
      error: "Too many requests. Please wait a moment.",
    });
  });

  it("fails fast when no Gemini API key is configured", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "");

    const response = await POST(
      new Request("https://app.example.com/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId: "ws_1",
          messages: [],
        }),
      }),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Missing GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY",
    });
  });
});
