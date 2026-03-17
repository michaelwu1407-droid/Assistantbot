import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureWorkspaceProvisioned } from "@/lib/onboarding-provision";
import { getUnauthorizedJsonResponse, isOpsAuthorized } from "@/lib/ops-auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isOpsAuthorized(req)) {
    return getUnauthorizedJsonResponse();
  }

  const body = await req.json().catch(() => ({}));
  const workspaceId = typeof body?.workspaceId === "string" ? body.workspaceId : "";
  if (!workspaceId) {
    return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 });
  }

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      name: true,
      ownerId: true,
    },
  });

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const businessName = workspace.name || "Business";
  const ownerPhone = workspace.ownerId
    ? (await db.user.findUnique({
        where: { id: workspace.ownerId },
        select: { phone: true },
      }))?.phone || null
    : null;

  const result = await ensureWorkspaceProvisioned({
    workspaceId: workspace.id,
    businessName,
    ownerPhone,
    triggerSource: "onboarding-activation",
  });

  return NextResponse.json({
    ok: true,
    workspaceId: workspace.id,
    businessName,
    ownerPhonePresent: Boolean(ownerPhone),
    result,
  });
}

