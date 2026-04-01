import { beforeEach, describe, expect, it, vi } from "vitest";

const { createOpenAI, createGoogleGenerativeAI, openaiProvider, googleProvider } = vi.hoisted(() => ({
  createOpenAI: vi.fn(),
  createGoogleGenerativeAI: vi.fn(),
  openaiProvider: vi.fn((model: string) => ({ provider: "deepinfra", model })),
  googleProvider: vi.fn((model: string) => ({ provider: "google", model })),
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI,
}));

vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI,
}));

describe("lib/ai-models", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.unstubAllEnvs();
    createOpenAI.mockReturnValue(openaiProvider);
    createGoogleGenerativeAI.mockReturnValue(googleProvider);
  });

  it("creates the expected model tiers with the preferred Gemini env var", async () => {
    vi.stubEnv("DEEPINFRA_API_KEY", "deepinfra-key");
    vi.stubEnv("GEMINI_API_KEY", "gemini-key");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "fallback-key");

    const { contextModel, logicModel } = await import("@/lib/ai-models");

    expect(createOpenAI).toHaveBeenCalledWith({
      baseURL: "https://api.deepinfra.com/v1/openai",
      apiKey: "deepinfra-key",
    });
    expect(createGoogleGenerativeAI).toHaveBeenCalledWith({
      apiKey: "gemini-key",
    });
    expect(googleProvider).toHaveBeenCalledWith("gemini-2.0-flash-lite-preview-02-05");
    expect(openaiProvider).toHaveBeenCalledWith("deepseek-ai/DeepSeek-V3");
    expect(contextModel).toEqual({
      provider: "google",
      model: "gemini-2.0-flash-lite-preview-02-05",
    });
    expect(logicModel).toEqual({
      provider: "deepinfra",
      model: "deepseek-ai/DeepSeek-V3",
    });
  });

  it("falls back to GOOGLE_GENERATIVE_AI_API_KEY when GEMINI_API_KEY is absent", async () => {
    vi.stubEnv("DEEPINFRA_API_KEY", "deepinfra-key");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "fallback-key");
    delete process.env.GEMINI_API_KEY;

    await import("@/lib/ai-models");

    expect(createGoogleGenerativeAI).toHaveBeenCalledWith({
      apiKey: "fallback-key",
    });
  });
});
