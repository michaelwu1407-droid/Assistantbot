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

