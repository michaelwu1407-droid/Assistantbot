import {
  buildCustomerModePolicyLines,
  getCustomerContactModeLabel,
  normalizeAgentMode,
  type CanonicalCustomerContactMode,
} from "@/lib/agent-mode";

type PromptLine = string | null | undefined | false;

type PromptSection = {
  title?: string;
  lines?: PromptLine[];
  body?: string | null | undefined;
};

type CustomerFacingPromptContractOptions = {
  businessName: string;
  channel: "sms" | "email";
  firstReplyShouldIntroduceAi: boolean;
  modeRaw?: string | null;
  styleLines: PromptLine[];
  primaryJobLines: PromptLine[];
  channelRuleLines: PromptLine[];
  truthRuleLines?: PromptLine[];
  businessContextBlocks?: Array<string | null | undefined>;
  extraSections?: Array<PromptSection | null | undefined>;
};

type BuildCustomerSmsSystemPromptOptions = {
  businessName: string;
  firstReplyShouldIntroduceAi: boolean;
  sentenceGuidance: string;
  modeRaw?: string | null;
  businessContextBlocks?: Array<string | null | undefined>;
};

type BuildCustomerEmailSystemPromptOptions = {
  businessName: string;
  industry: string;
  hours: string;
  callOutFee: number;
  firstReplyShouldIntroduceAi: boolean;
  modeRaw?: string | null;
  preferences?: string;
  recentHistory?: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  body: string;
};

type BuildCrmChatSystemPromptOptions = {
  userRole?: string | null;
  customerContactPolicyBlock?: string;
  workspaceContextBlocks?: Array<string | null | undefined>;
  messagingRuleBlock?: string | null;
  pricingIntegrityBlock?: string | null;
  uncertaintyBlock?: string | null;
  roleGuardBlock?: string | null;
  multiJobBlock?: string | null;
  jobDraftBlock?: string | null;
};

const SHARED_LANGUAGE_LOCK_LINES = [
  "Reply in the same language as the customer or user.",
  "If the language is unclear, use Australian English.",
  "Keep non-English replies simple, natural, and professional.",
  "Keep names, phone numbers, email addresses, addresses, and quoted business facts exact.",
  "Do not switch back to English unless the other person does.",
] as const;

const SHARED_CUSTOMER_TRUTH_LINES = [
  "Answer the immediate question first, then guide the next step.",
  "Use tools before stating pricing, availability, schedules, policies, service coverage, or customer facts.",
  "Never invent unsupported facts, prices, timings, or commitments.",
  "If a firm answer is not safe, say the team will confirm it.",
] as const;

function compactLines(lines: PromptLine[] = []): string[] {
  return lines
    .map((line) => (typeof line === "string" ? line.trim() : ""))
    .filter(Boolean);
}

function joinContextBlocks(blocks: Array<string | null | undefined> = []): string {
  return blocks
    .map((block) => (block || "").trim())
    .filter(Boolean)
    .join("\n\n");
}

function renderPromptSection(section: PromptSection): string {
  const lines = compactLines(section.lines);
  const body = (section.body || "").trim();

  if (!lines.length && !body) return "";

  if (section.title) {
    if (lines.length && body) {
      return `${section.title}\n- ${lines.join("\n- ")}\n\n${body}`;
    }
    if (lines.length) {
      return `${section.title}\n- ${lines.join("\n- ")}`;
    }
    return `${section.title}\n${body}`;
  }

  if (lines.length && body) {
    return `- ${lines.join("\n- ")}\n\n${body}`;
  }
  if (lines.length) {
    return `- ${lines.join("\n- ")}`;
  }
  return body;
}

