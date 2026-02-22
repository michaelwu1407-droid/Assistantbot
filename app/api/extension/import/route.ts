import { NextRequest, NextResponse } from "next/server";
import { createContact } from "@/actions/contact-actions";
import { importFromPortal } from "@/actions/portal-actions";

/**
 * API route for the browser extension to push data into the CRM.
 * Handles both contact imports (LinkedIn) and listing imports (REA/Domain).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, workspaceId, ...data } = body;

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: "workspaceId is required" },
        { status: 400 }
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
    console.error("Extension import error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
