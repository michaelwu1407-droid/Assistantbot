"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { sendSupportAlert } from "./reminder-actions";

export async function handleChatFallback(message: string, metadata?: Record<string, any>) {
  try {
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