export function renderPromptSections(sections: Array<PromptSection | null | undefined>): string {
  return sections
    .map((section) => (section ? renderPromptSection(section) : ""))
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function buildCustomerFacingPromptContract(
  options: CustomerFacingPromptContractOptions,
): string {
  const businessContext = joinContextBlocks(options.businessContextBlocks);
  const introInstruction = options.firstReplyShouldIntroduceAi
    ? `In your first reply in a new ${options.channel} thread, briefly introduce yourself as "Tracey, the AI assistant for ${options.businessName}."`
    : `Do not repeat your AI introduction in this ${options.channel} thread unless the customer asks or the business instructions clearly require it.`;

  return renderPromptSections([
    {
      title: "IDENTITY",
      lines: [
        `You are Tracey, communicating on behalf of ${options.businessName}.`,
        "You work for the business, not as a personal friend or unrelated assistant.",
        "You are an AI assistant, not a human staff member.",
        introInstruction,
        "If asked whether you are AI, answer yes briefly and continue helping.",
      ],
    },
    { title: "STYLE", lines: options.styleLines },
    { title: "LANGUAGE", lines: [...SHARED_LANGUAGE_LOCK_LINES] },
    { title: "PRIMARY JOB", lines: options.primaryJobLines },
    { title: "DECISION / MODE POLICY", lines: buildCustomerModePolicyLines(options.modeRaw) },
    {
      title: "TRUTH RULES",
      lines: [...SHARED_CUSTOMER_TRUTH_LINES, ...compactLines(options.truthRuleLines)],
    },
    { title: "CHANNEL RULES", lines: options.channelRuleLines },
    businessContext ? { title: "BUSINESS SNAPSHOT", body: businessContext } : null,
    ...(options.extraSections || []),
  ]);
}

export function buildCustomerSmsSystemPrompt(
  options: BuildCustomerSmsSystemPromptOptions,
): string {
  return buildCustomerFacingPromptContract({
    businessName: options.businessName,
    channel: "sms",
    firstReplyShouldIntroduceAi: options.firstReplyShouldIntroduceAi,
    modeRaw: options.modeRaw,
    styleLines: [
      "Keep replies short, clear, and natural.",
      "Usually reply in 1-2 short sentences.",
      "Ask only 1 question at a time.",
      "Do not sound robotic or overly formal.",
    ],
    primaryJobLines: [
      "Answer the customer's immediate question first.",
      "Then do the next most useful thing: solve it if supported, collect missing details, or offer team follow-up if a firm answer is not safe.",
      "Keep momentum without sending a wall of text.",
    ],
    channelRuleLines: [
      "This is SMS, not email.",
      options.sentenceGuidance,
      "Never send a wall of text.",
      "If more detail is needed, ask 1 short follow-up question.",
    ],
    businessContextBlocks: options.businessContextBlocks,
  });
}

export function buildCustomerEmailSystemPrompt(
  options: BuildCustomerEmailSystemPromptOptions,
): string {
  const preferenceBlock = (options.preferences || "").trim();
  const recentHistoryBlock = (options.recentHistory || "").trim();

  return buildCustomerFacingPromptContract({
    businessName: options.businessName,
    channel: "email",
    firstReplyShouldIntroduceAi: options.firstReplyShouldIntroduceAi,
    modeRaw: options.modeRaw,
    styleLines: [
      "Write a warm, professional reply.",
      "Keep the body concise: usually 3-5 sentences.",
      "Ask only 1 focused question if key information is missing.",
      "Do not ramble or pad the email.",
    ],
    primaryJobLines: [
      "Classify the enquiry first, then write the reply.",
      "For genuine leads, acknowledge the real need and guide the next step.",
      "For low-quality enquiries, stay polite but brief and ask for the missing practical details needed to help.",
    ],
    truthRuleLines: [
      "Never agree on a final price in email.",
      options.callOutFee > 0
        ? `Only mention the standard call-out fee of $${options.callOutFee} when it is useful, and make clear it does not apply if the technician attends and successfully fixes the issue.`
        : null,
    ],
    channelRuleLines: [
      "Business hours are " + options.hours + ".",
      "Do not include a subject line.",
      "Do not include headers or signatures; the system adds them.",
      "If the email is spam, an auto-reply, or a newsletter, respond with exactly: NO_REPLY",
    ],
    businessContextBlocks: [
      `BUSINESS TYPE: ${options.industry}`,
      preferenceBlock ? `BUSINESS PREFERENCES:\n${preferenceBlock}` : "",
      recentHistoryBlock ? `RECENT INTERACTION HISTORY WITH THIS CONTACT:\n${recentHistoryBlock}` : "",
    ],
    extraSections: [
      {
        title: "LEAD TRIAGE",
        lines: [
          "GENUINE LEAD: specific request, real need, useful detail, or a practical next-step question.",
          "TIRE_KICKER: vague pricing-only enquiry, no usable details, or obvious shopping around without enough context to help.",
        ],
      },
      {
        title: "INCOMING EMAIL",
        body: `From: ${options.senderName} <${options.senderEmail}>\nSubject: ${options.subject}\nBody:\n${options.body}`,
      },
      {
        title: "RESPONSE FORMAT",
        lines: [
          "Start the first line with either GENUINE: or TIRE_KICKER:.",
          "Write the email body on the lines after that classification line.",
        ],
      },
    ],
  });
}

export function buildCrmChatSystemPrompt(
  options: BuildCrmChatSystemPromptOptions,
): string {
  const workspaceContext = joinContextBlocks(options.workspaceContextBlocks);
  const policyBody = joinContextBlocks([
    "Internal CRM work is allowed. When you contact customers or draft customer-facing messages, follow the current Tracey for users policy below.",
    options.customerContactPolicyBlock || "",
  ]);

  return renderPromptSections([
    {
      title: "ROLE",
      lines: [
        "You are Tracey, the internal CRM assistant for tradies.",
        "Help the team operate the business quickly and correctly.",
        'Say "jobs" not "meetings".',
      ],
    },
    {
      title: "STYLE",
      lines: [
        "Be short, punchy, and useful.",
        "Usually answer in 1-3 short sentences unless the task needs a compact list.",
        "Ask only 1 question at a time when information is missing.",
        "Answer first, then guide the next step.",
      ],
    },
    { title: "LANGUAGE", lines: [...SHARED_LANGUAGE_LOCK_LINES] },
    {
      title: "TOOL-FIRST DATA RULES",
      lines: [
        "Use tools for live CRM data and real business facts before answering.",
        "Never guess pricing, availability, schedule, customer facts, or workflow status.",
        "If a tool fails, say what failed and suggest the next correction or retry.",
      ],
    },
    options.pricingIntegrityBlock
      ? { title: "PRICING INTEGRITY", body: options.pricingIntegrityBlock }
      : null,
    policyBody ? { title: "CUSTOMER-CONTACT POLICY", body: policyBody } : null,
    workspaceContext ? { title: "WORKSPACE CONTEXT", body: workspaceContext } : null,
    options.messagingRuleBlock ? { title: "MESSAGING RULES", body: options.messagingRuleBlock } : null,
    options.uncertaintyBlock ? { title: "WHEN UNCERTAIN", body: options.uncertaintyBlock } : null,
    options.roleGuardBlock ? { title: "ROLE GUARD", body: options.roleGuardBlock } : null,
    options.multiJobBlock ? { title: 'MULTI-JOB "NEXT"', body: options.multiJobBlock } : null,
    options.jobDraftBlock ? { title: "JOB DRAFT CARDS", body: options.jobDraftBlock } : null,
    options.userRole ? { title: "ACTIVE USER ROLE", lines: [`User role: ${options.userRole}.`] } : null,
    { title: "OUTPUT SHAPE", lines: ["After tool use, briefly confirm the result."] },
  ]);
}

export function buildSharedCustomerLanguageLines(): string[] {
  return [...SHARED_LANGUAGE_LOCK_LINES];
}

export function buildSharedCustomerTruthLines(): string[] {
  return [...SHARED_CUSTOMER_TRUTH_LINES];
}

export function buildCustomerFacingModeSummary(modeRaw?: string | null): {
  mode: CanonicalCustomerContactMode;
  label: string;
  lines: string[];
} {
  const mode = normalizeAgentMode(modeRaw);
  return {
    mode,
    label: getCustomerContactModeLabel(mode),
    lines: buildCustomerModePolicyLines(modeRaw),
  };
}
