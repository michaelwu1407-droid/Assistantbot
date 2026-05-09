export function normalizeSipCallStatus(status?: string | null) {
  return (status || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

export function readSipCallStatus(attributes?: Record<string, string> | null) {
  if (!attributes) return null;

  return (
    attributes["sip.callStatus"] ||
    attributes["sip.call_status"] ||
    attributes["sip.status"] ||
    null
  );
}

export function isSipCallPendingStatus(status?: string | null) {
  const normalized = normalizeSipCallStatus(status);
  return normalized === "" || ["new", "dialing", "ringing", "trying", "connecting"].includes(normalized);
}

export function isSipCallConnectedStatus(status?: string | null) {
  const normalized = normalizeSipCallStatus(status);
  return ["active", "connected", "answered", "in_progress", "automation"].includes(normalized);
}

export function isSipCallTerminalFailureStatus(status?: string | null) {
  const normalized = normalizeSipCallStatus(status);
  return [
    "hangup",
    "disconnected",
    "busy",
    "failed",
    "no_answer",
    "canceled",
    "cancelled",
    "rejected",
  ].includes(normalized);
}
