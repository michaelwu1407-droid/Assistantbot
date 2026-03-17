import { db } from "@/lib/db";
import { getTwilioVoiceCallHealth, type VoiceCallScopeHealth } from "@/lib/twilio-voice-call-health";
import type { RuntimeStatus } from "@/lib/voice-fleet";

const RECENT_SIGNAL_LOOKBACK_DAYS = 7;
const ACTIVE_WORKSPACE_LOOKBACK_DAYS = 14;
const RECENT_EMAIL_FAILURE_LOOKBACK_HOURS = 24;
const RECENT_TWILIO_FAILURE_LOOKBACK_MINUTES = 6 * 60;
const RECENT_EMAIL_EVENT_LIMIT = 2_000;

type StatusSummary = {
  status: RuntimeStatus;
  summary: string;
  warnings: string[];
};

export type PassiveSignalClassification = "healthy" | "unknown" | "failure" | "not_configured";

export type PassiveChannelHealth = StatusSummary & {
  classification: PassiveSignalClassification;
  configured: boolean;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  recentSuccessCount: number;
  recentFailureCount: number;
};

export type PassiveWorkspaceProductionHealth = {
  workspaceId: string;
  workspaceName: string;
  isActiveWorkspace: boolean;
  contributesToGlobalRollup: boolean;
  overallStatus: RuntimeStatus;
  overallClassification: Exclude<PassiveSignalClassification, "not_configured">;
  summary: string;
  warnings: string[];
  voice: PassiveChannelHealth;
  email: PassiveChannelHealth;
};

export type PassiveProductionHealth = StatusSummary & {
  checkedAt: string;
  signalLookbackDays: number;
  activeWorkspaceLookbackDays: number;
  recentTwilioFailureLookbackMinutes: number;
  recentEmailFailureLookbackHours: number;
  voice: StatusSummary & {
    earlymark: PassiveChannelHealth;
    activeWorkspaceCount: number;
    failureWorkspaceCount: number;
    unknownWorkspaceCount: number;
  };
  email: StatusSummary & {
    activeWorkspaceCount: number;
    failureWorkspaceCount: number;
    unknownWorkspaceCount: number;
    recentInboundEmailSuccessCount: number;
    recentInboundEmailFailureCount: number;
  };
  activeWorkspaceCount: number;
  unhealthyActiveWorkspaceCount: number;
  unknownWorkspaceCount: number;
  workspaceRows: PassiveWorkspaceProductionHealth[];
};

function maxStatus(left: RuntimeStatus, right: RuntimeStatus): RuntimeStatus {
  const order: RuntimeStatus[] = ["healthy", "degraded", "unhealthy"];
  return order[Math.max(order.indexOf(left), order.indexOf(right))];
}

function summarizeStatus(status: RuntimeStatus, warnings: string[], healthySummary: string) {
  return status === "healthy" ? healthySummary : warnings[0] || healthySummary;
}

function isRecent(date: Date | null | undefined, lookbackMs: number) {
  return Boolean(date && date.getTime() >= Date.now() - lookbackMs);
}

function toIso(date: Date | null | undefined) {
  return date?.toISOString() || null;
}

function extractWorkspaceId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const workspaceId = (payload as Record<string, unknown>).workspaceId;
  return typeof workspaceId === "string" && workspaceId.trim() ? workspaceId.trim() : null;
}

function buildHealthyChannel(
  summary: string,
  lastSuccessAt: Date | null,
  recentSuccessCount: number,
  warnings: string[] = [],
): PassiveChannelHealth {
  return {
    status: "healthy",
    classification: "healthy",
    summary,
    warnings,
    configured: true,
    lastSuccessAt: toIso(lastSuccessAt),
    lastFailureAt: null,
    recentSuccessCount,
    recentFailureCount: 0,
  };
}

function buildUnknownChannel(
  summary: string,
  lastSuccessAt: Date | null,
  warnings: string[] = [],
): PassiveChannelHealth {
  return {
    status: "degraded",
    classification: "unknown",
    summary,
    warnings,
    configured: true,
    lastSuccessAt: toIso(lastSuccessAt),
    lastFailureAt: null,
    recentSuccessCount: 0,
    recentFailureCount: 0,
  };
}

function buildFailureChannel(
  summary: string,
  lastSuccessAt: Date | null,
  lastFailureAt: Date | null,
  warnings: string[] = [],
  recentSuccessCount = 0,
  recentFailureCount = 1,
): PassiveChannelHealth {
  return {
    status: "unhealthy",
    classification: "failure",
    summary,
    warnings,
    configured: true,
    lastSuccessAt: toIso(lastSuccessAt),
    lastFailureAt: toIso(lastFailureAt),
    recentSuccessCount,
    recentFailureCount,
  };
}

