export type NotificationChannel = "sms" | "email" | "portal-only"

export enum NotificationScenario {
  NEW_LEAD_RESPONSE = "NEW_LEAD_RESPONSE",
  QUOTE_SENT = "QUOTE_SENT",
  BOOKING_CONFIRMATION_INFORMATIONAL = "BOOKING_CONFIRMATION_INFORMATIONAL",
  BOOKING_CONFIRMATION_REQUIRES_ACTION = "BOOKING_CONFIRMATION_REQUIRES_ACTION",
  REMINDER_24H = "REMINDER_24H",
  ON_MY_WAY = "ON_MY_WAY",
  RUNNING_LATE = "RUNNING_LATE",
  JOB_COMPLETE_FEEDBACK = "JOB_COMPLETE_FEEDBACK",
  BULK_MARKETING = "BULK_MARKETING",
  VERIFICATION = "VERIFICATION",
}

// Scenarios that are always SMS regardless of whether the contact has email
const ALWAYS_SMS_SCENARIOS = new Set<NotificationScenario>([
  NotificationScenario.NEW_LEAD_RESPONSE,
  NotificationScenario.QUOTE_SENT,
  NotificationScenario.BOOKING_CONFIRMATION_REQUIRES_ACTION,
  NotificationScenario.RUNNING_LATE,
  NotificationScenario.JOB_COMPLETE_FEEDBACK,
  NotificationScenario.VERIFICATION,
])

/**
 * Determines the best notification channel for a given contact and scenario.
 *
 * Rules:
 * - ON_MY_WAY → portal-only (customer already has portal link; status updates automatically)
 * - Urgent/action-required scenarios → SMS always (higher response rate)
 * - Non-urgent scenarios → email if contact has email, else SMS
 */
export function getNotificationChannel(
  contact: { email?: string | null; phone?: string | null },
  scenario: NotificationScenario,
): NotificationChannel {
  if (scenario === NotificationScenario.ON_MY_WAY) {
    return "portal-only"
  }

  if (ALWAYS_SMS_SCENARIOS.has(scenario)) {
    return "sms"
  }

  // Non-urgent: prefer email if available
  return contact.email ? "email" : "sms"
}
