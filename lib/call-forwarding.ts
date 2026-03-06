const HASH = "%23";

export type CallForwardingMode = "full" | "backup" | "off";
export type CallForwardingCarrier = "telstra" | "vodafone" | "optus" | "other";

function toDialableAuNumber(phoneNumber: string): string {
  const digits = phoneNumber.replace(/\D/g, "");
  if (digits.startsWith("61")) return digits;
  if (digits.startsWith("0")) return `61${digits.slice(1)}`;
  return digits;
}

export function buildCallForwardingCodes(phoneNumber: string, delaySec = 15) {
  const dialable = toDialableAuNumber(phoneNumber);
  const safeDelay = Math.max(10, Math.min(45, delaySec));

  return {
    full: `**21*${dialable}#`,
    backup: `**61*${dialable}**${safeDelay}#`,
    off: "##002#",
    fullHref: `tel:**21*${dialable}${HASH}`,
    backupHref: `tel:**61*${dialable}**${safeDelay}${HASH}`,
    offHref: `tel:##002${HASH}`,
  };
}

export function buildCarrierSetupHint(carrier: CallForwardingCarrier, delaySec = 15): string {
  const safeDelay = Math.max(10, Math.min(45, delaySec));
  if (carrier === "telstra") {
    return `For Telstra, use no-answer forwarding after about ${safeDelay} seconds so Tracey picks up if you miss the call.`;
  }
  if (carrier === "vodafone") {
    return `For Vodafone, use no-answer forwarding so Tracey picks up after roughly ${safeDelay} seconds.`;
  }
  if (carrier === "optus") {
    return `For Optus, use your no-answer call forwarding option so Tracey picks up after roughly ${safeDelay} seconds.`;
  }
  return `Use your carrier's no-answer call forwarding option so Tracey picks up after roughly ${safeDelay} seconds.`;
}

export function buildCallForwardingSetupSmsBody(params: {
  businessName: string;
  agentPhoneNumber: string;
  mode: Exclude<CallForwardingMode, "off">;
  delaySec: number;
  carrier: CallForwardingCarrier;
}): string {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://earlymark.ai").replace(/\/$/, "");
  const codes = buildCallForwardingCodes(params.agentPhoneNumber, params.delaySec);
  const recommendedCode = params.mode === "full" ? codes.full : codes.backup;
  const setupHint = buildCarrierSetupHint(params.carrier, params.delaySec);

  return [
    `Tracey call forwarding is ready for ${params.businessName}.`,
    `Tracey's number: ${params.agentPhoneNumber}.`,
    setupHint,
    params.mode === "full"
      ? `Turn on 100% AI forwarding with: ${recommendedCode}`
      : `Turn on missed-call backup after about ${params.delaySec} seconds with: ${recommendedCode}`,
    `Turn forwarding off anytime with: ${codes.off}`,
    `Open setup in Earlymark: ${appUrl}/dashboard/settings`,
  ].join("\n");
}