function buildNotConfiguredChannel(summary: string): PassiveChannelHealth {
  return {
    status: "healthy",
    classification: "not_configured",
    summary,
    warnings: [],
    configured: false,
    lastSuccessAt: null,
    lastFailureAt: null,
    recentSuccessCount: 0,
    recentFailureCount: 0,
  };
}

function buildWorkspaceOverallStatus(params: {
  voice: PassiveChannelHealth;
  email: PassiveChannelHealth;
}): Pick<PassiveWorkspaceProductionHealth, "overallStatus" | "overallClassification" | "summary" | "warnings"> {
  const warnings = Array.from(new Set([...params.voice.warnings, ...params.email.warnings].filter(Boolean)));
  const classifications = [params.voice.classification, params.email.classification];

  if (classifications.includes("failure")) {
    return {
      overallStatus: "unhealthy",
      overallClassification: "failure",
      summary: warnings[0] || "This workspace has real recent communications failures.",
      warnings,
    };
  }

  if (classifications.includes("unknown")) {
    return {
      overallStatus: "degraded",
      overallClassification: "unknown",
      summary: warnings[0] || "This workspace has no recent real traffic proving one or more channels are working.",
      warnings,
    };
  }

  return {
    overallStatus: "healthy",
    overallClassification: "healthy",
    summary: "Recent real traffic confirms the monitored workspace channels are working.",
    warnings,
  };
}

function getScopeFailureTime(scope: VoiceCallScopeHealth | null): Date | null {
  const latestFailingCall = scope?.failingCalls[0];
  const failureTime = latestFailingCall?.startTime || latestFailingCall?.endTime || null;
  return failureTime ? new Date(failureTime) : null;
}

