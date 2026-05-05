import { RoomServiceClient, SipClient } from "livekit-server-sdk";
import { getKnownEarlymarkInboundNumbers } from "@/lib/earlymark-inbound-config";
import { getEarlymarkInboundSipUri } from "@/lib/livekit-sip-config";
import { phoneMatches } from "@/lib/phone-utils";
import { twilioMasterClient } from "@/lib/twilio";

type OutboundTrunkInfo = {
  sipTrunkId: string;
  name: string;
  numbers: string[];
  address: string;
  metadata: string;
};

export type ResolvedDemoOutboundTrunk = {
  status: "healthy" | "degraded" | "unhealthy";
  summary: string;
  warnings: string[];
  configuredTrunkId: string | null;
  resolvedTrunkId: string | null;
  configuredTrunkMatched: boolean;
  callerNumber: string | null;
  outboundTrunkCount: number;
  outboundTrunks: OutboundTrunkInfo[];
};

export type DemoCallInput = {
  phone: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  businessName?: string;
};

export type DemoCallResult = {
  roomName: string;
  normalizedPhone: string;
  resolvedTrunkId: string;
  callerNumber: string | null;
  warnings: string[];
  transport: "livekit_control" | "twilio_sip_bridge";
  callSid: string | null;
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

// E.164 allows 8-15 digits after the +. We use 8 as a defensive minimum because
// LiveKit/Twilio will silently fail on shorter "numbers" (typos, partial input).
export function isValidE164Phone(phone: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(phone);
}

function getKnownCallerNumbers() {
  const values = [
    ...(process.env.EARLYMARK_INBOUND_PHONE_NUMBERS || "")
      .split(/[,\n]/)
      .map((value) => value.trim()),
    process.env.EARLYMARK_INBOUND_PHONE_NUMBER,
    process.env.EARLYMARK_PHONE_NUMBER,
    process.env.TWILIO_PHONE_NUMBER,
  ]
    .map((value) => normalizePhone(value))
    .filter(Boolean);

  return Array.from(new Set(values));
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || "Unknown error");
}

function getTwilioBridgeCallerNumber(preferred?: string | null) {
  return [process.env.VOICE_MONITOR_PROBE_CALLER_NUMBER, preferred, ...getKnownCallerNumbers()]
    .map((value) => normalizePhone(value))
    .find(Boolean) || null;
}

