export type TranscriptTurn = {
  role: "user" | "assistant";
  text: string;
  createdAt: number;
};

export type PendingAssistantTranscript = {
  text: string;
  normalizedText: string;
};

function normalizeTranscriptMatchText(text: string) {
  return text
    .toLowerCase()
    .replace(/tracey/g, "tracy")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function appendTranscriptTurn(
  transcriptTurns: TranscriptTurn[],
  turn: TranscriptTurn,
) {
  const lastTurn = transcriptTurns[transcriptTurns.length - 1];
  if (
    lastTurn &&
    lastTurn.role === turn.role &&
    lastTurn.text === turn.text &&
    lastTurn.createdAt === turn.createdAt
  ) {
    return;
  }
  transcriptTurns.push(turn);
}

export function recordSpokenAssistantTranscript(params: {
  transcriptTurns: TranscriptTurn[];
  pendingAssistantTranscripts: PendingAssistantTranscript[];
  text: string;
  createdAt?: number;
}) {
  const text = params.text.trim();
  if (!text) return;

  appendTranscriptTurn(params.transcriptTurns, {
    role: "assistant",
    text,
    createdAt: params.createdAt ?? Date.now(),
  });
  params.pendingAssistantTranscripts.push({
    text,
    normalizedText: normalizeTranscriptMatchText(text),
  });
}

export function consumePendingAssistantTranscript(
  pendingAssistantTranscripts: PendingAssistantTranscript[],
  text: string,
) {
  const normalizedText = normalizeTranscriptMatchText(text);
  if (!normalizedText) return false;

  const matchIndex = pendingAssistantTranscripts.findIndex(
    (entry) => entry.normalizedText === normalizedText,
  );
  if (matchIndex === -1) return false;

  pendingAssistantTranscripts.splice(matchIndex, 1);
  return true;
}
