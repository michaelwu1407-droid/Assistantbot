const EARLYMARK_INBOUND_ROOM_PREFIXES = ["earlymark-inbound-", "inbound_"] as const;

export function isEarlymarkInboundRoomName(roomName?: string | null) {
  const normalized = (roomName || "").trim().toLowerCase();
  if (!normalized) return false;

  return EARLYMARK_INBOUND_ROOM_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}
