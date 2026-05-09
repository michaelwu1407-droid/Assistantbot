import { describe, expect, it } from "vitest";

import {
  appendTranscriptTurn,
  consumePendingAssistantTranscript,
  recordSpokenAssistantTranscript,
  type PendingAssistantTranscript,
  type TranscriptTurn,
} from "@/livekit-agent/transcript-utils";

describe("transcript-utils", () => {
  it("records spoken assistant text immediately and queues it for later dedupe", () => {
    const transcriptTurns: TranscriptTurn[] = [];
    const pendingAssistantTranscripts: PendingAssistantTranscript[] = [];

    recordSpokenAssistantTranscript({
      transcriptTurns,
      pendingAssistantTranscripts,
      text: "Thanks for calling Earlymark AI. We answer missed calls and qualify new leads for your business.",
      createdAt: 123,
    });

    expect(transcriptTurns).toEqual([
      {
        role: "assistant",
        text: "Thanks for calling Earlymark AI. We answer missed calls and qualify new leads for your business.",
        createdAt: 123,
      },
    ]);
    expect(pendingAssistantTranscripts).toHaveLength(1);
  });

  it("consumes a matching conversation item without duplicating the assistant turn", () => {
    const transcriptTurns: TranscriptTurn[] = [];
    const pendingAssistantTranscripts: PendingAssistantTranscript[] = [];

    recordSpokenAssistantTranscript({
      transcriptTurns,
      pendingAssistantTranscripts,
      text: "Hi there. We answer missed calls and capture leads.",
      createdAt: 456,
    });

    const consumed = consumePendingAssistantTranscript(
      pendingAssistantTranscripts,
      "Hi there, we answer missed calls and capture leads.",
    );

    expect(consumed).toBe(true);
    expect(pendingAssistantTranscripts).toHaveLength(0);
    expect(transcriptTurns).toHaveLength(1);
  });

  it("keeps unmatched assistant conversation items eligible for fallback capture", () => {
    const pendingAssistantTranscripts: PendingAssistantTranscript[] = [];

    recordSpokenAssistantTranscript({
      transcriptTurns: [],
      pendingAssistantTranscripts,
      text: "First spoken answer",
      createdAt: 789,
    });

    const consumed = consumePendingAssistantTranscript(
      pendingAssistantTranscripts,
      "Different assistant text",
    );

    expect(consumed).toBe(false);
    expect(pendingAssistantTranscripts).toHaveLength(1);
  });

  it("still suppresses exact duplicate transcript turns", () => {
    const transcriptTurns: TranscriptTurn[] = [];

    appendTranscriptTurn(transcriptTurns, {
      role: "user",
      text: "Hello",
      createdAt: 1,
    });
    appendTranscriptTurn(transcriptTurns, {
      role: "user",
      text: "Hello",
      createdAt: 1,
    });

    expect(transcriptTurns).toHaveLength(1);
  });
});
