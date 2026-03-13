const DEFAULT_LIVEKIT_SIP_TERMINATION_URI =
  "earlymark-outbound.pstn.sydney.twilio.com";

export function getLivekitSipTerminationUri() {
  return (
    process.env.LIVEKIT_SIP_TERMINATION_URI?.trim() ||
    DEFAULT_LIVEKIT_SIP_TERMINATION_URI
  );
}

export function getRecommendedTwilioOriginationUri() {
  const livekitSipUri = process.env.LIVEKIT_SIP_URI?.trim();
  if (!livekitSipUri) {
    return null;
  }

  if (/;edge=/i.test(livekitSipUri)) {
    return livekitSipUri;
  }

  return `${livekitSipUri};edge=sydney`;
}

export function getEarlymarkInboundSipUri(calledNumber?: string | null) {
  const normalizedCalledNumber = (calledNumber || "").trim();
  const configuredSipUri = process.env.LIVEKIT_SIP_URI?.trim() || "";

  if (configuredSipUri) {
    const withoutParams = configuredSipUri.split(";")[0] || configuredSipUri;
    if (normalizedCalledNumber && /^sip:/i.test(withoutParams) && !/@/.test(withoutParams)) {
      return withoutParams.replace(/^sip:/i, `sip:${normalizedCalledNumber}@`);
    }
    return configuredSipUri;
  }

  const livekitUrl = (process.env.LIVEKIT_URL || "").trim();
  if (livekitUrl) {
    try {
      const parsed = new URL(livekitUrl.replace(/^wss:/i, "https:").replace(/^ws:/i, "http:"));
      const host = parsed.host;
      if (host && normalizedCalledNumber) {
        return `sip:${normalizedCalledNumber}@${host}:5060`;
      }
      if (host) {
        return `sip:${host}:5060`;
      }
    } catch {
      // Fall through to the static default if LIVEKIT_URL is malformed.
    }
  }

  return normalizedCalledNumber
    ? `sip:${normalizedCalledNumber}@live.earlymark.ai:5060`
    : "sip:live.earlymark.ai:5060";
}
