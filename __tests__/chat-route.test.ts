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
    hoisted.convertToModelMessages.mockImplementation(async (messages: Array<{ role?: string; content?: string; parts?: Array<{ text?: string }> }>) =>
      messages.map((message) => ({
        role: message.role ?? "user",
        content: message.content ?? message.parts?.find((part) => typeof part.text === "string")?.text ?? "",
      })),
    );
    hoisted.buildAgentContext.mockResolvedValue({
      settings: { agentMode: "AUTO" },
      userRole: "OWNER",
      knowledgeBaseStr: "BUSINESS IDENTITY:\n- Business Name: Earlymark",
      agentModeStr: "CONTACT MODE: Backup AI",
      workingHoursStr: "WORKING HOURS: 8am to 5pm",
      agentScriptStr: "AGENT SCRIPT: Keep it crisp",
      allowedTimesStr: "ALLOWED TIMES: send between 8am and 6pm",
      preferencesStr: "PREFERENCES:\n- Be helpful",
      pricingRulesStr: "PRICING RULES:\n- Use approved prices",
      bouncerStr: "LEAD QUALIFICATION:\n- Hold risky leads for review",
      attachmentsStr: "BUSINESS DOCUMENTS:\n- Price book attached",
    });
    hoisted.getAgentToolsForIntent.mockReturnValue({});
    hoisted.buildCrmChatSystemPrompt.mockReturnValue("system prompt");
    hoisted.createGoogleGenerativeAI.mockReturnValue(() => ({ provider: "google-model" }));
    hoisted.streamText.mockReturnValue({
      toUIMessageStreamResponse: () =>
        new Response(JSON.stringify({ text: "model response" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
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

  it("routes common contact creation requests through the LLM/tool path with crm-action hints", async () => {
    hoisted.preClassify.mockReturnValue({
      intent: "crm_action",
      confidence: 0.92,
      contextHints: ["CRM ACTION REQUEST: Prefer using CRM mutation tools directly instead of saying you cannot do it."],
      suggestedTools: ["createContact"],
      requiresCalculator: false,
    });

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
    expect(hoisted.runCreateContact).not.toHaveBeenCalled();
    expect(hoisted.streamText).toHaveBeenCalledTimes(1);
    expect(hoisted.buildCrmChatSystemPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        intentHintBlock: expect.stringContaining("CRM ACTION REQUEST"),
        workspaceContextBlocks: expect.arrayContaining([
          "BUSINESS IDENTITY:\n- Business Name: Earlymark",
          "WORKING HOURS: 8am to 5pm",
          "PREFERENCES:\n- Be helpful",
        ]),
      }),
    );
    expect(await response.json()).toEqual({ text: "model response" });
  });

  it("routes common job creation requests through the LLM/tool path instead of direct regex execution", async () => {
    hoisted.preClassify.mockReturnValue({
      intent: "crm_action",
      confidence: 0.92,
      contextHints: ["CRM ACTION REQUEST: Prefer using CRM mutation tools directly instead of saying you cannot do it."],
      suggestedTools: ["createJobNatural"],
      requiresCalculator: false,
    });
    hoisted.extractAllJobsFromParagraph.mockResolvedValue([]);
    hoisted.parseJobWithAI.mockResolvedValue(null);

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

    expect(hoisted.runCreateJobNatural).not.toHaveBeenCalled();
    expect(hoisted.streamText).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({ text: "model response" });
  });

  it("injects likely contact context for contact lookups while keeping the model in charge", async () => {
    hoisted.preClassify.mockReturnValue({
      intent: "contact_lookup",
      confidence: 0.9,
      contextHints: ["CONTACT QUERY: Use searchContacts or getClientContext to find the person first."],
      suggestedTools: ["searchContacts", "getClientContext"],
      requiresCalculator: false,
    });
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
      recentJobs: [{ id: "deal_1", title: "Blocked Drain", stage: "Scheduled", scheduledAt: null }],
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

    expect(hoisted.streamText).toHaveBeenCalledTimes(1);
    expect(hoisted.buildCrmChatSystemPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        intentHintBlock: expect.stringContaining("CONTACT QUERY"),
        resolvedEntitiesBlock: expect.stringContaining("Likely contact: Alex Harper"),
        workspaceContextBlocks: expect.not.arrayContaining(["PRICING RULES:\n- Use approved prices"]),
      }),
    );
    expect(await response.json()).toEqual({ text: "model response" });
  });

  it("injects likely deal context for crm mutations without bypassing the LLM", async () => {
    hoisted.preClassify.mockReturnValue({
      intent: "crm_action",
      confidence: 0.9,
      contextHints: ["CRM ACTION REQUEST: Prefer using CRM mutation tools directly instead of saying you cannot do it."],
      suggestedTools: ["moveDeal"],
      requiresCalculator: false,
    });
    hoisted.getDeals.mockResolvedValue([
      {
        id: "deal_1",
        title: "Blocked Drain",
        stage: "SCHEDULED",
        scheduledAt: new Date("2026-04-05T01:00:00.000Z"),
      },
    ]);

    const response = await POST(
      new Request("https://app.example.com/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId: "ws_1",
          messages: [{ role: "user", parts: [{ type: "text", text: "Move Blocked Drain to scheduled tomorrow morning." }] }],
        }),
      }),
    );

    expect(hoisted.streamText).toHaveBeenCalledTimes(1);
    expect(hoisted.buildCrmChatSystemPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        resolvedEntitiesBlock: expect.stringContaining("Likely jobs: Blocked Drain"),
      }),
    );
    expect(await response.json()).toEqual({ text: "model response" });
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
