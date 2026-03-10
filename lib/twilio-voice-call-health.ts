import { db } from "@/lib/db";
import { getWorkspaceTwilioClient, twilioMasterClient } from "@/lib/twilio";
import type { RuntimeStatus, VoiceSurface } from "@/lib/voice-fleet";

export type VoiceCallSummary = {
  sid: string;
  scopeId: string;
  label: string;
  surface: VoiceSurface;
  from: string | null;
  to: string | null;
  direction: string | null;
  status: string | null;
  startTime: string | null;
  endTime: string | null;
};

export type VoiceCallScopeHealth = {
  scopeId: string;
  label: string;
  surface: VoiceSurface;
  status: RuntimeStatus;
  summary: string;
  warnings: string[];
  recentCalls: VoiceCallSummary[];
  failingCalls: VoiceCallSummary[];
};

export type TwilioVoiceCallHealth = {
  status: RuntimeStatus;
  summary: string;
  warnings: string[];
  lookbackMinutes: number;
  scopes: VoiceCallScopeHealth[];
  failingCalls: VoiceCallSummary[];
};

const FAILURE_STATUSES = new Set(["failed", "no-answer", "busy", "canceled"]);

function isRelevantVoiceCall(call: {
  direction?: string | null;
  to?: string | null;
}) {
  const direction = (call.direction || "").toLowerCase();
  const to = (call.to || "").toLowerCase();

  return direction === "trunking-originating" || to.includes("@live.earlymark.ai");
}

function summarizeCall(
  scopeId: string,
  label: string,
  surface: VoiceSurface,
  call: {
    sid: string;
    from: string | null;
    to: string | null;
    direction: string | null;
    status: string | null;
    startTime?: Date | null;
    endTime?: Date | null;
  },
) {
  return {
    sid: call.sid,
    scopeId,
    label,
    surface,
    from: call.from || null,
    to: call.to || null,
    direction: call.direction || null,
    status: call.status || null,
    startTime: call.startTime?.toISOString?.() || null,
    endTime: call.endTime?.toISOString?.() || null,
  } satisfies VoiceCallSummary;
}

function maxStatus(left: RuntimeStatus, right: RuntimeStatus): RuntimeStatus {
  const order: RuntimeStatus[] = ["healthy", "degraded", "unhealthy"];
  return order[Math.max(order.indexOf(left), order.indexOf(right))];
}

async function inspectCallScope(params: {
  scopeId: string;
  label: string;
  surface: VoiceSurface;
  client: NonNullable<ReturnType<typeof getWorkspaceTwilioClient>> | typeof twilioMasterClient;
  lookbackMinutes: number;
  limit: number;
}): Promise<VoiceCallScopeHealth> {
  const since = Date.now() - params.lookbackMinutes * 60_000;
  const calls = await params.client!.calls.list({ limit: params.limit });
  const recentCalls = calls
    .filter((call) => isRelevantVoiceCall(call))
    .filter((call) => {
      const startedAt = call.startTime?.getTime() || call.dateCreated?.getTime() || 0;
      return startedAt >= since;
    })
    .map((call) => summarizeCall(params.scopeId, params.label, params.surface, call));

  const failingCalls = recentCalls.filter((call) => FAILURE_STATUSES.has((call.status || "").toLowerCase()));
  const latestCall = recentCalls[0];
  const warnings: string[] = [];

  if (failingCalls.length > 0) {
    warnings.push(`${failingCalls.length} recent call(s) ended as failed/no-answer/busy/canceled.`);
  }
  if (latestCall && FAILURE_STATUSES.has((latestCall.status || "").toLowerCase())) {
    warnings.push(`Latest call ended with status ${latestCall.status}.`);
  }

  const status: RuntimeStatus =
    recentCalls.length === 0
      ? "healthy"
      : failingCalls.length === 0
        ? "healthy"
        : recentCalls.every((call) => FAILURE_STATUSES.has((call.status || "").toLowerCase()))
          ? "unhealthy"
          : FAILURE_STATUSES.has((latestCall?.status || "").toLowerCase())
            ? "unhealthy"
            : "degraded";

  return {
    scopeId: params.scopeId,
    label: params.label,
    surface: params.surface,
    status,
    summary:
      status === "healthy"
        ? recentCalls.length === 0
          ? `No recent ${params.surface} calls were observed`
          : `Recent ${params.surface} calls completed successfully`
        : warnings[0] || `Recent ${params.surface} call failures detected`,
    warnings,
    recentCalls,
    failingCalls,
  };
}

export async function getTwilioVoiceCallHealth(options?: {
  lookbackMinutes?: number;
  limitPerAccount?: number;
}): Promise<TwilioVoiceCallHealth> {
  const lookbackMinutes = options?.lookbackMinutes ?? 15;
  const limitPerAccount = options?.limitPerAccount ?? 30;
  const warnings: string[] = [];
  const scopes: VoiceCallScopeHealth[] = [];

  if (!twilioMasterClient) {
    return {
      status: "unhealthy",
      summary: "Twilio master client is unavailable",
      warnings: ["TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required to inspect recent voice failures."],
      lookbackMinutes,
      scopes,
      failingCalls: [],
    };
  }

  scopes.push(
    await inspectCallScope({
      scopeId: "earlymark",
      label: "Earlymark inbound",
      surface: "inbound_demo",
      client: twilioMasterClient,
      lookbackMinutes,
      limit: limitPerAccount,
    }),
  );

  const workspaces = await db.workspace.findMany({
    where: { twilioPhoneNumber: { not: null } },
    select: {
      id: true,
      name: true,
      twilioPhoneNumber: true,
      twilioSubaccountId: true,
      twilioSubaccountAuthToken: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  for (const workspace of workspaces) {
    try {
      const client = getWorkspaceTwilioClient(workspace);
      if (!client) {
        warnings.push(`Workspace ${workspace.name} has no usable Twilio client.`);
        continue;
      }

      scopes.push(
        await inspectCallScope({
          scopeId: workspace.id,
          label: workspace.name,
          surface: "normal",
          client,
          lookbackMinutes,
          limit: limitPerAccount,
        }),
      );
    } catch (error) {
      warnings.push(
        `Failed to inspect recent calls for workspace ${workspace.name}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  const failingCalls = scopes.flatMap((scope) => scope.failingCalls);
  const status = scopes.reduce<RuntimeStatus>((current, scope) => maxStatus(current, scope.status), "healthy");

  return {
    status,
    summary:
      status === "healthy"
        ? "Recent Twilio voice call activity looks healthy across Tracey surfaces"
        : scopes.find((scope) => scope.status !== "healthy")?.summary || warnings[0] || "Recent Twilio voice call failures detected",
    warnings: [...warnings, ...scopes.filter((scope) => scope.status !== "healthy").map((scope) => scope.summary)],
    lookbackMinutes,
    scopes,
    failingCalls,
  };
}
