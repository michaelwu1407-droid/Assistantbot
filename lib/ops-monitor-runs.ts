import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { RuntimeStatus } from "@/lib/voice-fleet";

export type OpsMonitorHealth = {
  monitorKey: string;
  status: RuntimeStatus;
  summary: string;
  warnings: string[];
  checkedAt: string;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  ageMs: number | null;
  staleAfterMs: number;
  details: Record<string, unknown> | null;
};

function toJson(details?: Record<string, unknown>) {
  return details ? (JSON.parse(JSON.stringify(details)) as Prisma.InputJsonValue) : Prisma.JsonNull;
}

function isJsonObject(value: Prisma.JsonValue | null | undefined): value is Prisma.JsonObject {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export async function recordMonitorRun(params: {
  monitorKey: string;
  status: RuntimeStatus;
  summary: string;
  details?: Record<string, unknown>;
  checkedAt?: Date;
  succeeded?: boolean;
}) {
  const checkedAt = params.checkedAt || new Date();
  const succeeded = params.succeeded ?? true;

  return db.opsMonitorRun.upsert({
    where: { monitorKey: params.monitorKey },
    create: {
      monitorKey: params.monitorKey,
      status: params.status,
      summary: params.summary,
      details: toJson(params.details),
      checkedAt,
      lastSuccessAt: succeeded ? checkedAt : null,
      lastFailureAt: succeeded ? null : checkedAt,
    },
    update: {
      status: params.status,
      summary: params.summary,
      details: toJson(params.details),
      checkedAt,
      lastSuccessAt: succeeded ? checkedAt : undefined,
      lastFailureAt: succeeded ? undefined : checkedAt,
    },
  });
}

export async function getMonitorRunHealth(monitorKey: string, staleAfterMs: number): Promise<OpsMonitorHealth> {
  const checkedAt = new Date().toISOString();
  const record = await db.opsMonitorRun.findUnique({ where: { monitorKey } });

  if (!record || !record.lastSuccessAt) {
    return {
      monitorKey,
      status: "unhealthy",
      summary: `No successful ${monitorKey} monitor run has been recorded.`,
      warnings: [`${monitorKey} has never reported a successful run.`],
      checkedAt,
      lastSuccessAt: record?.lastSuccessAt?.toISOString() || null,
      lastFailureAt: record?.lastFailureAt?.toISOString() || null,
      ageMs: null,
      staleAfterMs,
      details: record && isJsonObject(record.details) ? (record.details as Record<string, unknown>) : null,
    };
  }

  const ageMs = Date.now() - record.lastSuccessAt.getTime();
  const warnings: string[] = [];

  if (ageMs > staleAfterMs) {
    warnings.push(
      `${monitorKey} last succeeded ${Math.round(ageMs / 60_000)} minute(s) ago, beyond the ${Math.round(
        staleAfterMs / 60_000,
      )}-minute window.`,
    );
  }
  if (record.status !== "healthy") {
    warnings.push(`${monitorKey} last completed on schedule but reported status ${record.status}.`);
  }

  const status: RuntimeStatus =
    ageMs > staleAfterMs
      ? "unhealthy"
      : record.status === "unhealthy"
        ? "unhealthy"
        : record.status === "degraded"
          ? "degraded"
          : "healthy";

  return {
    monitorKey,
    status,
    summary:
      status === "healthy"
        ? `${monitorKey} is reporting on schedule`
        : record.status !== "healthy" && ageMs <= staleAfterMs
          ? `${monitorKey} is reporting on schedule but last reported ${record.status}`
          : warnings[0] || `${monitorKey} is not reporting healthy on schedule`,
    warnings,
    checkedAt,
    lastSuccessAt: record.lastSuccessAt.toISOString(),
    lastFailureAt: record.lastFailureAt?.toISOString() || null,
    ageMs,
    staleAfterMs,
    details: isJsonObject(record.details) ? (record.details as Record<string, unknown>) : null,
  };
}
