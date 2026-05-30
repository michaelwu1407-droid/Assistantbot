import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { requireInternalAdminAccess, getLatencySnapshot } = vi.hoisted(() => ({
  requireInternalAdminAccess: vi.fn(),
  getLatencySnapshot: vi.fn(),
}));

vi.mock("@/lib/internal-admin", () => ({
  requireInternalAdminAccess,
}));

vi.mock("@/lib/telemetry/latency", () => ({
  getLatencySnapshot,
}));

import VoiceLatencyPage from "@/app/admin/voice-latency/page";

function summary(over: Partial<Record<string, number>> = {}) {
  return { count: 0, avgMs: 0, minMs: 0, maxMs: 0, p50Ms: 0, p95Ms: 0, ...over };
}

describe("VoiceLatencyPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireInternalAdminAccess.mockResolvedValue({ id: "admin_1", email: "ops@earlymark.ai" });
  });

  it("renders per-provider LLM stats when both providers have data", async () => {
    getLatencySnapshot.mockResolvedValue({
      generatedAt: "2026-05-30T00:00:00.000Z",
      windowSize: 500,
      metrics: {
        "voice.llm.groq_ms": summary({ count: 5, avgMs: 280, p95Ms: 350 }),
        "voice.llm.groq.ttft_ms": summary({ count: 5, avgMs: 130 }),
        "voice.llm.deepinfra_ms": summary({ count: 2, avgMs: 410, p95Ms: 460 }),
        "voice.llm.deepinfra.ttft_ms": summary({ count: 2, avgMs: 200 }),
        "voice.stt_ms": summary({ count: 7, avgMs: 120 }),
        "voice.tts_ms": summary({ count: 7, avgMs: 95 }),
      },
    });

    render(await VoiceLatencyPage());

    expect(screen.getByText("Groq")).toBeInTheDocument();
    expect(screen.getByText("DeepInfra")).toBeInTheDocument();
    expect(screen.getByText("280 ms")).toBeInTheDocument();
    expect(screen.getByText("410 ms")).toBeInTheDocument();
    expect(screen.getByText("5 turns")).toBeInTheDocument();
    expect(screen.getByText("2 turns")).toBeInTheDocument();
  });

  it("shows an empty state when no voice samples exist", async () => {
    getLatencySnapshot.mockResolvedValue({
      generatedAt: "2026-05-30T00:00:00.000Z",
      windowSize: 500,
      metrics: {},
    });

    render(await VoiceLatencyPage());

    expect(screen.getByText(/No voice latency samples yet/i)).toBeInTheDocument();
    expect(screen.getAllByText("no data yet")).toHaveLength(2);
  });

  it("gates access through requireInternalAdminAccess", async () => {
    getLatencySnapshot.mockResolvedValue({ generatedAt: "x", windowSize: 500, metrics: {} });

    await VoiceLatencyPage();

    expect(requireInternalAdminAccess).toHaveBeenCalledOnce();
  });
});
