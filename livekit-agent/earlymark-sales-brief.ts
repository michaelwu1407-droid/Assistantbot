export type EarlymarkSalesPillar = {
  id: "lead_capture" | "ops" | "natural_ai" | "control";
  title: string;
  description: string;
  salesLine: string;
};

export const EARLYMARK_SALES_PILLARS: EarlymarkSalesPillar[] = [
  {
    id: "lead_capture",
    title: "Never miss a job again",
    description:
      "Tracey answers every call 24/7, qualifies the lead, and books the job straight into your calendar — so you never lose work while you're on the tools.",
    salesLine:
      "Earlymark answers every call, qualifies the lead, and books the job — so tradies never miss work while they're on-site.",
  },
  {
    id: "ops",
    title: "No more admin. Chat with your CRM.",
    description:
      "No more fiddling with complex CRMs — just tell Tracey what you want and she'll run it for you.",
    salesLine:
      "Earlymark cuts admin by letting you run scheduling, CRM updates, follow-up, and customer comms through one AI assistant instead of manual work.",
  },
  {
    id: "natural_ai",
    title: "Follow-up that actually happens",
    description:
      "Tracey automatically follows up on unconfirmed quotes, sends booking reminders, and requests a review after every completed job.",
    salesLine:
      "Tracey follows up on quotes, confirms bookings, and asks for reviews automatically — so nothing falls through the cracks.",
  },
  {
    id: "control",
    title: "Total control",
    description:
      "You decide how much autonomy Tracey has. Set approval rules, customize responses, and maintain full oversight of every customer interaction.",
    salesLine:
      "You keep control with approval rules, oversight, and guardrails over what Tracey can confirm, book, or escalate.",
  },
];

export const EARLYMARK_PLATFORM_CAPABILITIES = [
  "calls, texts, and emails handled in one system",
  "CRM updates and scheduling without manual data entry",
  "automated follow-up sequences for quotes and completed jobs",
  "visibility into jobs, bookings, and revenue at a glance",
] as const;

export function buildEarlymarkSalesBrief() {
  const pillarLines = EARLYMARK_SALES_PILLARS.map((pillar) => `- ${pillar.salesLine}`);
  const capabilityLines = EARLYMARK_PLATFORM_CAPABILITIES.map((capability) => `- ${capability}`);

  return [
    "EARLYMARK SALES BRIEF",
    ...pillarLines,
    "Platform capabilities:",
    ...capabilityLines,
  ].join("\n");
}

export function getEarlymarkSalesOneLiner() {
  return "Earlymark helps service businesses handle calls, texts, emails, follow-up, and CRM admin without missing leads.";
}
