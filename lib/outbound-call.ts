import { RoomServiceClient, SipClient } from "livekit-server-sdk";
import { db } from "@/lib/db";

export type OutboundCallInput = {
  workspaceId: string;
  contactPhone: string;
  contactName?: string;
  dealId?: string;
  reason?: string;
};

export type OutboundCallResult = {
  roomName: string;
  normalizedPhone: string;
  resolvedTrunkId: string;
  callerNumber: string | null;
};

function getLivekitApiBaseUrl() {
  const raw = (process.env.LIVEKIT_URL || "").trim();
  if (!raw) return "";
  if (/^wss:/i.test(raw)) return raw.replace(/^wss:/i, "https:");
  if (/^ws:/i.test(raw)) return raw.replace(/^ws:/i, "http:");
  return raw;
}

function normalizePhone(phone?: string | null) {
  if (!phone) return "";
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("0")) return `+61${cleaned.slice(1)}`;
  if (cleaned.startsWith("61")) return `+${cleaned}`;
  return cleaned;
}

function getSipClient() {
  const livekitUrl = getLivekitApiBaseUrl();
  const apiKey = (process.env.LIVEKIT_API_KEY || "").trim();
  const apiSecret = (process.env.LIVEKIT_API_SECRET || "").trim();

  if (!livekitUrl || !apiKey || !apiSecret) {
    throw new Error("LiveKit credentials are incomplete for outbound calls.");
  }
  return new SipClient(livekitUrl, apiKey, apiSecret);
}

function getRoomClient() {
  const livekitUrl = getLivekitApiBaseUrl();
  const apiKey = (process.env.LIVEKIT_API_KEY || "").trim();
  const apiSecret = (process.env.LIVEKIT_API_SECRET || "").trim();

  if (!livekitUrl || !apiKey || !apiSecret) {
    throw new Error("LiveKit credentials are incomplete for outbound calls.");
  }
  return new RoomServiceClient(livekitUrl, apiKey, apiSecret);
}

/**
 * Resolve the outbound SIP trunk for a specific workspace.
 * Prefers the workspace's own Twilio trunk if it has one,
 * otherwise falls back to the platform-level outbound trunk.
 */
async function resolveWorkspaceOutboundTrunk(workspaceId: string, sipClient: SipClient) {
  // Check if workspace has its own SIP trunk
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      twilioPhoneNumber: true,
      twilioPhoneNumberNormalized: true,
      twilioSipTrunkSid: true,
    },
  });

  const outboundTrunks = await sipClient.listSipOutboundTrunk();

  // Try to find a trunk that matches the workspace's Twilio number
  if (workspace?.twilioPhoneNumberNormalized) {
    const workspaceTrunk = outboundTrunks.find((trunk) => {
      const numbers = Array.isArray(trunk.numbers) ? trunk.numbers.map(String) : [];
      return numbers.includes(workspace.twilioPhoneNumberNormalized!);
    });
    if (workspaceTrunk) {
      return {
        trunkId: String(workspaceTrunk.sipTrunkId || ""),
        callerNumber: workspace.twilioPhoneNumberNormalized,
      };
    }
  }

  // Fall back to configured trunk or first available
  const configuredTrunkId = (process.env.LIVEKIT_SIP_TRUNK_ID || "").trim();
  const resolved = configuredTrunkId
    ? outboundTrunks.find((trunk) => String(trunk.sipTrunkId) === configuredTrunkId)
    : outboundTrunks[0];

  if (!resolved) {
    throw new Error("No outbound SIP trunk available for this workspace.");
  }

  const callerNumber = workspace?.twilioPhoneNumberNormalized
    || (Array.isArray(resolved.numbers) ? resolved.numbers.find((n) => String(n) !== "*") : null)
    || null;

  return {
    trunkId: String(resolved.sipTrunkId || ""),
    callerNumber: callerNumber ? String(callerNumber) : null,
  };
}

/**
 * Place an outbound call from Tracey (the AI agent) to a contact.
 * The AI agent will join the room and converse with the contact
 * using the workspace's voice grounding (same as inbound calls).
 */
export async function initiateOutboundCall(input: OutboundCallInput): Promise<OutboundCallResult> {
  const normalizedPhone = normalizePhone(input.contactPhone);
  if (!normalizedPhone) {
    throw new Error("Valid phone number required for outbound call.");
  }

  // Look up workspace's calling phone
  const workspace = await db.workspace.findUnique({
    where: { id: input.workspaceId },
    select: {
      twilioPhoneNumber: true,
      twilioPhoneNumberNormalized: true,
      name: true,
    },
  });

  if (!workspace) {
    throw new Error("Workspace not found.");
  }

  const sipClient = getSipClient();
  const roomClient = getRoomClient();
  const trunk = await resolveWorkspaceOutboundTrunk(input.workspaceId, sipClient);

  const roomName = `outbound-${input.workspaceId.slice(0, 8)}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  // Create room with metadata so the agent knows context
  await roomClient.createRoom({
    name: roomName,
    emptyTimeout: 300,
    maxParticipants: 2,
    metadata: JSON.stringify({
      callType: "normal",
      outbound: true,
      workspaceId: input.workspaceId,
      contactName: input.contactName || "",
      phone: normalizedPhone,
      calledPhone: workspace.twilioPhoneNumberNormalized || workspace.twilioPhoneNumber || "",
      dealId: input.dealId || "",
      reason: input.reason || "",
    }),
  });

  // Dial the contact
  await sipClient.createSipParticipant(trunk.trunkId, normalizedPhone, roomName, {
    fromNumber: trunk.callerNumber || undefined,
    participantName: input.contactName || normalizedPhone,
    participantIdentity: `outbound-caller-${normalizedPhone}`,
    playDialtone: true,
  });

  return {
    roomName,
    normalizedPhone,
    resolvedTrunkId: trunk.trunkId,
    callerNumber: trunk.callerNumber,
  };
}
