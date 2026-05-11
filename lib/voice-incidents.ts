import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { recordMonitorRun } from "@/lib/ops-monitor-runs";
import { dispatchVoiceIncidentNotifications } from "@/lib/voice-incident-alert";
import type { VoiceSurface } from "@/lib/voice-fleet";

export type VoiceIncidentObservation = {
  incidentKey: string;
  surface: VoiceSurface | "routing" | "fleet" | "monitor" | "data";
  severity: "warning" | "critical";
  summary: string;
  details?: Record<string, unknown>;
};

const DEFAULT_INCIDENT_ALERT_COOLDOWN_MS = 60 * 60_000;
const DEFAULT_NON_CRITICAL_DIGEST_COOLDOWN_MS = 24 * 60 * 60_000;
const NON_CRITICAL_DIGEST_MONITOR_KEY = "voice-incident-digest";

function toJson(details?: Record<string, unknown>) {
  return details ? (JSON.parse(JSON.stringify(details)) as Prisma.InputJsonValue) : Prisma.JsonNull;
}

function parsePositiveMs(rawValue: string | undefined, fallback: number) {
  const parsed = Number.parseInt((rawValue || "").trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getIncidentAlertCooldownMs() {
  return parsePositiveMs(process.env.VOICE_INCIDENT_ALERT_COOLDOWN_MINUTES, DEFAULT_INCIDENT_ALERT_COOLDOWN_MS / 60_000) * 60_000;
}

function getNonCriticalDigestCooldownMs() {
  return parsePositiveMs(process.env.VOICE_NON_CRITICAL_DIGEST_HOURS, DEFAULT_NON_CRITICAL_DIGEST_COOLDOWN_MS / (60 * 60_000)) * 60 * 60_000;
}

function isAlertDue(date: Date | null | undefined, cooldownMs = getIncidentAlertCooldownMs()) {
  if (!date) return true;
  return Date.now() - date.getTime() >= cooldownMs;
}

function buildOpenSubject(observation: VoiceIncidentObservation) {
  return `VOICE ALERT: ${observation.surface} ${observation.severity}`;
}

function buildRecoverySubject(observation: VoiceIncidentObservation) {
  return `VOICE RECOVERY: ${observation.surface}`;
}

async function sendOpenAlert(observation: VoiceIncidentObservation) {
  return dispatchVoiceIncidentNotifications({
    subject: buildOpenSubject(observation),
    message: observation.summary,
    metadata: observation.details,
  });
}

async function sendRecoveryAlert(observation: {
  incidentKey: string;
  surface: string;
  summary: string;
  details?: Prisma.JsonValue | null;
}) {
  return dispatchVoiceIncidentNotifications({
    subject: buildRecoverySubject({
      incidentKey: observation.incidentKey,
      surface: observation.surface as VoiceIncidentObservation["surface"],
      severity: "warning",
      summary: observation.summary,
    }),
    message: `${observation.summary}\n\nThe incident has recovered.`,
    metadata: observation.details && typeof observation.details === "object" && !Array.isArray(observation.details)
      ? (observation.details as Record<string, unknown>)
      : undefined,
    channels: {
      sms: false,
      email: true,
    },
  });
}

function isNonCriticalSeverity(severity: string) {
  return severity === "warning";
}

function buildNonCriticalDigestSubject(openCount: number, resolvedCount: number) {
  if (openCount > 0 && resolvedCount > 0) {
    return `VOICE DIGEST: ${openCount} open warning issue(s), ${resolvedCount} resolved`;
  }
  if (openCount > 0) {
    return `VOICE DIGEST: ${openCount} open warning issue(s)`;
  }
  return `VOICE DIGEST: ${resolvedCount} warning issue(s) resolved`;
}

function renderDigestLine(incident: {
  incidentKey: string;
  surface: string;
  status: string;
  summary: string;
  updatedAt: Date;
}) {
  return `- [${incident.status}] ${incident.surface}: ${incident.summary} (${incident.incidentKey}, updated ${incident.updatedAt.toISOString()})`;
}

async function maybeSendNonCriticalDigest() {
  const digestCooldownMs = getNonCriticalDigestCooldownMs();
  const digestState = await db.opsMonitorRun.findUnique({
    where: { monitorKey: NON_CRITICAL_DIGEST_MONITOR_KEY },
  });

  if (!isAlertDue(digestState?.lastSuccessAt || digestState?.checkedAt, digestCooldownMs)) {
    return { sent: false, skipped: true, reason: "cooldown" as const };
  }

  const lastDigestAt = digestState?.checkedAt || null;
  const openWarnings = await db.voiceIncident.findMany({
    where: {
      status: "open",
      severity: "warning",
      incidentKey: { startsWith: "voice:" },
    },
    orderBy: [{ updatedAt: "desc" }],
  });
  const recentlyResolvedWarnings = await db.voiceIncident.findMany({
    where: {
      status: "resolved",
      severity: "warning",
      incidentKey: { startsWith: "voice:" },
      ...(lastDigestAt ? { resolvedAt: { gt: lastDigestAt } } : {}),
    },
    orderBy: [{ resolvedAt: "desc" }],
  });

  if (openWarnings.length === 0 && recentlyResolvedWarnings.length === 0) {
    return { sent: false, skipped: true, reason: "no_items" as const };
  }

  const subject = buildNonCriticalDigestSubject(openWarnings.length, recentlyResolvedWarnings.length);
  const sections: string[] = [];

  if (openWarnings.length > 0) {
    sections.push(
      "Open warning issues:",
      ...openWarnings.map(renderDigestLine),
    );
  }

  if (recentlyResolvedWarnings.length > 0) {
    sections.push(
      "Recently resolved warning issues:",
      ...recentlyResolvedWarnings.map(renderDigestLine),
    );
  }

  await dispatchVoiceIncidentNotifications({
    subject,
    message: sections.join("\n"),
    metadata: {
      openWarningCount: openWarnings.length,
      resolvedWarningCount: recentlyResolvedWarnings.length,
      openWarningKeys: openWarnings.map((incident) => incident.incidentKey),
      resolvedWarningKeys: recentlyResolvedWarnings.map((incident) => incident.incidentKey),
    },
    channels: {
      sms: false,
      email: true,
    },
  });

  await recordMonitorRun({
    monitorKey: NON_CRITICAL_DIGEST_MONITOR_KEY,
    status: "healthy",
    summary: `Sent daily non-critical voice digest with ${openWarnings.length} open and ${recentlyResolvedWarnings.length} resolved warning issue(s).`,
    details: {
      openWarningCount: openWarnings.length,
      resolvedWarningCount: recentlyResolvedWarnings.length,
      openWarningKeys: openWarnings.map((incident) => incident.incidentKey),
      resolvedWarningKeys: recentlyResolvedWarnings.map((incident) => incident.incidentKey),
    },
    checkedAt: new Date(),
    succeeded: true,
  });

  return { sent: true, skipped: false };
}

export async function reconcileVoiceIncidents(
  observations: VoiceIncidentObservation[],
  options?: { resolveMissing?: boolean; resolveKeys?: string[] },
) {
  const observedByKey = new Map(observations.map((observation) => [observation.incidentKey, observation]));
  const resolveKeys = options?.resolveKeys;
  const existingIncidents = await db.voiceIncident.findMany({
    where: {
      OR: [
        { status: "open" },
        { incidentKey: { in: observations.map((observation) => observation.incidentKey) } },
        ...(resolveKeys && resolveKeys.length > 0 ? [{ incidentKey: { in: resolveKeys } }] : []),
      ],
    },
  });

  const existingByKey = new Map(existingIncidents.map((incident) => [incident.incidentKey, incident]));
  const opened: string[] = [];
  const resolved: string[] = [];
  const resolveMissing = options?.resolveMissing ?? true;
  let warningIncidentsChanged = false;

  for (const observation of observations) {
    const existing = existingByKey.get(observation.incidentKey);
    const now = new Date();

    if (!existing) {
      await db.voiceIncident.create({
        data: {
          incidentKey: observation.incidentKey,
          surface: observation.surface,
          severity: observation.severity,
          status: "open",
          summary: observation.summary,
          details: toJson(observation.details),
          detectedAt: now,
          lastObservedAt: now,
          lastAlertedAt: now,
          alertCount: 1,
        },
      });
      if (isNonCriticalSeverity(observation.severity)) {
        warningIncidentsChanged = true;
      } else {
        await sendOpenAlert(observation);
      }
      opened.push(observation.incidentKey);
      continue;
    }

    const shouldAlert =
      !isNonCriticalSeverity(observation.severity) &&
      (existing.status !== "open" || isAlertDue(existing.lastAlertedAt));
    const nextAlertCount = shouldAlert ? existing.alertCount + 1 : existing.alertCount;

    await db.voiceIncident.update({
      where: { incidentKey: observation.incidentKey },
      data: {
        surface: observation.surface,
        severity: observation.severity,
        status: "open",
        summary: observation.summary,
        details: toJson(observation.details),
        detectedAt: existing.detectedAt,
        lastObservedAt: now,
        resolvedAt: null,
        lastAlertedAt: shouldAlert ? now : existing.lastAlertedAt,
        alertCount: nextAlertCount,
      },
    });

    if (shouldAlert) {
      await sendOpenAlert(observation);
    } else if (isNonCriticalSeverity(observation.severity)) {
      warningIncidentsChanged = true;
    }
  }

  if (resolveMissing) {
    for (const existing of existingIncidents) {
      if (!existing.incidentKey.startsWith("voice:")) continue;
      if (resolveKeys && resolveKeys.length > 0 && !resolveKeys.includes(existing.incidentKey)) continue;
      if (observedByKey.has(existing.incidentKey)) continue;
      if (existing.status !== "open") continue;

      const now = new Date();
      await db.voiceIncident.update({
        where: { incidentKey: existing.incidentKey },
        data: {
          status: "resolved",
          resolvedAt: now,
          lastObservedAt: now,
          lastRecoveryAlertedAt: now,
        },
      });
      if (isNonCriticalSeverity(existing.severity)) {
        warningIncidentsChanged = true;
      } else {
        await sendRecoveryAlert(existing);
      }
      resolved.push(existing.incidentKey);
    }
  }

  if (warningIncidentsChanged) {
    await maybeSendNonCriticalDigest();
  }

  return { opened, resolved };
}

export async function resolveVoiceIncidentByKey(incidentKey: string) {
  const incident = await db.voiceIncident.findUnique({ where: { incidentKey } });
  if (!incident || incident.status !== "open") {
    return { resolved: false };
  }

  const now = new Date();
  await db.voiceIncident.update({
    where: { incidentKey },
    data: {
      status: "resolved",
      resolvedAt: now,
      lastObservedAt: now,
      lastRecoveryAlertedAt: now,
    },
  });
  await sendRecoveryAlert(incident);

  return { resolved: true };
}
