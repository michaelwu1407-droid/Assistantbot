import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  streamText: vi.fn(),
  convertToModelMessages: vi.fn(),
  stepCountIs: vi.fn(),
  createUIMessageStream: vi.fn(),
  createUIMessageStreamResponse: vi.fn(),
  createGoogleGenerativeAI: vi.fn(),
  saveUserMessage: vi.fn(),
  runAddContactNote: vi.fn(),
  runAddDealNote: vi.fn(),
  runAssignTeamMember: vi.fn(),
  runCreateContact: vi.fn(),
  runCreateDraftInvoice: vi.fn(),
  runCreateJobNatural: vi.fn(),
  runCreateTask: vi.fn(),
  runGetAttentionRequired: vi.fn(),
  runGetConversationHistory: vi.fn(),
  runGetDealContext: vi.fn(),
  runGetInvoiceStatusAction: vi.fn(),
  runListRecentCrmChanges: vi.fn(),
  runMoveDeal: vi.fn(),
  runRestoreDeal: vi.fn(),
  runSearchContacts: vi.fn(),
  runUndoLastAction: vi.fn(),
  runUnassignDeal: vi.fn(),
  runUpdateContactFields: vi.fn(),
  runUpdateDealFields: vi.fn(),
  runUpdateInvoiceAmount: vi.fn(),
  getDeals: vi.fn(),
  getWorkspaceSettingsById: vi.fn(),
  runGetAvailability: vi.fn(),
  runGetClientContext: vi.fn(),
  runGetTodaySummary: vi.fn(),
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
  runAddContactNote: hoisted.runAddContactNote,
  runAddDealNote: hoisted.runAddDealNote,
  runAssignTeamMember: hoisted.runAssignTeamMember,
  runCreateContact: hoisted.runCreateContact,
  runCreateDraftInvoice: hoisted.runCreateDraftInvoice,
  runCreateJobNatural: hoisted.runCreateJobNatural,
  runCreateTask: hoisted.runCreateTask,
  runGetAttentionRequired: hoisted.runGetAttentionRequired,
  runGetConversationHistory: hoisted.runGetConversationHistory,
  runGetDealContext: hoisted.runGetDealContext,
  runGetInvoiceStatusAction: hoisted.runGetInvoiceStatusAction,
  runListRecentCrmChanges: hoisted.runListRecentCrmChanges,
  runMoveDeal: hoisted.runMoveDeal,
  runRestoreDeal: hoisted.runRestoreDeal,
  runSearchContacts: hoisted.runSearchContacts,
  runUndoLastAction: hoisted.runUndoLastAction,
  runUnassignDeal: hoisted.runUnassignDeal,
  runUpdateContactFields: hoisted.runUpdateContactFields,
  runUpdateDealFields: hoisted.runUpdateDealFields,
  runUpdateInvoiceAmount: hoisted.runUpdateInvoiceAmount,
}));
vi.mock("@/actions/agent-tools", () => ({
  runGetAvailability: hoisted.runGetAvailability,
  runGetClientContext: hoisted.runGetClientContext,
  runGetTodaySummary: hoisted.runGetTodaySummary,
}));
vi.mock("@/actions/deal-actions", () => ({
  getDeals: hoisted.getDeals,
}));
vi.mock("@/actions/settings-actions", () => ({
  getWorkspaceSettingsById: hoisted.getWorkspaceSettingsById,
}));
vi.mock("@/lib/chat-utils", () => ({
  buildJobDraftFromParams: hoisted.buildJobDraftFromParams,
  resolveSchedule: vi.fn((value: string) => ({ iso: new Date("2026-04-05T09:00:00.000Z").toISOString(), display: value })),
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

import { POST, shouldAttemptStructuredJobExtraction } from "@/app/api/chat/route";

describe("POST /api/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    hoisted.rateLimit.mockResolvedValue({ allowed: true, retryAfterMs: 0 });
    hoisted.preClassify.mockReturnValue({
      intent: "general",
      confidence: 0.3,
      contextHints: [],
      suggestedTools: [],
      requiresCalculator: false,
    });
    hoisted.saveUserMessage.mockResolvedValue(undefined);
    hoisted.createUIMessageStream.mockImplementation(({ execute }: { execute: ({ writer }: { writer: { write: (event: { type?: string; delta?: string }) => void } }) => void }) => {
      const chunks: string[] = [];
      execute({
        writer: {
          write: (event) => {
            if (event.type === "text-delta" && typeof event.delta === "string") {
              chunks.push(event.delta);
            }
          },
        },
      });
      return { text: chunks.join("") };
    });
    hoisted.createUIMessageStreamResponse.mockImplementation(({ stream }: { stream: { text?: string } }) =>
      new Response(JSON.stringify({ text: stream.text ?? "" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
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

  it("does not treat CRM update requests as structured job-creation drafts", () => {
    expect(
      shouldAttemptStructuredJobExtraction("Move Hot Water Fix to scheduled", {
        intent: "crm_action",
        confidence: 0.95,
        contextHints: [],
        suggestedTools: ["moveDeal"],
        requiresCalculator: false,
      }),
    ).toBe(false);

    expect(
      shouldAttemptStructuredJobExtraction("Create a new blocked drain job for Alex tomorrow at 2pm for $420", {
        intent: "crm_action",
        confidence: 0.95,
        contextHints: [],
        suggestedTools: ["createDeal"],
        requiresCalculator: false,
      }),
    ).toBe(true);
  });

  it("executes direct contact creation without calling the model", async () => {
    hoisted.runCreateContact.mockResolvedValue('Successfully added contact "Alex Harper".');

    const response = await POST(
      new Request("https://app.example.com/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId: "ws_1",
          messages: [{ role: "user", parts: [{ type: "text", text: "Create a new contact called Alex Harper with phone 0400000101 and email alex@example.com." }] }],
        }),
      }),
    );
    const payload = await response.json();

    expect(hoisted.runCreateContact).toHaveBeenCalledWith("ws_1", {
      name: "Alex Harper",
      phone: "0400000101",
      email: "alex@example.com",
    });
    expect(hoisted.streamText).not.toHaveBeenCalled();
    expect(payload).toEqual({ text: 'Successfully added contact "Alex Harper".' });
  });

  it("executes direct job creation without showing a draft loop", async () => {
    hoisted.runCreateJobNatural.mockResolvedValue({
      success: true,
      message: "Job created: Blocked Drain for Alex Harper, $420.",
      dealId: "deal_1",
    });
    hoisted.getWorkspaceSettingsById.mockResolvedValue({ agentMode: "AUTO" });
    hoisted.normalizeAppAgentMode.mockReturnValue("AUTO");

    const response = await POST(
      new Request("https://app.example.com/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId: "ws_1",
          messages: [{ role: "user", parts: [{ type: "text", text: "Create a new job called Blocked Drain for Alex Harper at 12 Test Street Sydney with a quoted value of $420." }] }],
        }),
      }),
    );

    expect(hoisted.runCreateJobNatural).toHaveBeenCalledWith("ws_1", {
      workDescription: "Blocked Drain",
      clientName: "Alex Harper",
      address: "12 Test Street Sydney",
      price: 420,
    });
    expect(hoisted.streamText).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ text: "Job created: Blocked Drain for Alex Harper, $420." });
  });

  it("executes direct deal note mutations before the LLM", async () => {
    hoisted.runAddDealNote.mockResolvedValue({
      success: true,
      message: 'Added a note to "Blocked Drain".',
      dealId: "deal_1",
    });

    const response = await POST(
      new Request("https://app.example.com/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId: "ws_1",
          messages: [{ role: "user", parts: [{ type: "text", text: "Add a note to Blocked Drain saying customer requested a 30 minute heads-up before arrival." }] }],
        }),
      }),
    );

    expect(hoisted.runAddDealNote).toHaveBeenCalledWith("ws_1", {
      dealTitle: "Blocked Drain",
      note: "customer requested a 30 minute heads-up before arrival",
    });
    expect(hoisted.runAddContactNote).not.toHaveBeenCalled();
    expect(hoisted.streamText).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ text: 'Added a note to "Blocked Drain".' });
  });

  it("executes direct contact context lookups before the LLM", async () => {
    hoisted.runGetClientContext.mockResolvedValue({
      client: {
        id: "contact_1",
        name: "Alex Harper",
        email: "alex@example.com",
        phone: "0400000101",
        company: null,
        address: "12 Test Street Sydney",
      },
      recentNotes: [],
      recentMessages: [],
      recentJobs: [],
    });

    const response = await POST(
      new Request("https://app.example.com/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId: "ws_1",
          messages: [{ role: "user", parts: [{ type: "text", text: "What phone number and email do you have on file for Alex Harper?" }] }],
        }),
      }),
    );

    expect(hoisted.runGetClientContext).toHaveBeenCalledWith("ws_1", { clientName: "Alex Harper" });
    expect(hoisted.streamText).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      text: "Alex Harper\nPhone: 0400000101\nEmail: alex@example.com\nAddress: 12 Test Street Sydney",
    });
  });

  it("handles alternate deal note phrasing without calling the model", async () => {
    hoisted.runAddDealNote.mockResolvedValue({
      success: true,
      message: 'Added a note to "Blocked Drain".',
      dealId: "deal_1",
    });

    const response = await POST(
      new Request("https://app.example.com/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId: "ws_1",
          messages: [{ role: "user", parts: [{ type: "text", text: "Create an internal note on Blocked Drain saying review this at evening briefing." }] }],
        }),
      }),
    );

    expect(hoisted.runAddDealNote).toHaveBeenCalledWith("ws_1", {
      dealTitle: "Blocked Drain",
      note: "review this at evening briefing",
    });
    expect(hoisted.streamText).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ text: 'Added a note to "Blocked Drain".' });
  });

  it("answers bouncer policy prompts directly", async () => {
    const response = await POST(
      new Request("https://app.example.com/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId: "ws_1",
          messages: [{ role: "user", parts: [{ type: "text", text: "A lead is far away but maybe acceptable. Should that be a hard decline or a warning review?" }] }],
        }),
      }),
    );

    expect(hoisted.streamText).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      text: "That should be a warning review, not a hard decline. Hold the lead without replying yet, add an orange-badge style warning for distance/risk, and surface it in the evening briefing so the user can decide whether to take it.",
    });
  });
});
