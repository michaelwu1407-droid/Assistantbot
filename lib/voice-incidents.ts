import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { dispatchVoiceIncidentNotifications } from "@/lib/voice-incident-alert";
import type { VoiceSurface } from "@/lib/voice-fleet";

export type VoiceIncidentObservation = {
  incidentKey: string;
  surface: VoiceSurface | "routing" | "fleet";
  severity: "warning" | "critical";
  summary: string;
  details?: Record<string, unknown>;
};

const INCIDENT_ALERT_COOLDOWN_MS = 10 * 60_000;

function toJson(details?: Record<string, unknown>) {
  return details ? (JSON.parse(JSON.stringify(details)) as Prisma.InputJsonValue) : Prisma.JsonNull;
}

function isAlertDue(date: Date | null | undefined) {
  if (!date) return true;
  return Date.now() - date.getTime() >= INCIDENT_ALERT_COOLDOWN_MS;
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
  });
}

export async function reconcileVoiceIncidents(
  observations: VoiceIncidentObservation[],
  options?: { resolveMissing?: boolean },
) {
  const observedByKey = new Map(observations.map((observation) => [observation.incidentKey, observation]));
  const existingIncidents = await db.voiceIncident.findMany({
    where: {
      OR: [
        { status: "open" },
        { incidentKey: { in: observations.map((observation) => observation.incidentKey) } },
      ],
    },
  });

  const existingByKey = new Map(existingIncidents.map((incident) => [incident.incidentKey, incident]));
  const opened: string[] = [];
  const resolved: string[] = [];
  const resolveMissing = options?.resolveMissing ?? true;

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
      await sendOpenAlert(observation);
      opened.push(observation.incidentKey);
      continue;
    }

    const shouldAlert = existing.status !== "open" || isAlertDue(existing.lastAlertedAt);
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
    }
  }

  if (resolveMissing) {
    for (const existing of existingIncidents) {
      if (!existing.incidentKey.startsWith("voice:")) continue;
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
      await sendRecoveryAlert(existing);
      resolved.push(existing.incidentKey);
    }
  }

  return { opened, resolved };
}
