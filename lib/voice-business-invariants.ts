import { db } from "@/lib/db";
import type { TwilioVoiceRoutingDrift, VoiceNumberDriftRecord } from "@/lib/twilio-drift";
import type { RuntimeStatus } from "@/lib/voice-fleet";

export type VoiceBusinessInvariantIssue = {
  incidentKey: "voice:data:missing-critical-mapping";
  severity: "warning" | "critical";
  summary: string;
  details: Record<string, unknown>;
};

export type VoiceBusinessInvariantHealth = {
  status: RuntimeStatus;
  summary: string;
  warnings: string[];
  checkedAt: string;
  workspaceCount: number;
  userCount: number;
  managedNumberCount: number;
  orphanedNumbers: VoiceNumberDriftRecord[];
  criticalEarlymarkNumbers: VoiceNumberDriftRecord[];
  issues: VoiceBusinessInvariantIssue[];
};

function buildMissingMappingIssue(params: {
  workspaceCount: number;
  userCount: number;
  managedNumberCount: number;
  criticalEarlymarkNumbers: VoiceNumberDriftRecord[];
}): VoiceBusinessInvariantIssue {
  return {
    incidentKey: "voice:data:missing-critical-mapping",
    severity: "critical",
    summary:
      params.workspaceCount === 0 || params.userCount === 0
        ? `Voice numbers still exist on Twilio, but production data is missing (${params.workspaceCount} workspace(s), ${params.userCount} user(s)).`
        : `Critical voice routing metadata is incomplete for ${params.criticalEarlymarkNumbers.length} Earlymark number(s).`,
    details: {
      workspaceCount: params.workspaceCount,
      userCount: params.userCount,
      managedNumberCount: params.managedNumberCount,
      criticalEarlymarkNumbers: params.criticalEarlymarkNumbers,
    },
  };
}

export async function getVoiceBusinessInvariantHealth(
  twilioRouting: TwilioVoiceRoutingDrift,
): Promise<VoiceBusinessInvariantHealth> {
  const checkedAt = new Date().toISOString();
  const [workspaceCount, userCount] = await Promise.all([
    db.workspace.count(),
    db.user.count(),
  ]);

  const warnings: string[] = [];
  const issues: VoiceBusinessInvariantIssue[] = [];
  const orphanedNumbers = twilioRouting.orphanedNumbers;
  const criticalEarlymarkNumbers = twilioRouting.numbers.filter(
    (record) => record.scope === "earlymark" && record.warnings.length > 0,
  );

  if (orphanedNumbers.length > 0) {
    warnings.push(`${orphanedNumbers.length} managed customer number(s) are orphaned from workspace data.`);
  }

  if (twilioRouting.managedNumberCount > 0 && (workspaceCount === 0 || userCount === 0)) {
    issues.push(
      buildMissingMappingIssue({
        workspaceCount,
        userCount,
        managedNumberCount: twilioRouting.managedNumberCount,
        criticalEarlymarkNumbers,
      }),
    );
    warnings.push(
      `Production data is missing while ${twilioRouting.managedNumberCount} managed Twilio number(s) still exist.`,
    );
  } else if (criticalEarlymarkNumbers.length > 0) {
    issues.push(
      buildMissingMappingIssue({
        workspaceCount,
        userCount,
        managedNumberCount: twilioRouting.managedNumberCount,
        criticalEarlymarkNumbers,
      }),
    );
    warnings.push(
      `${criticalEarlymarkNumbers.length} critical Earlymark inbound number(s) are missing required gateway metadata.`,
    );
  }

  const status: RuntimeStatus = issues.length > 0 || orphanedNumbers.length > 0 ? "unhealthy" : "healthy";

  return {
    status,
    summary:
      status === "healthy"
        ? "Voice routing business invariants are intact"
        : warnings[0] || "Voice routing business invariants are broken",
    warnings,
    checkedAt,
    workspaceCount,
    userCount,
    managedNumberCount: twilioRouting.managedNumberCount,
    orphanedNumbers,
    criticalEarlymarkNumbers,
    issues,
  };
}
