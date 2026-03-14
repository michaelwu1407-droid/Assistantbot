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
      "With 24/7 availability, Tracey will contact the lead for you instantaneously. Oh.... and did we mention she's multilingual?",
    salesLine:
      "Earlymark helps you stop missing jobs by handling calls, texts, and lead follow-up around the clock, including multilingual enquiries.",
  },
  {
    id: "ops",
    title: "No more admin. Chat with your CRM.",
    description:
      "No more fiddling with complex CRMs — just tell Tracey what you want and she'll run it for you.",
    salesLine:
      "Earlymark cuts admin by letting you run follow-up, scheduling, CRM updates, and customer comms through one AI workflow instead of manual admin.",
  },
  {
    id: "natural_ai",
    title: "AI that actually works",
    description:
      "AI that handles convos like a human. Tracey learns your preferences and delivers a better and simpler experience.",
    salesLine:
      "Tracey is designed to sound natural, keep conversations moving, and stay aligned with the way your business actually operates.",
  },
  {
    id: "control",
    title: "Total control",
    description:
      "You decide how much autonomy Tracey has. Set approval rules, customize responses, and maintain full oversight of every customer interaction.",
    salesLine:
      "You keep control with approval rules, oversight, and guardrails over what Tracey can confirm, quote, or escalate.",
  },
];

export const EARLYMARK_PLATFORM_CAPABILITIES = [
  "calls, texts, and emails handled in one system",
  "CRM updates and follow-up without manual data entry",
  "smart scheduling and routing support",
  "visibility into jobs, response flow, and revenue",
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
