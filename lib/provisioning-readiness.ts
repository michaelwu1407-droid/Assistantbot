import { db } from "@/lib/db";
import type { RuntimeStatus } from "@/lib/voice-fleet";

type WorkspaceProvisioningStatus =
  | "not_requested"
  | "requested"
  | "provisioning"
  | "provisioned"
  | "failed"
  | "blocked_duplicate"
  | "already_provisioned"
  | "untracked";

export type ProvisioningReadinessIssue = {
  workspaceId: string;
  workspaceName: string;
  provisioningStatus: WorkspaceProvisioningStatus;
  updatedAt: string;
  error: string | null;
  stageReached: string | null;
  mode: string | null;
  errorCode: number | null;
  bundleSid: string | null;
  subaccountSid: string | null;
};

export type ProvisioningReadiness = {
  status: RuntimeStatus;
  summary: string;
  warnings: string[];
  counts: Record<WorkspaceProvisioningStatus, number>;
  pendingCount: number;
  failedCount: number;
  issueCount: number;
  recentIssues: ProvisioningReadinessIssue[];
};

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function deriveProvisioningStatus(
  settings: Record<string, unknown>,
  twilioPhoneNumber: string | null,
): WorkspaceProvisioningStatus {
  const rawStatus = readString(settings.onboardingProvisioningStatus);

  if (
    rawStatus === "not_requested" ||
    rawStatus === "requested" ||
    rawStatus === "provisioning" ||
    rawStatus === "provisioned" ||
    rawStatus === "failed" ||
    rawStatus === "blocked_duplicate" ||
    rawStatus === "already_provisioned"
  ) {
    return rawStatus;
  }

  if (twilioPhoneNumber) return "provisioned";
  if (settings.provisionPhoneNumberRequested === true) return "requested";
  return "untracked";
}

function buildIssue(row: {
  id: string;
  name: string;
  updatedAt: Date;
  twilioPhoneNumber: string | null;
  settings: unknown;
}): ProvisioningReadinessIssue | null {
  const settings = asObject(row.settings);
  const provisioningStatus = deriveProvisioningStatus(settings, row.twilioPhoneNumber);
  if (!["requested", "provisioning", "failed", "blocked_duplicate"].includes(provisioningStatus)) {
    return null;
  }

  return {
    workspaceId: row.id,
    workspaceName: row.name,
    provisioningStatus,
    updatedAt: readString(settings.onboardingProvisioningUpdatedAt) || row.updatedAt.toISOString(),
    error: readString(settings.onboardingProvisioningError),
    stageReached: readString(settings.onboardingProvisioningStageReached),
    mode: readString(settings.onboardingProvisioningMode),
    errorCode: readNumber(settings.onboardingProvisioningErrorCode),
    bundleSid: readString(settings.onboardingProvisioningBundleSid),
    subaccountSid: readString(settings.onboardingProvisioningSubaccountSid),
  };
}

export async function getProvisioningReadinessSummary(options?: {
  issueLimit?: number;
}): Promise<ProvisioningReadiness> {
  const issueLimit = options?.issueLimit ?? 8;
  const workspaces = await db.workspace.findMany({
    select: {
      id: true,
      name: true,
      twilioPhoneNumber: true,
      updatedAt: true,
      settings: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const counts: ProvisioningReadiness["counts"] = {
    not_requested: 0,
    requested: 0,
    provisioning: 0,
    provisioned: 0,
    failed: 0,
    blocked_duplicate: 0,
    already_provisioned: 0,
    untracked: 0,
  };

  const issues = workspaces
    .map((workspace) => {
      const settings = asObject(workspace.settings);
      const provisioningStatus = deriveProvisioningStatus(settings, workspace.twilioPhoneNumber);
      counts[provisioningStatus] += 1;
      return buildIssue(workspace);
    })
    .filter((issue): issue is ProvisioningReadinessIssue => Boolean(issue))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  const pendingCount = counts.requested + counts.provisioning;
  const failedCount = counts.failed;
  const issueCount = issues.length;
  const warnings: string[] = [];

  if (failedCount > 0) {
    warnings.push(`${failedCount} workspace(s) currently have failed phone provisioning.`);
  }
  if (pendingCount > 0) {
    warnings.push(`${pendingCount} workspace(s) are still waiting on provisioning to finish.`);
  }
  if (counts.blocked_duplicate > 0) {
    warnings.push(`${counts.blocked_duplicate} workspace(s) are blocked by duplicate beta provisioning safeguards.`);
  }

  const status: RuntimeStatus =
    failedCount > 0
      ? "unhealthy"
      : pendingCount > 0 || counts.blocked_duplicate > 0
        ? "degraded"
        : "healthy";

  return {
    status,
    summary:
      status === "healthy"
        ? "Workspace Twilio provisioning is stable across tracked workspaces."
        : warnings[0] || "Workspace Twilio provisioning is degraded.",
    warnings,
    counts,
    pendingCount,
    failedCount,
    issueCount,
    recentIssues: issues.slice(0, issueLimit),
  };
}
