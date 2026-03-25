import { NextRequest, NextResponse } from "next/server";
import { createContact } from "@/actions/contact-actions";
import { importFromPortal } from "@/actions/portal-actions";
import { requireCurrentWorkspaceAccess } from "@/lib/workspace-access";
import { logger } from "@/lib/logging";

/**
 * API route for the browser extension to push data into the CRM.
 * Handles both contact imports (LinkedIn) and listing imports (REA/Domain).
 */
export async function POST(request: NextRequest) {
  try {
    // Archived: Real-estate project paused. Keep route only for backwards compatibility.
    if (process.env.ENABLE_ARCHIVED_REAL_ESTATE_EXTENSION !== "true") {
      return NextResponse.json(
        { success: false, error: "Archived feature (real-estate extension is paused)." },
        { status: 410 }
      );
    }

    const actor = await requireCurrentWorkspaceAccess();
    const body = await request.json();
    const { type, workspaceId, ...data } = body;

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: "workspaceId is required" },
        { status: 400 }
      );
    }
    if (workspaceId !== actor.workspaceId) {
      return NextResponse.json(
        { success: false, error: "Forbidden workspace access" },
        { status: 403 }
      );
    }

    // Contact import (from LinkedIn)
    if (type === "contact") {
      const result = await createContact({
        name: data.name || "Unknown",
        company: data.company,
        workspaceId,
      });

      return NextResponse.json(result);
    }

    // Listing import (from REA/Domain)
    if (type === "listing" && data.sourceUrl) {
      const result = await importFromPortal(data.sourceUrl, workspaceId);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { success: false, error: `Unknown import type: ${type}` },
      { status: 400 }
    );
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    logger.error("Extension import error", { component: "api/extension/import", action: "POST" }, err as Error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
