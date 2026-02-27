"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { sendSupportAlert } from "./reminder-actions";
import { appendTicketNote } from "./activity-actions";

export async function handleChatFallback(message: string, metadata?: Record<string, any>) {
  try {
    const stickyTicketId = typeof metadata?.stickyTicketId === "string" ? metadata.stickyTicketId : null;
    if (stickyTicketId && typeof message === "string" && message.trim()) {
      try {
        const result = await appendTicketNote(stickyTicketId, message.trim());
        return { success: true, message: result };
      } catch {
        // Continue to generic fallback escalation if ticket note append fails.
      }
    }

    // Log the failed request
    console.error("Chatbot could not fulfill request:", message);
    
    // Send support alert to Michael Wu
    const alertResult = await sendSupportAlert(
      `Chatbot couldn't fulfill request: "${message}"`,
      {
        timestamp: new Date().toISOString(),
        message,
        metadata,
        userAgent: "chatbot-fallback",
        workspace: metadata?.workspaceId || "unknown",
      }
    );

    return { 
      success: true, 
      message: "Issue escalated to support" 
    };
  } catch (error) {
    console.error("Error in chat fallback:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to escalate" 
    };
  }
}
