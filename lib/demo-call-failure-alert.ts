import { getDemoCallErrorMessage, isDemoCallValidationError } from "@/lib/demo-call-errors";
import { dispatchVoiceIncidentNotifications } from "@/lib/voice-incident-alert";

type DemoCallFailureAlertInput = {
  leadId: string | null;
  source: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  businessName?: string;
  error: unknown;
};

function buildLeadName(input: DemoCallFailureAlertInput) {
  return [input.firstName, input.lastName].map((value) => value?.trim()).filter(Boolean).join(" ").trim() || "Unknown";
}

export async function dispatchDemoCallFailureAlert(input: DemoCallFailureAlertInput) {
  if (isDemoCallValidationError(input.error)) {
    return {
      skipped: true,
      reason: "validation_error",
    };
  }

  const errorMessage = getDemoCallErrorMessage(input.error) || "Unknown demo callback failure";
  return dispatchVoiceIncidentNotifications({
    subject: "VOICE ALERT: demo callback failed",
    message: `Public demo callback failed for ${buildLeadName(input)} (${input.phone || "no phone"}) via ${input.source}.`,
    metadata: {
      leadId: input.leadId,
      source: input.source,
      firstName: input.firstName?.trim() || null,
      lastName: input.lastName?.trim() || null,
      email: input.email?.trim().toLowerCase() || null,
      phone: input.phone?.trim() || null,
      businessName: input.businessName?.trim() || null,
      error: errorMessage,
    },
  });
}
