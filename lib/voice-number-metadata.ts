import type { VoiceSurface } from "@/lib/voice-fleet";

const MANAGED_PREFIX = "EMK";

type ManagedNumberScope = "earlymark" | "workspace";

function sanitize(value?: string | null) {
  return (value || "")
    .replace(/[|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildManagedVoiceNumberFriendlyName(params: {
  scope: ManagedNumberScope;
  surface: VoiceSurface;
  workspaceId?: string | null;
  label?: string | null;
}) {
  const parts = [MANAGED_PREFIX, params.scope, params.surface];
  if (params.workspaceId) {
    parts.push(`ws:${params.workspaceId}`);
  }

  const label = sanitize(params.label);
  if (label) {
    parts.push(label);
  }

  return parts.join("|").slice(0, 64);
}

export function parseManagedVoiceNumberFriendlyName(value?: string | null) {
  const trimmed = sanitize(value);
  if (!trimmed.startsWith(`${MANAGED_PREFIX}|`)) return null;

  const [, scope, surface, ...rest] = trimmed.split("|");
  const workspaceToken = rest.find((part) => part.startsWith("ws:")) || "";
  const workspaceId = workspaceToken.replace(/^ws:/, "").trim() || null;

  return {
    managed: true,
    scope: scope === "earlymark" ? "earlymark" : "workspace",
    surface:
      surface === "demo" || surface === "inbound_demo" || surface === "normal"
        ? surface
        : ("normal" as VoiceSurface),
    workspaceId,
  };
}

export function buildManagedSubaccountFriendlyName(workspaceId: string, businessName: string) {
  const label = sanitize(businessName).slice(0, 28);
  return `${MANAGED_PREFIX}|subaccount|ws:${workspaceId}${label ? `|${label}` : ""}`.slice(0, 64);
}

export function parseManagedSubaccountFriendlyName(value?: string | null) {
  const trimmed = sanitize(value);
  if (!trimmed.startsWith(`${MANAGED_PREFIX}|subaccount|`)) return null;

  const workspaceToken = trimmed
    .split("|")
    .find((part) => part.startsWith("ws:")) || "";

  const workspaceId = workspaceToken.replace(/^ws:/, "").trim() || null;
  return {
    managed: true,
    workspaceId,
  };
}