export async function getPassiveProductionHealth(): Promise<PassiveProductionHealth> {
  const checkedAt = new Date();
  const recentSignalLookbackMs = RECENT_SIGNAL_LOOKBACK_DAYS * 24 * 60 * 60 * 1_000;
  const activeWorkspaceLookbackMs = ACTIVE_WORKSPACE_LOOKBACK_DAYS * 24 * 60 * 60 * 1_000;
  const recentEmailFailureLookbackMs = RECENT_EMAIL_FAILURE_LOOKBACK_HOURS * 60 * 60 * 1_000;

  const [workspaces, voiceCalls, inboundEmailEvents, twilioVoiceCallHealth] = await Promise.all([
    db.workspace.findMany({
      select: {
        id: true,
        name: true,
        voiceEnabled: true,
        twilioPhoneNumber: true,
        inboundEmail: true,
        inboundEmailAlias: true,
      },
      orderBy: { name: "asc" },
    }),
    db.voiceCall.findMany({
      where: {
        startedAt: {
          gte: new Date(Date.now() - activeWorkspaceLookbackMs),
        },
        callType: { in: ["inbound_demo", "normal"] },
      },
      select: {
        workspaceId: true,
        callType: true,
        startedAt: true,
      },
      orderBy: { startedAt: "desc" },
    }),
    db.webhookEvent.findMany({
      where: {
        provider: "resend",
        eventType: "email.received",
        createdAt: {
          gte: new Date(Date.now() - activeWorkspaceLookbackMs),
        },
      },
      select: {
        status: true,
        createdAt: true,
        payload: true,
      },
      orderBy: { createdAt: "desc" },
      take: RECENT_EMAIL_EVENT_LIMIT,
    }),
    getTwilioVoiceCallHealth({
      lookbackMinutes: RECENT_TWILIO_FAILURE_LOOKBACK_MINUTES,
      limitPerAccount: 20,
    }),
  ]);

  const recentVoiceSuccessCountByWorkspace = new Map<string, number>();
  const lastVoiceSuccessAtByWorkspace = new Map<string, Date>();
  let earlymarkVoiceSuccessCount = 0;
  let earlymarkLastVoiceSuccessAt: Date | null = null;

  for (const call of voiceCalls) {
    if (call.workspaceId) {
      recentVoiceSuccessCountByWorkspace.set(
        call.workspaceId,
        (recentVoiceSuccessCountByWorkspace.get(call.workspaceId) || 0) + 1,
      );
      if (!lastVoiceSuccessAtByWorkspace.has(call.workspaceId)) {
        lastVoiceSuccessAtByWorkspace.set(call.workspaceId, call.startedAt);
      }
      continue;
    }

    if (call.callType === "inbound_demo") {
      earlymarkVoiceSuccessCount += 1;
      if (!earlymarkLastVoiceSuccessAt) {
        earlymarkLastVoiceSuccessAt = call.startedAt;
      }
    }
  }

  const recentEmailSuccessCountByWorkspace = new Map<string, number>();
  const lastInboundEmailSuccessAtByWorkspace = new Map<string, Date>();
  let recentInboundEmailSuccessCount = 0;
  let recentInboundEmailFailureCount = 0;
  let lastGlobalInboundEmailFailureAt: Date | null = null;

  for (const event of inboundEmailEvents) {
    const workspaceId = extractWorkspaceId(event.payload);

    if (event.status === "success") {
      recentInboundEmailSuccessCount += 1;
      if (workspaceId) {
        recentEmailSuccessCountByWorkspace.set(
          workspaceId,
          (recentEmailSuccessCountByWorkspace.get(workspaceId) || 0) + 1,
        );
        if (!lastInboundEmailSuccessAtByWorkspace.has(workspaceId)) {
          lastInboundEmailSuccessAtByWorkspace.set(workspaceId, event.createdAt);
        }
      }
      continue;
    }

    if (!isRecent(event.createdAt, recentEmailFailureLookbackMs)) {
      continue;
    }

    if (!workspaceId) {
      recentInboundEmailFailureCount += 1;
      if (!lastGlobalInboundEmailFailureAt) {
        lastGlobalInboundEmailFailureAt = event.createdAt;
      }
    }
  }

  const twilioScopeById = new Map<string, VoiceCallScopeHealth>(
    twilioVoiceCallHealth.scopes.map((scope) => [scope.scopeId, scope]),
  );

  const workspaceRows = workspaces.map<PassiveWorkspaceProductionHealth>((workspace) => {
    const lastVoiceSuccessAt = lastVoiceSuccessAtByWorkspace.get(workspace.id) || null;
    const lastInboundEmailSuccessAt = lastInboundEmailSuccessAtByWorkspace.get(workspace.id) || null;
    const isActiveWorkspace =
      isRecent(lastVoiceSuccessAt, activeWorkspaceLookbackMs) ||
      isRecent(lastInboundEmailSuccessAt, activeWorkspaceLookbackMs);
    const voiceConfigured = Boolean(workspace.voiceEnabled && workspace.twilioPhoneNumber);
    const emailConfigured = Boolean(workspace.inboundEmail || workspace.inboundEmailAlias);
    const twilioScope = twilioScopeById.get(workspace.id) || null;

    const voice =
      !voiceConfigured
        ? buildNotConfiguredChannel("Voice is not configured for this workspace.")
        : twilioScope?.status === "unhealthy"
          ? buildFailureChannel(
              twilioScope.summary,
              lastVoiceSuccessAt,
              getScopeFailureTime(twilioScope),
              twilioScope.warnings,
              recentVoiceSuccessCountByWorkspace.get(workspace.id) || 0,
              twilioScope.failingCalls.length,
            )
          : isRecent(lastVoiceSuccessAt, recentSignalLookbackMs)
            ? buildHealthyChannel(
                "Recent persisted customer voice traffic confirms the path is working.",
                lastVoiceSuccessAt,
                recentVoiceSuccessCountByWorkspace.get(workspace.id) || 0,
                twilioScope?.status === "degraded" ? twilioScope.warnings : [],
              )
            : buildUnknownChannel(
                "No recent persisted customer voice calls were observed for this workspace.",
                lastVoiceSuccessAt,
                twilioScope?.status === "degraded" ? twilioScope.warnings : [],
              );

    const email =
      !emailConfigured
        ? buildNotConfiguredChannel("Inbound email is not configured for this workspace.")
        : isRecent(lastInboundEmailSuccessAt, recentSignalLookbackMs)
          ? buildHealthyChannel(
              "Recent inbound emails were received and processed successfully.",
              lastInboundEmailSuccessAt,
              recentEmailSuccessCountByWorkspace.get(workspace.id) || 0,
            )
          : buildUnknownChannel(
              "No recent successful inbound emails were observed for this workspace.",
              lastInboundEmailSuccessAt,
            );

    const overall = buildWorkspaceOverallStatus({ voice, email });

    return {
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      isActiveWorkspace,
      contributesToGlobalRollup: isActiveWorkspace && overall.overallClassification === "failure",
      overallStatus: overall.overallStatus,
      overallClassification: overall.overallClassification,
      summary: overall.summary,
      warnings: overall.warnings,
      voice,
      email,
    };
  });

  const activeWorkspaceRows = workspaceRows.filter((row) => row.isActiveWorkspace);
  const activeVoiceFailureRows = activeWorkspaceRows.filter((row) => row.voice.classification === "failure");
  const unknownVoiceRows = workspaceRows.filter((row) => row.voice.classification === "unknown");
  const activeEmailFailureRows = activeWorkspaceRows.filter((row) => row.email.classification === "failure");
  const unknownEmailRows = workspaceRows.filter((row) => row.email.classification === "unknown");

  const earlymarkScope = twilioScopeById.get("earlymark") || null;
  const earlymark =
    earlymarkScope?.status === "unhealthy"
      ? buildFailureChannel(
          earlymarkScope.summary,
          earlymarkLastVoiceSuccessAt,
          getScopeFailureTime(earlymarkScope),
          earlymarkScope.warnings,
          earlymarkVoiceSuccessCount,
          earlymarkScope.failingCalls.length,
        )
      : isRecent(earlymarkLastVoiceSuccessAt, recentSignalLookbackMs)
        ? buildHealthyChannel(
            "Recent persisted Earlymark inbound voice traffic confirms the path is working.",
            earlymarkLastVoiceSuccessAt,
            earlymarkVoiceSuccessCount,
            earlymarkScope?.status === "degraded" ? earlymarkScope.warnings : [],
          )
        : buildUnknownChannel(
            "No recent persisted Earlymark inbound voice calls were observed.",
            earlymarkLastVoiceSuccessAt,
            earlymarkScope?.status === "degraded" ? earlymarkScope.warnings : [],
          );

  const voiceWarnings = Array.from(
    new Set([
      ...earlymark.warnings,
      activeVoiceFailureRows.length > 0
        ? `${activeVoiceFailureRows.length} active customer workspace(s) have real recent voice failure signals.`
        : "",
    ].filter(Boolean)),
  );
  const voiceStatus: RuntimeStatus =
    earlymark.classification === "failure" || activeVoiceFailureRows.length > 0
      ? "unhealthy"
      : earlymark.classification === "unknown"
        ? "degraded"
        : "healthy";

  const emailWarnings = Array.from(
    new Set([
      recentInboundEmailFailureCount > 0
        ? `${recentInboundEmailFailureCount} recent inbound email processing failure event(s) were observed without a scoped workspace success signal.`
        : "",
      activeEmailFailureRows.length > 0
        ? `${activeEmailFailureRows.length} active customer workspace(s) have real recent inbound email failure signals.`
        : "",
    ].filter(Boolean)),
  );
  const emailStatus: RuntimeStatus =
    recentInboundEmailFailureCount > 0 || activeEmailFailureRows.length > 0 ? "unhealthy" : "healthy";

  const overallStatus = [voiceStatus, emailStatus].reduce<RuntimeStatus>(
    (current, candidate) => maxStatus(current, candidate),
    "healthy",
  );
  const warnings = Array.from(new Set([...voiceWarnings, ...emailWarnings]));

  return {
    status: overallStatus,
    summary: summarizeStatus(
      overallStatus,
      warnings,
      "Passive production health looks healthy across Earlymark and active customer workspaces.",
    ),
    warnings,
    checkedAt: checkedAt.toISOString(),
    signalLookbackDays: RECENT_SIGNAL_LOOKBACK_DAYS,
    activeWorkspaceLookbackDays: ACTIVE_WORKSPACE_LOOKBACK_DAYS,
    recentTwilioFailureLookbackMinutes: RECENT_TWILIO_FAILURE_LOOKBACK_MINUTES,
    recentEmailFailureLookbackHours: RECENT_EMAIL_FAILURE_LOOKBACK_HOURS,
    voice: {
      status: voiceStatus,
      summary: summarizeStatus(
        voiceStatus,
        voiceWarnings,
        "Real voice traffic confirms Earlymark and active customer workspaces are healthy.",
      ),
      warnings: voiceWarnings,
      earlymark,
      activeWorkspaceCount: activeWorkspaceRows.length,
      failureWorkspaceCount: activeVoiceFailureRows.length,
      unknownWorkspaceCount: unknownVoiceRows.length,
    },
    email: {
      status: emailStatus,
      summary: summarizeStatus(
        emailStatus,
        emailWarnings,
        "No recent real inbound email failure signals were observed.",
      ),
      warnings: emailWarnings,
      activeWorkspaceCount: activeWorkspaceRows.filter((row) => row.email.configured).length,
      failureWorkspaceCount: activeEmailFailureRows.length,
      unknownWorkspaceCount: unknownEmailRows.length,
      recentInboundEmailSuccessCount,
      recentInboundEmailFailureCount,
    },
    activeWorkspaceCount: activeWorkspaceRows.length,
    unhealthyActiveWorkspaceCount: activeWorkspaceRows.filter((row) => row.overallClassification === "failure").length,
    unknownWorkspaceCount: workspaceRows.filter((row) => row.overallClassification === "unknown").length,
    workspaceRows: workspaceRows.sort((left, right) => {
      const statusOrder: RuntimeStatus[] = ["unhealthy", "degraded", "healthy"];
      const statusDelta = statusOrder.indexOf(left.overallStatus) - statusOrder.indexOf(right.overallStatus);
      if (statusDelta !== 0) return statusDelta;
      return left.workspaceName.localeCompare(right.workspaceName);
    }),
  };
}
