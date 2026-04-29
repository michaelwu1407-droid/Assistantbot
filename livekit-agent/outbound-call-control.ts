import { RoomServiceClient, SipClient } from "livekit-server-sdk";

export type VoiceWorkerQueuedOutboundCallRequest = {
  workspaceId: string;
  workspaceName: string;
  workspaceCallerNumber: string | null;
  contactPhone: string;
  contactName: string;
  dealId: string | null;
  reason: string;
};

export type VoiceWorkerQueuedOutboundCallResult = {
  roomName: string;
  normalizedPhone: string;
  resolvedTrunkId: string;
  callerNumber: string | null;
  transport: "worker_queue";
};

function normalizePhone(phone?: string | null) {
  if (!phone) return "";
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("0")) return `+61${cleaned.slice(1)}`;
  if (cleaned.startsWith("61")) return `+${cleaned}`;
  return cleaned;
}

function getLivekitControlBaseUrl() {
  const explicit = (process.env.LIVEKIT_CONTROL_URL || "").trim();
  if (explicit) return explicit;

  if ((process.env.NODE_ENV || "").trim() === "production") {
    return "http://127.0.0.1:7880";
  }

  const raw = (process.env.LIVEKIT_URL || "").trim();
  if (!raw) return "";
  if (/^wss:/i.test(raw)) return raw.replace(/^wss:/i, "https:");
  if (/^ws:/i.test(raw)) return raw.replace(/^ws:/i, "http:");
  return raw;
}

function getSipClient() {
  const livekitUrl = getLivekitControlBaseUrl();
  const apiKey = (process.env.LIVEKIT_API_KEY || "").trim();
  const apiSecret = (process.env.LIVEKIT_API_SECRET || "").trim();

  if (!livekitUrl || !apiKey || !apiSecret) {
    throw new Error("LiveKit credentials are incomplete for worker outbound calls.");
  }

  return new SipClient(livekitUrl, apiKey, apiSecret);
}

function getRoomClient() {
  const livekitUrl = getLivekitControlBaseUrl();
  const apiKey = (process.env.LIVEKIT_API_KEY || "").trim();
  const apiSecret = (process.env.LIVEKIT_API_SECRET || "").trim();

  if (!livekitUrl || !apiKey || !apiSecret) {
    throw new Error("LiveKit credentials are incomplete for worker outbound calls.");
  }

  return new RoomServiceClient(livekitUrl, apiKey, apiSecret);
}

async function resolveWorkspaceOutboundTrunk(
  workspaceCallerNumber: string | null,
  sipClient: SipClient,
) {
  const normalizedWorkspaceCallerNumber = normalizePhone(workspaceCallerNumber);
  const outboundTrunks = await sipClient.listSipOutboundTrunk();

  if (normalizedWorkspaceCallerNumber) {
    const workspaceTrunk = outboundTrunks.find((trunk) => {
      const numbers = Array.isArray(trunk.numbers)
        ? trunk.numbers.map((value) => normalizePhone(String(value)))
        : [];
      return numbers.includes(normalizedWorkspaceCallerNumber);
    });

    if (workspaceTrunk) {
      return {
        trunkId: String(workspaceTrunk.sipTrunkId || ""),
        callerNumber: normalizedWorkspaceCallerNumber,
      };
    }
  }

  const configuredTrunkId = (process.env.LIVEKIT_SIP_TRUNK_ID || "").trim();
  const resolved = configuredTrunkId
    ? outboundTrunks.find((trunk) => String(trunk.sipTrunkId) === configuredTrunkId)
    : outboundTrunks[0];

  if (!resolved) {
    throw new Error("No outbound SIP trunk available for this workspace.");
  }

  const callerNumber = normalizedWorkspaceCallerNumber
    || (Array.isArray(resolved.numbers)
      ? resolved.numbers.map((value) => normalizePhone(String(value))).find((value) => value && value !== "*")
      : null)
    || null;

  return {
    trunkId: String(resolved.sipTrunkId || ""),
    callerNumber,
  };
}

export async function executeQueuedOutboundCall(
  request: VoiceWorkerQueuedOutboundCallRequest,
): Promise<VoiceWorkerQueuedOutboundCallResult> {
  const normalizedPhone = normalizePhone(request.contactPhone);
  if (!normalizedPhone) {
    throw new Error("Valid phone number required for worker outbound call.");
  }

  const sipClient = getSipClient();
  const roomClient = getRoomClient();
  const trunk = await resolveWorkspaceOutboundTrunk(request.workspaceCallerNumber, sipClient);
  const roomName = `outbound-${request.workspaceId.slice(0, 8)}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  await roomClient.createRoom({
    name: roomName,
    emptyTimeout: 300,
    maxParticipants: 2,
    metadata: JSON.stringify({
      callType: "normal",
      outbound: true,
      workspaceId: request.workspaceId,
      contactName: request.contactName,
      phone: normalizedPhone,
      calledPhone: normalizePhone(request.workspaceCallerNumber) || "",
      dealId: request.dealId || "",
      reason: request.reason,
    }),
  });

  await sipClient.createSipParticipant(trunk.trunkId, normalizedPhone, roomName, {
    fromNumber: trunk.callerNumber || undefined,
    participantName: request.contactName || normalizedPhone,
    participantIdentity: `outbound-caller-${normalizedPhone}`,
    playDialtone: true,
  });

  return {
    roomName,
    normalizedPhone,
    resolvedTrunkId: trunk.trunkId,
    callerNumber: trunk.callerNumber,
    transport: "worker_queue",
  };
}