function buildTwilioSipBridgeTwiml(sipTarget: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial answerOnBridge="true">
    <Sip>${escapeXml(sipTarget)}</Sip>
  </Dial>
</Response>`;
}

async function initiateDemoCallViaTwilioSipBridge(params: {
  normalizedPhone: string;
  preferredCallerNumber?: string | null;
  directError: unknown;
}): Promise<DemoCallResult> {
  if (!twilioMasterClient) {
    throw new Error("Twilio is not configured for demo-call fallback.");
  }

  const callerNumber = getTwilioBridgeCallerNumber(params.preferredCallerNumber);
  if (!callerNumber) {
    throw new Error("No Twilio caller number is configured for demo-call fallback.");
  }

  const inboundTargetNumber = getKnownEarlymarkInboundNumbers()[0] || null;
  const sipTarget = getEarlymarkInboundSipUri(inboundTargetNumber);
  if (!sipTarget) {
    throw new Error("No LiveKit SIP target is configured for demo-call fallback.");
  }

  const createdCall = await twilioMasterClient.calls.create({
    to: params.normalizedPhone,
    from: callerNumber,
    timeout: 20,
    twiml: buildTwilioSipBridgeTwiml(sipTarget),
  }) as { sid: string };

  return {
    roomName: `twilio-bridge-${createdCall.sid}`,
    normalizedPhone: params.normalizedPhone,
    resolvedTrunkId: `twilio-sip-bridge:${inboundTargetNumber || "default"}`,
    callerNumber,
    warnings: [
      `Used Twilio SIP bridge fallback because the LiveKit control API failed: ${getErrorMessage(params.directError)}`,
    ],
    transport: "twilio_sip_bridge",
    callSid: createdCall.sid,
  };
}

function getLivekitSipClient() {
  const livekitUrl = getLivekitApiBaseUrl();
  const apiKey = (process.env.LIVEKIT_API_KEY || "").trim();
  const apiSecret = (process.env.LIVEKIT_API_SECRET || "").trim();

  if (!livekitUrl || !apiKey || !apiSecret) {
    throw new Error("LiveKit credentials are incomplete for outbound demo calls.");
  }

  return new SipClient(livekitUrl, apiKey, apiSecret);
}

function getLivekitRoomClient() {
  const livekitUrl = getLivekitApiBaseUrl();
  const apiKey = (process.env.LIVEKIT_API_KEY || "").trim();
  const apiSecret = (process.env.LIVEKIT_API_SECRET || "").trim();

  if (!livekitUrl || !apiKey || !apiSecret) {
    throw new Error("LiveKit credentials are incomplete for outbound demo calls.");
  }

  return new RoomServiceClient(livekitUrl, apiKey, apiSecret);
}

function summarizeResolvedTrunk(result: {
  outboundTrunks: OutboundTrunkInfo[];
  warnings: string[];
  resolvedTrunkId: string | null;
}) {
  if (result.outboundTrunks.length === 0) {
    return {
      status: "unhealthy" as const,
      summary: "No LiveKit outbound SIP trunks are configured for demo calls.",
    };
  }

  if (!result.resolvedTrunkId) {
    return {
      status: "unhealthy" as const,
      summary: "No valid LiveKit outbound SIP trunk could be resolved for demo calls.",
    };
  }

  if (result.warnings.length > 0) {
    return {
      status: "degraded" as const,
      summary: result.warnings[0],
    };
  }

  return {
    status: "healthy" as const,
    summary: "LiveKit outbound SIP trunk is ready for demo calls.",
  };
}

export async function resolveLivekitDemoOutboundTrunk(options: {
  sipClient?: Pick<SipClient, "listSipOutboundTrunk" | "listSipInboundTrunk">;
  preloadedOutboundTrunks?: Array<{
    sipTrunkId?: string | null;
    name?: string | null;
    numbers?: string[] | null;
    address?: string | null;
    metadata?: string | null;
  }>;
  preloadedInboundTrunks?: Array<{
    sipTrunkId?: string | null;
    name?: string | null;
    numbers?: string[] | null;
  }>;
} = {}): Promise<ResolvedDemoOutboundTrunk> {
  const configuredTrunkId = (process.env.LIVEKIT_SIP_TRUNK_ID || "").trim() || null;
  const configuredCallerNumbers = getKnownCallerNumbers();
  const rawInboundTrunks = options.preloadedInboundTrunks
    ? options.preloadedInboundTrunks
    : options.sipClient
      ? await options.sipClient.listSipInboundTrunk()
      : [];
  const inboundCallerNumbers = rawInboundTrunks
    .flatMap((trunk) => (Array.isArray(trunk.numbers) ? trunk.numbers : []))
    .map((value) => normalizePhone(String(value)))
    .filter(Boolean);
  const callerNumbers = Array.from(new Set([...configuredCallerNumbers, ...inboundCallerNumbers]));
  const rawOutboundTrunks = options.preloadedOutboundTrunks
    ? options.preloadedOutboundTrunks
    : await (options.sipClient || getLivekitSipClient()).listSipOutboundTrunk();

  const outboundTrunks = rawOutboundTrunks.map((trunk) => ({
    sipTrunkId: String(trunk.sipTrunkId || ""),
    name: String(trunk.name || ""),
    numbers: Array.isArray(trunk.numbers) ? trunk.numbers.map((value) => String(value)) : [],
    address: String(trunk.address || ""),
    metadata: String(trunk.metadata || ""),
  }));

  const warnings: string[] = [];
  let resolved = configuredTrunkId
    ? outboundTrunks.find((trunk) => trunk.sipTrunkId === configuredTrunkId) || null
    : null;

  const configuredTrunkMatched = Boolean(resolved);
  if (configuredTrunkId && !configuredTrunkMatched) {
    warnings.push(`Configured LIVEKIT_SIP_TRUNK_ID ${configuredTrunkId} does not match any current outbound SIP trunk.`);
  }

  if (!resolved && callerNumbers.length > 0) {
    resolved =
      outboundTrunks.find((trunk) => callerNumbers.some((number) => trunk.numbers.some((candidate) => phoneMatches(candidate, number)))) || null;
  }

  if (!resolved) {
    resolved = outboundTrunks.find((trunk) => trunk.numbers.includes("*")) || null;
  }

  if (!resolved) {
    resolved = outboundTrunks[0] || null;
  }

  const callerNumber =
    callerNumbers.find((number) => resolved?.numbers.some((candidate) => phoneMatches(candidate, number))) ||
    (resolved?.numbers.includes("*") ? callerNumbers[0] || null : null) ||
    (resolved?.numbers.find((number) => number !== "*") || null);

  const summary = summarizeResolvedTrunk({
    outboundTrunks,
    warnings,
    resolvedTrunkId: resolved?.sipTrunkId || null,
  });

  return {
    status: summary.status,
    summary: summary.summary,
    warnings,
    configuredTrunkId,
    resolvedTrunkId: resolved?.sipTrunkId || null,
    configuredTrunkMatched,
    callerNumber,
    outboundTrunkCount: outboundTrunks.length,
    outboundTrunks,
  };
}

export async function initiateDemoCall(input: DemoCallInput): Promise<DemoCallResult> {
  const normalizedPhone = normalizePhone(input.phone);
  if (!normalizedPhone) {
    throw new Error("Phone number required");
  }
  if (!isValidE164Phone(normalizedPhone)) {
    throw new Error(
      `Phone number ${input.phone} is not a valid international number. Include country code (e.g. +61 for Australia).`,
    );
  }

  const firstName = input.firstName?.trim() || "there";
  const lastName = input.lastName?.trim() || "";
  const email = input.email?.trim().toLowerCase() || "";
  const businessName = input.businessName?.trim() || "";
  let preferredCallerNumber: string | null = null;

  try {
    const sipClient = getLivekitSipClient();
    const roomClient = getLivekitRoomClient();
    const outbound = await resolveLivekitDemoOutboundTrunk({ sipClient });

    if (!outbound.resolvedTrunkId) {
      throw new Error(outbound.summary);
    }

    preferredCallerNumber = outbound.callerNumber;

    const warnings = [...outbound.warnings];
    if (!outbound.callerNumber) {
      // LiveKit/Twilio will reject outbound calls when neither the request nor the
      // trunk supplies a caller number. Surface this as a warning so the caller
      // sees a real reason rather than a silent no-ring failure.
      warnings.push(
        "No outbound caller number could be resolved for the demo SIP trunk; the carrier may reject this call.",
      );
    }

    const roomName = `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await roomClient.createRoom({
      name: roomName,
      emptyTimeout: 300,
      maxParticipants: 2,
      metadata: JSON.stringify({
        callType: "demo",
        firstName,
        lastName,
        email,
        businessName,
        phone: normalizedPhone,
      }),
    });

    await sipClient.createSipParticipant(outbound.resolvedTrunkId, normalizedPhone, roomName, {
      fromNumber: outbound.callerNumber || undefined,
      participantName: firstName,
      participantIdentity: `demo-caller-${normalizedPhone}`,
    });

    return {
      roomName,
      normalizedPhone,
      resolvedTrunkId: outbound.resolvedTrunkId,
      callerNumber: outbound.callerNumber,
      warnings,
      transport: "livekit_control",
      callSid: null,
    };
  } catch (directError) {
    try {
      return await initiateDemoCallViaTwilioSipBridge({
        normalizedPhone,
        preferredCallerNumber,
        directError,
      });
    } catch (fallbackError) {
      throw new Error(
        `LiveKit demo call failed: ${getErrorMessage(directError)}. Twilio SIP bridge fallback failed: ${getErrorMessage(fallbackError)}`,
      );
    }
  }
}
