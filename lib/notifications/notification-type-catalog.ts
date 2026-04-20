export interface NotificationType {
  key: string;
  label: string;
  description: string;
  firstCut: boolean;
}

export const NOTIFICATION_TYPE_CATALOG: NotificationType[] = [
  {
    key: "new_lead",
    label: "New lead captured",
    description: "Alerts you when Tracey captures a new lead — name, service, source, and phone.",
    firstCut: true,
  },
  {
    key: "ai_call_completed",
    label: "AI call summary",
    description: "Breakdown of each AI-handled customer call with outcome and next step.",
    firstCut: true,
  },
  {
    key: "booking_confirmed",
    label: "Booking confirmed",
    description: "When a deal moves to Scheduled.",
    firstCut: true,
  },
  {
    key: "stale_deal",
    label: "Stale deal reminder",
    description: "Deals idle past your follow-up threshold that need a nudge.",
    firstCut: false,
  },
  {
    key: "morning_briefing",
    label: "Morning briefing",
    description: "Daily digest of today's schedule and preparation alerts.",
    firstCut: false,
  },
  {
    key: "payment_received",
    label: "Payment received",
    description: "Invoice-paid confirmations.",
    firstCut: false,
  },
];

export const FIRST_CUT_TYPES = NOTIFICATION_TYPE_CATALOG.filter((t) => t.firstCut);
