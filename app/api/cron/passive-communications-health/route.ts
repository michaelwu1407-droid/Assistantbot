import { NextRequest, NextResponse } from "next/server";
import { getUnauthorizedJsonResponse, isOpsAuthorized } from "@/lib/ops-auth";
import { recordMonitorRun } from "@/lib/ops-monitor-runs";
import { getPassiveProductionHealth } from "@/lib/passive-production-health";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isOpsAuthorized(req)) {
    return getUnauthorizedJsonResponse();
  }

  const checkedAt = new Date();

  try {
    const passiveProduction = await getPassiveProductionHealth();

    await recordMonitorRun({
      monitorKey: "passive-communications-health",
      status: passiveProduction.status,
      summary: passiveProduction.summary,
      details: {
        checkedAt: passiveProduction.checkedAt,
        voiceStatus: passiveProduction.voice.status,
        emailStatus: passiveProduction.email.status,
        activeWorkspaceCount: passiveProduction.activeWorkspaceCount,
        unhealthyActiveWorkspaceCount: passiveProduction.unhealthyActiveWorkspaceCount,
        unknownWorkspaceCount: passiveProduction.unknownWorkspaceCount,
      },
      checkedAt,
      succeeded: true,
    });

    return NextResponse.json(passiveProduction, {
      status: passiveProduction.status === "unhealthy" ? 500 : 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown passive communications monitor failure";
    await recordMonitorRun({
      monitorKey: "passive-communications-health",
      status: "unhealthy",
      summary: `Passive communications monitor crashed: ${message}`,
      details: {
        checkedAt: checkedAt.toISOString(),
        error: message,
      },
      checkedAt,
      succeeded: false,
    }).catch(() => null);

    return NextResponse.json(
      {
        error: "Passive communications monitor failed",
        details: message,
        checkedAt: checkedAt.toISOString(),
      },
      { status: 500 },
    );
  }
}
