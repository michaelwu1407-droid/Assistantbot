import { startOfMonth, subDays } from "date-fns";
import type Stripe from "stripe";
import type { WebhookDiagnostic } from "@/actions/webhook-actions";
import { getWebhookDiagnostics } from "@/actions/webhook-actions";
import { getBillingIntervalForPriceId, getPlanLabelForPriceId } from "@/lib/billing-plan";
import {
  getConfiguredVoiceLlmModel,
  getConfiguredVoiceLlmProvider,
  getVoiceLlmRate,
  VOICE_STT_RATE_CARD,
  VOICE_TTS_RATE_CARD,
} from "@/lib/admin/voice-ai-rate-card";
import { db } from "@/lib/db";
import { type LaunchReadiness, getLaunchReadiness } from "@/lib/launch-readiness";
import { stripe } from "@/lib/stripe";
import {
  buildDemoPrompt,
  buildInboundDemoPrompt,
  buildNormalPrompt,
  type PromptCallType,
} from "@/livekit-agent/voice-prompts";

export type UsageRange = "1d" | "7d" | "30d" | "90d";
export type CustomerUsageTab = "overview" | "customers" | "ops";
export type CustomerUsageSort =
  | "attention"
  | "subRevenue"
  | "twilioSpend"
  | "invoiceRevenue"
  | "jobsWon"
  | "lastActivity";

export type CustomerUsageFilters = {
  tab: CustomerUsageTab;
  range: UsageRange;
  workspace: string;
  q: string;
  sort: CustomerUsageSort;
};

export type CoverageStatus = "live" | "degraded" | "missing";
export type RollupStatus = "healthy" | "degraded" | "unhealthy";

type TwilioUsageCategory = {
  category: string;
  usage: number;
  usageUnit: string;
  price: number;
  priceUnit: string;
};

type StripeSnapshot = {
  coverage: CoverageStatus;
  subscriptionRevenue: number | null;
  currency: string | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  latestInvoiceStatus: string | null;
  latestInvoiceAmount: number | null;
  latestInvoiceCurrency: string | null;
  latestInvoiceDate: string | null;
  planLabel: string;
  billingInterval: string;
};

type TwilioSnapshot = {
  coverage: CoverageStatus;
  monthSpend: number | null;
  daySpend: number | null;
  currency: string | null;
  categories: TwilioUsageCategory[];
};

type ProviderSnapshot = {
  stripe: StripeSnapshot;
  twilio: TwilioSnapshot;
};

type VoiceAiEstimate = {
  totalUsd: number | null;
  sttUsd: number;
  ttsUsd: number;
  llmUsd: number;
  coveredCalls: number;
  excludedCalls: number;
  totalCalls: number;
  coverage: CoverageStatus;
  note: string;
  llmModels: string[];
  rateCardSummary: {
    stt: string;
    tts: string;
    llm: string[];
  };
};

type WorkspaceAttention = {
  level: "critical" | "warning" | "none";
  reasons: string[];
};

type MoneyAggregate = {
  amount: number | null;
  currency: string | null;
  coveredCount: number;
  excludedCount: number;
  mixedCurrencies: boolean;
};

export type CustomerUsageRow = {
  workspaceId: string;
  workspaceName: string;
  ownerEmail: string;
  workspaceType: string;
  industryType: string;
  createdAt: string;
  subscriptionStatus: string;
  planLabel: string;
  billingInterval: string;
  subscriptionRevenue: number | null;
  subscriptionRevenueCurrency: string | null;
  twilioMonthSpend: number | null;
  twilioMonthSpendCurrency: string | null;
  subRevenueMinusTwilio: number | null;
  subRevenueMinusTwilioCurrency: string | null;
  paidInvoiceRevenueInRange: number;
  jobsWonWithTracey: number;
  voiceCallsInRange: number;
  lastActivityAt: string | null;
  lastVoiceCallAt: string | null;
  provisioningIssue: string | null;
  attentionLevel: WorkspaceAttention["level"];
  attentionReasons: string[];
  passiveHealth: {
    status: RollupStatus;
    summary: string;
  } | null;
  coverage: {
    stripe: CoverageStatus;
    twilio: CoverageStatus;
    aiEstimate: CoverageStatus;
  };
};

export type CustomerUsageDashboardData = {
  filters: CustomerUsageFilters;
  truthModel: {
    exact: string;
    rollup: string;
    estimate: string;
  };
  overview: {
    totalCustomers: number;
    paidCustomers: number;
    paidInvoiceRevenueInRange: number;
    jobsWonWithTracey: number;
    customersNeedingAction: number;
    openProvisioningBlockers: number;
    opsIssueCount: number;
    subscriptionRevenue: MoneyAggregate;
    twilioMonthSpend: MoneyAggregate;
    subRevenueMinusTwilio: MoneyAggregate;
    coverage: {
      stripe: Record<CoverageStatus, number>;
      twilio: Record<CoverageStatus, number>;
      aiEstimate: Record<CoverageStatus, number>;
    };
    lists: {
      immediateAttentionCustomers: Array<{
        workspaceId: string;
        workspaceName: string;
        level: "critical" | "warning";
        reasons: string[];
      }>;
      newestProvisioningFailures: LaunchReadiness["provisioning"]["recentIssues"];
      staleCustomers: Array<{
        workspaceId: string;
        workspaceName: string;
        lastActivityAt: string | null;
        reasons: string[];
      }>;
      providerFailures: Array<{
        id: string;
        label: string;
        status: RollupStatus;
        summary: string;
        lastSeenAt: string | null;
        source: "ops" | "webhook";
      }>;
    };
  };
  rows: CustomerUsageRow[];
  selectedWorkspace: {
    row: CustomerUsageRow;
    identity: {
      workspaceId: string;
      workspaceName: string;
      workspaceType: string;
      industryType: string;
      ownerId: string | null;
      ownerEmail: string;
      voiceEnabled: boolean;
      twilioPhoneNumber: string | null;
      onboardingComplete: boolean;
      tutorialComplete: boolean;
      createdAt: string;
      updatedAt: string;
    };
    billing: {
      stripeCustomerId: string | null;
      stripeSubscriptionId: string | null;
      subscriptionStatus: string;
      planLabel: string;
      billingInterval: string;
      currentPeriodEnd: string | null;
      latestInvoiceStatus: string | null;
      latestInvoiceAmount: number | null;
      latestInvoiceCurrency: string | null;
      latestInvoiceDate: string | null;
      subscriptionRevenue: number | null;
      subscriptionRevenueCurrency: string | null;
      revenue7d: number;
      revenue30d: number;
      revenue90d: number;
      revenueLifetime: number;
      paidInvoiceCount: number;
      unpaidInvoiceCount: number;
    };
    funnel: {
      contactsTotal: number;
      contactsNew7d: number;
      contactsNew30d: number;
      dealsCreated7d: number;
      dealsCreated30d: number;
      dealsWon: number;
      dealsLost: number;
      dealsOpen: number;
      stageDistribution: Array<{ stage: string; count: number }>;
      winRatePercent: number;
      averageDaysToWin: number;
      jobsWonWithTracey: number;
      jobsWonWithTraceyCurrentMonth: number;
      averageInvoiceValue: number;
      invoicePaymentLatencyDays: number | null;
    };
    voice: {
      totalCallsInRange: number;
      inboundCallsInRange: number;
      outboundCallsInRange: number;
      completedCallsInRange: number;
      incompleteCallsInRange: number;
      totalMinutesInRange: number;
      averageDurationMinutes: number;
      maxDurationMinutes: number;
      recentCalls: Array<{
        id: string;
        startedAt: string;
        durationMinutes: number;
        callerPhone: string | null;
        calledPhone: string | null;
        callType: string;
        contactName: string | null;
        hasSummary: boolean;
        hasTranscript: boolean;
      }>;
      incidents: Array<{
        id: string;
        summary: string;
        severity: string;
        status: string;
        updatedAt: string;
        details: unknown;
      }>;
    };
    costs: {
      subscriptionRevenue: number | null;
      subscriptionRevenueCurrency: string | null;
      twilioMonthSpend: number | null;
      twilioDaySpend: number | null;
      twilioCurrency: string | null;
      subRevenueMinusTwilio: number | null;
      subRevenueMinusTwilioCurrency: string | null;
      costPerWonJob: number | null;
      costPerWonJobCurrency: string | null;
      twilioUsageCategories: TwilioUsageCategory[];
      estimatedAiCost: VoiceAiEstimate;
    };
    activity: {
      lastDealCreatedAt: string | null;
      lastDealWonAt: string | null;
      lastInvoicePaidAt: string | null;
      lastVoiceCallAt: string | null;
      lastWorkspaceActivityAt: string | null;
      attentionReasons: string[];
    };
    feedback: {
      feedbackCountInRange: number;
      averageScoreInRange: number | null;
      lowScoresInRange: number;
      unresolvedLowScores: number;
      recentFeedback: Array<{
        id: string;
        score: number;
        comment: string | null;
        resolved: boolean;
        createdAt: string;
        contactName: string;
        dealTitle: string;
      }>;
    };
  } | null;
  ops: {
    launch: LaunchReadiness;
    webhookDiagnostics: WebhookDiagnostic[];
  };
};

type WorkspaceRecord = Awaited<ReturnType<typeof fetchWorkspaceBase>>[number];

type TranscriptTurn = {
  role: "user" | "assistant";
  text: string;
  createdAt: number;
};

const STAGE_LABELS: Record<string, string> = {
  NEW: "New request",
  CONTACTED: "Quote sent",
  NEGOTIATION: "Negotiation",
  SCHEDULED: "Scheduled",
  PIPELINE: "Pipeline",
  INVOICED: "Ready to invoice",
  PENDING_COMPLETION: "Pending approval",
  WON: "Completed",
  LOST: "Lost",
  DELETED: "Deleted",
  ARCHIVED: "Archived",
};

const TRACEY_WON_STAGES = [
  "NEGOTIATION",
  "SCHEDULED",
  "PIPELINE",
  "INVOICED",
  "PENDING_COMPLETION",
  "WON",
] as const;

export const JOBS_WON_WITH_TRACEY_FORMULA =
  "Count deals where createdAt or stageChangedAt falls inside the selected range, the deal is in NEGOTIATION, SCHEDULED, PIPELINE, INVOICED, PENDING_COMPLETION, or WON, and the deal has system-source metadata (source, leadWonEmail, leadSource, provider, or portal). Deals created directly into those later stages without system-source metadata are excluded.";

export const SUB_REVENUE_MINUS_TWILIO_FORMULA =
  "Exact current recurring subscription revenue minus exact current-month Twilio spend. Only shown when both live values share the same currency.";

export const COST_PER_WON_JOB_FORMULA =
  "Current month only. Formula: Twilio month spend / Jobs Won With Tracey.";

const PROMPT_BASELINE_CALLER = {
  callType: "normal" as PromptCallType,
  firstName: "Caller",
  lastName: "Example",
  businessName: "Example Plumbing",
  email: "caller@example.com",
  phone: "0400000000",
  calledPhone: "0400000000",
};

function getRangeStart(range: UsageRange) {
  const now = new Date();
  if (range === "1d") return subDays(now, 1);
  if (range === "7d") return subDays(now, 7);
  if (range === "90d") return subDays(now, 90);
  return subDays(now, 30);
}

function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value && typeof value === "object" && "toNumber" in value && typeof (value as { toNumber: () => number }).toNumber === "function") {
    return toNumber((value as { toNumber: () => number }).toNumber());
  }
  return 0;
}

function roundMoney(value: number | null) {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
}

function safeDivide(value: number | null, divisor: number) {
  if (value == null || !divisor) return null;
  return value / divisor;
}

function toIso(value?: Date | null) {
  return value ? value.toISOString() : null;
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function normalizeCurrency(value?: string | null) {
  if (!value || !value.trim()) return null;
  return value.trim().toUpperCase();
}

function mapLimit<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = index++;
      results[current] = await mapper(items[current]);
    }
  }

  return Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker())).then(() => results);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T) {
  let timer: NodeJS.Timeout | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function readObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function estimateTokenCount(text: string) {
  if (!text.trim()) return 0;
  return Math.ceil(text.length / 4);
}

function parseTranscriptTurns(value: unknown): TranscriptTurn[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const row = entry as Record<string, unknown>;
      if ((row.role !== "user" && row.role !== "assistant") || typeof row.text !== "string") return null;
      return {
        role: row.role,
        text: row.text,
        createdAt: typeof row.createdAt === "number" ? row.createdAt : 0,
      } satisfies TranscriptTurn;
    })
    .filter((entry): entry is TranscriptTurn => Boolean(entry));
}

function getPromptBaselineTokens(callType: string) {
  if (callType === "demo") {
    return estimateTokenCount(buildDemoPrompt({ ...PROMPT_BASELINE_CALLER, callType: "demo" }));
  }
  if (callType === "inbound_demo") {
    return estimateTokenCount(buildInboundDemoPrompt({ ...PROMPT_BASELINE_CALLER, callType: "inbound_demo" }));
  }
  return estimateTokenCount(buildNormalPrompt(PROMPT_BASELINE_CALLER, null));
}

function inferCallDirection(callType: string) {
  const value = callType.toLowerCase();
  if (value.includes("outbound")) return "outbound";
  if (value.includes("inbound")) return "inbound";
  return "unknown";
}

function getCallDurationMinutes(startedAt: Date, endedAt?: Date | null) {
  if (!endedAt) return 0;
  return Math.max(0, (endedAt.getTime() - startedAt.getTime()) / 60_000);
}

function maxDate(...values: Array<Date | null | undefined>) {
  const valid = values.filter((value): value is Date => Boolean(value));
  if (valid.length === 0) return null;
  return valid.reduce((latest, value) => (value.getTime() > latest.getTime() ? value : latest));
}

export function detectTraceyWonDeal(metadata: unknown, stage: string, createdAt: Date, stageChangedAt: Date | null) {
  if (!TRACEY_WON_STAGES.includes(stage as (typeof TRACEY_WON_STAGES)[number])) {
    return false;
  }

  const meta = readObject(metadata);
  const hasSystemSource =
    Boolean(readString(meta.source)?.trim()) ||
    Boolean(meta.leadWonEmail) ||
    Boolean(readString(meta.leadSource)?.trim()) ||
    Boolean(readString(meta.provider)?.trim()) ||
    Boolean(readString(meta.portal)?.trim());

  const createdDirectlyAtCurrentStage =
    Boolean(stageChangedAt) && Math.abs(stageChangedAt!.getTime() - createdAt.getTime()) < 60_000;

  if (!hasSystemSource && createdDirectlyAtCurrentStage) {
    return false;
  }

  return true;
}

function isDealInsideTraceyWindow(deal: { createdAt: Date; stageChangedAt: Date }, rangeStart: Date) {
  return deal.createdAt >= rangeStart || deal.stageChangedAt >= rangeStart;
}

function countJobsWonWithTracey(
  deals: Array<{ metadata: unknown; stage: string; createdAt: Date; stageChangedAt: Date }>,
  rangeStart: Date,
) {
  return deals.filter((deal) => isDealInsideTraceyWindow(deal, rangeStart))
    .filter((deal) => detectTraceyWonDeal(deal.metadata, deal.stage, deal.createdAt, deal.stageChangedAt))
    .length;
}

function aggregateMoney(
  items: Array<{
    amount: number | null;
    currency: string | null;
  }>,
): MoneyAggregate {
  const eligible = items.filter((item) => item.amount != null && item.currency);
  const excludedCount = items.length - eligible.length;
  if (eligible.length === 0) {
    return {
      amount: null,
      currency: null,
      coveredCount: 0,
      excludedCount,
      mixedCurrencies: false,
    };
  }

  const currencies = Array.from(new Set(eligible.map((item) => item.currency)));
  if (currencies.length !== 1) {
    return {
      amount: null,
      currency: null,
      coveredCount: eligible.length,
      excludedCount,
      mixedCurrencies: true,
    };
  }

  return {
    amount: roundMoney(eligible.reduce((sum, item) => sum + (item.amount || 0), 0)),
    currency: currencies[0] || null,
    coveredCount: eligible.length,
    excludedCount,
    mixedCurrencies: false,
  };
}

function subtractMoneyExact(
  leftAmount: number | null,
  leftCurrency: string | null,
  rightAmount: number | null,
  rightCurrency: string | null,
) {
  if (leftAmount == null || rightAmount == null) {
    return { amount: null, currency: null };
  }
  if (!leftCurrency || !rightCurrency || leftCurrency !== rightCurrency) {
    return { amount: null, currency: null };
  }
  return {
    amount: roundMoney(leftAmount - rightAmount),
    currency: leftCurrency,
  };
}

export function calculateCostPerWonJob(twilioMonthSpend: number | null, jobsWonWithTraceyCurrentMonth: number) {
  return roundMoney(safeDivide(twilioMonthSpend, jobsWonWithTraceyCurrentMonth));
}

function getTwilioCredentials(workspace: WorkspaceRecord) {
  if (workspace.twilioSubaccountId && workspace.twilioSubaccountAuthToken) {
    return {
      accountSid: workspace.twilioSubaccountId,
      authToken: workspace.twilioSubaccountAuthToken,
    };
  }

  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    return {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
    };
  }

  return null;
}

async function fetchTwilioUsageRecords(workspace: WorkspaceRecord, period: "Today" | "ThisMonth", category?: string) {
  const credentials = getTwilioCredentials(workspace);
  if (!credentials) return null;

  const params = new URLSearchParams();
  if (category) params.set("Category", category);
  params.set("PageSize", "100");

  const query = params.toString();
  const url = `https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}/Usage/Records/${period}.json${query ? `?${query}` : ""}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${credentials.accountSid}:${credentials.authToken}`).toString("base64")}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Twilio ${period} usage failed with ${response.status}`);
  }

  const payload = (await response.json()) as {
    usage_records?: Array<{
      category?: string | null;
      usage?: string | null;
      usage_unit?: string | null;
      price?: string | null;
      price_unit?: string | null;
    }>;
  };

  return payload.usage_records || [];
}

function normalizeStripeSubscriptionRevenue(subscription: Stripe.Subscription) {
  const items = Array.isArray(subscription.items?.data) ? subscription.items.data : [];
  if (items.length === 0) {
    return { amount: null, currency: null };
  }

  const currencies = Array.from(new Set(items.map((item) => normalizeCurrency(item.price.currency)).filter(Boolean)));
  if (currencies.length !== 1) {
    return { amount: null, currency: null };
  }

  const monthly = items.reduce((sum: number, item: Stripe.SubscriptionItem) => {
    const unitAmount = toNumber(item.price.unit_amount) / 100;
    const quantity = toNumber(item.quantity) || 1;
    const interval = item.price.recurring?.interval;
    const intervalCount = toNumber(item.price.recurring?.interval_count) || 1;

    if (interval === "year") {
      return sum + (unitAmount * quantity) / (12 * intervalCount);
    }
    if (interval === "month") {
      return sum + (unitAmount * quantity) / intervalCount;
    }

    return sum;
  }, 0);

  return {
    amount: roundMoney(monthly),
    currency: currencies[0] || null,
  };
}

function getStripePricePresentation(workspace: WorkspaceRecord, subscription: Stripe.Subscription | null) {
  const subscriptionPriceId = subscription?.items?.data?.[0]?.price?.id || null;
  const priceId = workspace.stripePriceId || subscriptionPriceId;
  const intervalFromPriceId = getBillingIntervalForPriceId(priceId);
  const intervalLabel =
    intervalFromPriceId ||
    (subscription?.items?.data?.[0]?.price?.recurring?.interval === "year" ? "yearly" : "monthly");

  return {
    planLabel: getPlanLabelForPriceId(priceId),
    billingInterval: intervalLabel || "n/a",
  };
}

async function fetchStripeSnapshot(workspace: WorkspaceRecord): Promise<StripeSnapshot> {
  if (!workspace.stripeCustomerId && !workspace.stripeSubscriptionId && !workspace.stripePriceId) {
    return {
      coverage: "missing",
      subscriptionRevenue: null,
      currency: null,
      subscriptionStatus: workspace.subscriptionStatus || null,
      currentPeriodEnd: toIso(workspace.stripeCurrentPeriodEnd),
      latestInvoiceStatus: null,
      latestInvoiceAmount: null,
      latestInvoiceCurrency: null,
      latestInvoiceDate: null,
      planLabel: workspace.stripePriceId ? getPlanLabelForPriceId(workspace.stripePriceId) : "No active subscription",
      billingInterval: workspace.stripePriceId ? (getBillingIntervalForPriceId(workspace.stripePriceId) || "n/a") : "n/a",
    };
  }

  try {
    const subscription: Stripe.Subscription | null = workspace.stripeSubscriptionId
      ? await withTimeout(
          stripe.subscriptions.retrieve(workspace.stripeSubscriptionId, {
            expand: ["latest_invoice", "items.data.price"],
          }) as Promise<Stripe.Subscription>,
          6_000,
          null,
        )
      : null;

    const latestInvoice =
      subscription && subscription.latest_invoice && typeof subscription.latest_invoice === "object"
        ? (subscription.latest_invoice as Stripe.Invoice)
        : workspace.stripeCustomerId
          ? await withTimeout(
              stripe.invoices.list({
                customer: workspace.stripeCustomerId,
                limit: 1,
              }).then((result) => result.data[0] || null),
              6_000,
              null,
            )
          : null;

    const subscriptionPeriodEnd = subscription
      ? subscription.items.data.reduce((max, item) => Math.max(max, item.current_period_end || 0), 0)
      : 0;
    const normalizedRevenue = subscription ? normalizeStripeSubscriptionRevenue(subscription) : { amount: null, currency: null };
    const presentation = getStripePricePresentation(workspace, subscription);

    return {
      coverage: subscription ? "live" : "degraded",
      subscriptionRevenue: normalizedRevenue.amount,
      currency: normalizedRevenue.currency,
      subscriptionStatus: subscription?.status || workspace.subscriptionStatus || null,
      currentPeriodEnd: subscriptionPeriodEnd
        ? new Date(subscriptionPeriodEnd * 1000).toISOString()
        : toIso(workspace.stripeCurrentPeriodEnd),
      latestInvoiceStatus: latestInvoice?.status || null,
      latestInvoiceAmount:
        typeof latestInvoice?.amount_paid === "number"
          ? roundMoney(latestInvoice.amount_paid / 100)
          : typeof latestInvoice?.amount_due === "number"
            ? roundMoney(latestInvoice.amount_due / 100)
            : null,
      latestInvoiceCurrency: normalizeCurrency(latestInvoice?.currency || null),
      latestInvoiceDate: typeof latestInvoice?.created === "number"
        ? new Date(latestInvoice.created * 1000).toISOString()
        : null,
      planLabel: presentation.planLabel,
      billingInterval: presentation.billingInterval,
    };
  } catch {
    return {
      coverage: "degraded",
      subscriptionRevenue: null,
      currency: null,
      subscriptionStatus: workspace.subscriptionStatus || null,
      currentPeriodEnd: toIso(workspace.stripeCurrentPeriodEnd),
      latestInvoiceStatus: null,
      latestInvoiceAmount: null,
      latestInvoiceCurrency: null,
      latestInvoiceDate: null,
      planLabel: workspace.stripePriceId ? getPlanLabelForPriceId(workspace.stripePriceId) : "No active subscription",
      billingInterval: workspace.stripePriceId ? (getBillingIntervalForPriceId(workspace.stripePriceId) || "n/a") : "n/a",
    };
  }
}

async function fetchTwilioSnapshot(workspace: WorkspaceRecord): Promise<TwilioSnapshot> {
  const credentials = getTwilioCredentials(workspace);
  if (!credentials) {
    return {
      coverage: "missing",
      monthSpend: null,
      daySpend: null,
      currency: null,
      categories: [],
    };
  }

  try {
    const [monthTotals, dayTotals, categories] = await Promise.all([
      withTimeout(fetchTwilioUsageRecords(workspace, "ThisMonth", "totalprice"), 6_000, null),
      withTimeout(fetchTwilioUsageRecords(workspace, "Today", "totalprice"), 6_000, null),
      withTimeout(fetchTwilioUsageRecords(workspace, "ThisMonth"), 6_000, null),
    ]);

    const currency =
      normalizeCurrency(monthTotals?.find((record) => normalizeCurrency(record.price_unit))?.price_unit) ||
      normalizeCurrency(dayTotals?.find((record) => normalizeCurrency(record.price_unit))?.price_unit) ||
      normalizeCurrency(categories?.find((record) => normalizeCurrency(record.price_unit))?.price_unit) ||
      "USD";

    return {
      coverage: monthTotals ? "live" : "degraded",
      monthSpend: monthTotals ? roundMoney(monthTotals.reduce((sum, record) => sum + toNumber(record.price), 0)) : null,
      daySpend: dayTotals ? roundMoney(dayTotals.reduce((sum, record) => sum + toNumber(record.price), 0)) : null,
      currency,
      categories: (categories || [])
        .filter((record) => record.category)
        .map((record) => ({
          category: record.category || "unknown",
          usage: toNumber(record.usage),
          usageUnit: record.usage_unit || "",
          price: roundMoney(toNumber(record.price)) || 0,
          priceUnit: normalizeCurrency(record.price_unit) || currency,
        }))
        .sort((left, right) => right.price - left.price),
    };
  } catch {
    return {
      coverage: "degraded",
      monthSpend: null,
      daySpend: null,
      currency: null,
      categories: [],
    };
  }
}

async function fetchProviderSnapshot(workspace: WorkspaceRecord): Promise<ProviderSnapshot> {
  const [stripeSnapshot, twilioSnapshot] = await Promise.all([
    fetchStripeSnapshot(workspace),
    fetchTwilioSnapshot(workspace),
  ]);

  return {
    stripe: stripeSnapshot,
    twilio: twilioSnapshot,
  };
}

async function fetchWorkspaceBase() {
  return db.workspace.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      type: true,
      industryType: true,
      ownerId: true,
      onboardingComplete: true,
      tutorialComplete: true,
      voiceEnabled: true,
      autoCallLeads: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      stripePriceId: true,
      stripeCurrentPeriodEnd: true,
      subscriptionStatus: true,
      twilioPhoneNumber: true,
      twilioSubaccountId: true,
      twilioSubaccountAuthToken: true,
      createdAt: true,
      updatedAt: true,
      users: {
        select: {
          id: true,
          email: true,
          role: true,
        },
      },
    },
  });
}

function deriveOwnerEmail(workspace: WorkspaceRecord) {
  const ownerUser =
    workspace.users.find((user) => user.id === workspace.ownerId) ||
    workspace.users.find((user) => user.role === "OWNER") ||
    workspace.users[0];

  return ownerUser?.email || "Unknown";
}

function getIncidentWorkspaceId(
  incident: {
    details: unknown;
  },
  workspaceByPhone: Map<string, string>,
) {
  const details = readObject(incident.details);
  const directWorkspaceId = readString(details.workspaceId);
  if (directWorkspaceId) return directWorkspaceId;

  const managedNumber = readString(details.managedNumber)?.replace(/\s+/g, "");
  const calledNumber = readString(details.calledNumber)?.replace(/\s+/g, "");
  const callerNumber = readString(details.callerNumber)?.replace(/\s+/g, "");

  return (
    (managedNumber ? workspaceByPhone.get(managedNumber) : undefined) ||
    (calledNumber ? workspaceByPhone.get(calledNumber) : undefined) ||
    (callerNumber ? workspaceByPhone.get(callerNumber) : undefined) ||
    null
  );
}

function estimateVoiceAiCost(
  calls: Array<{
    callType: string;
    startedAt: Date;
    endedAt: Date | null;
    transcriptTurns: unknown;
  }>,
): VoiceAiEstimate {
  let sttUsd = 0;
  let ttsUsd = 0;
  let llmUsd = 0;
  let coveredCalls = 0;
  let excludedCalls = 0;
  const llmModels = new Set<string>();

  for (const call of calls) {
    const turns = parseTranscriptTurns(call.transcriptTurns);
    const durationMinutes = getCallDurationMinutes(call.startedAt, call.endedAt);
    const provider = getConfiguredVoiceLlmProvider(call.callType);
    const model = getConfiguredVoiceLlmModel(call.callType, provider);
    const llmRate = getVoiceLlmRate(provider, model);

    if (!turns.length || durationMinutes <= 0 || !llmRate) {
      excludedCalls += 1;
      continue;
    }

    const userText = turns.filter((turn) => turn.role === "user").map((turn) => turn.text.trim()).filter(Boolean).join(" ");
    const assistantText = turns.filter((turn) => turn.role === "assistant").map((turn) => turn.text.trim()).filter(Boolean).join(" ");
    if (!userText && !assistantText) {
      excludedCalls += 1;
      continue;
    }

    const promptBaselineTokens = getPromptBaselineTokens(call.callType);
    const inputTokens = promptBaselineTokens + estimateTokenCount(userText);
    const outputTokens = estimateTokenCount(assistantText);

    sttUsd += durationMinutes * VOICE_STT_RATE_CARD.usdPerMinute;
    ttsUsd += (assistantText.length / 1_000) * VOICE_TTS_RATE_CARD.usdPer1KCharacters;
    llmUsd += (inputTokens / 1_000_000) * llmRate.inputUsdPer1M;
    llmUsd += (outputTokens / 1_000_000) * llmRate.outputUsdPer1M;
    llmModels.add(`${llmRate.provider}:${llmRate.model}`);
    coveredCalls += 1;
  }

  const coverage: CoverageStatus =
    coveredCalls === 0
      ? "missing"
      : excludedCalls > 0
        ? "degraded"
        : "live";

  return {
    totalUsd: coveredCalls > 0 ? roundMoney(sttUsd + ttsUsd + llmUsd) : null,
    sttUsd: roundMoney(sttUsd) || 0,
    ttsUsd: roundMoney(ttsUsd) || 0,
    llmUsd: roundMoney(llmUsd) || 0,
    coveredCalls,
    excludedCalls,
    totalCalls: calls.length,
    coverage,
    note:
      coveredCalls > 0
        ? "Voice-only estimate from persisted call duration + transcript turns. Excludes calls without enough transcript data."
        : "No eligible persisted voice calls had enough transcript data to estimate voice-only AI cost.",
    llmModels: Array.from(llmModels),
    rateCardSummary: {
      stt: `${VOICE_STT_RATE_CARD.provider} ${VOICE_STT_RATE_CARD.model} @ $${VOICE_STT_RATE_CARD.usdPerMinute.toFixed(4)}/min (${VOICE_STT_RATE_CARD.effectiveDate})`,
      tts: `${VOICE_TTS_RATE_CARD.provider} ${VOICE_TTS_RATE_CARD.model} @ $${VOICE_TTS_RATE_CARD.usdPer1KCharacters.toFixed(6)}/1k chars (${VOICE_TTS_RATE_CARD.effectiveDate})`,
      llm: Array.from(llmModels),
    },
  };
}

function buildAttentionState(input: {
  rowVoiceEnabled: boolean;
  subscriptionStatus: string;
  lastActivityAt: Date | null;
  stripeCoverage: CoverageStatus;
  twilioCoverage: CoverageStatus;
  incidents: number;
  provisioningIssue: LaunchReadiness["provisioning"]["recentIssues"][number] | null;
  passiveWorkspaceHealth: LaunchReadiness["passiveProduction"]["workspaceRows"][number] | null;
}) {
  const criticalReasons: string[] = [];
  const warningReasons: string[] = [];

  if (["past_due", "unpaid", "canceled", "incomplete_expired"].includes(input.subscriptionStatus.toLowerCase())) {
    criticalReasons.push(`Subscription ${input.subscriptionStatus}`);
  }

  if (input.provisioningIssue?.provisioningStatus === "failed" || input.provisioningIssue?.provisioningStatus === "blocked_duplicate") {
    criticalReasons.push(`Provisioning ${input.provisioningIssue.provisioningStatus}`);
  } else if (input.provisioningIssue?.provisioningStatus === "requested" || input.provisioningIssue?.provisioningStatus === "provisioning") {
    warningReasons.push(`Provisioning ${input.provisioningIssue.provisioningStatus}`);
  }

  if (input.incidents > 0) {
    criticalReasons.push(`${input.incidents} open voice incident${input.incidents === 1 ? "" : "s"}`);
  }

  if (input.passiveWorkspaceHealth?.overallStatus === "unhealthy") {
    criticalReasons.push(`Passive production ${input.passiveWorkspaceHealth.overallClassification}`);
  } else if (input.passiveWorkspaceHealth?.overallStatus === "degraded") {
    warningReasons.push(`Passive production ${input.passiveWorkspaceHealth.overallClassification}`);
  }

  if (!input.lastActivityAt || input.lastActivityAt < subDays(new Date(), 30)) {
    warningReasons.push("No meaningful workspace activity in the last 30 days");
  }

  if (input.rowVoiceEnabled && input.twilioCoverage !== "live") {
    warningReasons.push(`Twilio coverage ${input.twilioCoverage}`);
  }

  if (input.subscriptionStatus.toLowerCase() === "active" && input.stripeCoverage !== "live") {
    warningReasons.push(`Stripe coverage ${input.stripeCoverage}`);
  }

  if (!input.rowVoiceEnabled) {
    warningReasons.push("Voice disabled");
  }

  if (criticalReasons.length > 0) {
    return {
      level: "critical",
      reasons: [...criticalReasons, ...warningReasons],
    } satisfies WorkspaceAttention;
  }

  if (warningReasons.length > 0) {
    return {
      level: "warning",
      reasons: warningReasons,
    } satisfies WorkspaceAttention;
  }

  return {
    level: "none",
    reasons: [],
  } satisfies WorkspaceAttention;
}

export function parseCustomerUsageFilters(searchParams?: Record<string, string | string[] | undefined>): CustomerUsageFilters {
  const readValue = (key: string) => {
    const value = searchParams?.[key];
    return Array.isArray(value) ? value[0] || "" : value || "";
  };

  const tabValue = readValue("tab");
  const rangeValue = readValue("range");
  const sortValue = readValue("sort");

  return {
    tab: tabValue === "customers" || tabValue === "ops" ? tabValue : "overview",
    range: rangeValue === "1d" || rangeValue === "7d" || rangeValue === "90d" ? rangeValue : "30d",
    workspace: readValue("workspace").trim(),
    q: readValue("q").trim(),
    sort:
      sortValue === "subRevenue" ||
      sortValue === "twilioSpend" ||
      sortValue === "invoiceRevenue" ||
      sortValue === "jobsWon" ||
      sortValue === "lastActivity"
        ? sortValue
        : "attention",
  };
}

export async function getCustomerUsageDashboardData(
  filters: CustomerUsageFilters,
): Promise<CustomerUsageDashboardData> {
  const now = new Date();
  const rangeStart = getRangeStart(filters.range);
  const rangeStart7d = getRangeStart("7d");
  const rangeStart30d = getRangeStart("30d");
  const rangeStart90d = getRangeStart("90d");
  const currentMonthStart = startOfMonth(now);

  const [
    workspaces,
    contacts,
    deals,
    invoices,
    voiceCalls,
    activityLogs,
    incidents,
    feedback,
    launch,
    webhookDiagnostics,
  ] = await Promise.all([
    fetchWorkspaceBase(),
    db.contact.findMany({
      select: {
        id: true,
        workspaceId: true,
        createdAt: true,
      },
    }),
    db.deal.findMany({
      select: {
        id: true,
        title: true,
        workspaceId: true,
        contactId: true,
        stage: true,
        value: true,
        invoicedAmount: true,
        metadata: true,
        createdAt: true,
        stageChangedAt: true,
        lastActivityAt: true,
      },
    }),
    db.invoice.findMany({
      select: {
        id: true,
        status: true,
        total: true,
        issuedAt: true,
        paidAt: true,
        createdAt: true,
        deal: {
          select: {
            workspaceId: true,
          },
        },
      },
    }),
    db.voiceCall.findMany({
      select: {
        id: true,
        workspaceId: true,
        callType: true,
        callerPhone: true,
        calledPhone: true,
        callerName: true,
        transcriptText: true,
        transcriptTurns: true,
        summary: true,
        metadata: true,
        startedAt: true,
        endedAt: true,
        createdAt: true,
        contact: {
          select: {
            name: true,
          },
        },
      },
    }),
    db.activityLog.findMany({
      select: {
        workspaceId: true,
        action: true,
        createdAt: true,
      },
    }),
    db.voiceIncident.findMany({
      where: {
        status: {
          not: "resolved",
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 50,
      select: {
        id: true,
        summary: true,
        severity: true,
        status: true,
        updatedAt: true,
        details: true,
      },
    }),
    db.customerFeedback.findMany({
      include: {
        contact: {
          select: { name: true },
        },
        deal: {
          select: {
            workspaceId: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    getLaunchReadiness(),
    getWebhookDiagnostics(),
  ]);

  const providerSnapshots = await mapLimit(workspaces, 4, async (workspace) => ({
    workspaceId: workspace.id,
    snapshot: await fetchProviderSnapshot(workspace),
  }));
  const providerByWorkspace = new Map(providerSnapshots.map((entry) => [entry.workspaceId, entry.snapshot]));

  const contactsByWorkspace = new Map<string, typeof contacts>();
  for (const contact of contacts) {
    const existing = contactsByWorkspace.get(contact.workspaceId) || [];
    existing.push(contact);
    contactsByWorkspace.set(contact.workspaceId, existing);
  }

  const dealsByWorkspace = new Map<string, typeof deals>();
  for (const deal of deals) {
    const existing = dealsByWorkspace.get(deal.workspaceId) || [];
    existing.push(deal);
    dealsByWorkspace.set(deal.workspaceId, existing);
  }

  const invoicesByWorkspace = new Map<string, typeof invoices>();
  for (const invoice of invoices) {
    const workspaceId = invoice.deal.workspaceId;
    const existing = invoicesByWorkspace.get(workspaceId) || [];
    existing.push(invoice);
    invoicesByWorkspace.set(workspaceId, existing);
  }

  const callsByWorkspace = new Map<string, typeof voiceCalls>();
  for (const call of voiceCalls) {
    if (!call.workspaceId) continue;
    const existing = callsByWorkspace.get(call.workspaceId) || [];
    existing.push(call);
    callsByWorkspace.set(call.workspaceId, existing);
  }

  const activityByWorkspace = new Map<string, typeof activityLogs>();
  for (const log of activityLogs) {
    const existing = activityByWorkspace.get(log.workspaceId) || [];
    existing.push(log);
    activityByWorkspace.set(log.workspaceId, existing);
  }

  const feedbackByWorkspace = new Map<string, typeof feedback>();
  for (const item of feedback) {
    const workspaceId = item.deal?.workspaceId;
    if (!workspaceId) continue;
    const existing = feedbackByWorkspace.get(workspaceId) || [];
    existing.push(item);
    feedbackByWorkspace.set(workspaceId, existing);
  }

  const workspaceByPhone = new Map<string, string>();
  for (const workspace of workspaces) {
    const phone = workspace.twilioPhoneNumber?.replace(/\s+/g, "");
    if (phone) {
      workspaceByPhone.set(phone, workspace.id);
    }
  }

  const incidentsByWorkspace = new Map<string, typeof incidents>();
  for (const incident of incidents) {
    const workspaceId = getIncidentWorkspaceId(incident, workspaceByPhone);
    if (!workspaceId) continue;
    const existing = incidentsByWorkspace.get(workspaceId) || [];
    existing.push(incident);
    incidentsByWorkspace.set(workspaceId, existing);
  }

  const provisioningByWorkspace = new Map(
    launch.provisioning.recentIssues.map((issue) => [issue.workspaceId, issue] as const),
  );
  const passiveHealthByWorkspace = new Map(
    launch.passiveProduction.workspaceRows.map((row) => [row.workspaceId, row] as const),
  );

  const rows = workspaces.map((workspace) => {
    const workspaceDeals = dealsByWorkspace.get(workspace.id) || [];
    const workspaceInvoices = invoicesByWorkspace.get(workspace.id) || [];
    const workspaceCalls = callsByWorkspace.get(workspace.id) || [];
    const workspaceActivity = activityByWorkspace.get(workspace.id) || [];
    const workspaceIncidents = incidentsByWorkspace.get(workspace.id) || [];
    const provider = providerByWorkspace.get(workspace.id)!;
    const passiveHealth = passiveHealthByWorkspace.get(workspace.id) || null;
    const provisioningIssue = provisioningByWorkspace.get(workspace.id) || null;

    const callsInRange = workspaceCalls.filter((call) => call.startedAt >= rangeStart);
    const paidInvoicesInRange = workspaceInvoices.filter((invoice) => invoice.status === "PAID" && invoice.paidAt && invoice.paidAt >= rangeStart);
    const lastInvoicePaidAt = workspaceInvoices
      .filter((invoice) => invoice.status === "PAID" && invoice.paidAt)
      .sort((left, right) => right.paidAt!.getTime() - left.paidAt!.getTime())[0]?.paidAt || null;
    const lastDealActivityAt = workspaceDeals.slice().sort((left, right) => right.lastActivityAt.getTime() - left.lastActivityAt.getTime())[0]?.lastActivityAt || null;
    const lastVoiceCallAt = workspaceCalls.slice().sort((left, right) => right.startedAt.getTime() - left.startedAt.getTime())[0]?.startedAt || null;
    const lastLogAt = workspaceActivity.slice().sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0]?.createdAt || null;
    const lastActivityAt = maxDate(lastLogAt, lastDealActivityAt, lastInvoicePaidAt, lastVoiceCallAt);

    const jobsWonWithTracey = countJobsWonWithTracey(workspaceDeals, rangeStart);
    const aiEstimate = estimateVoiceAiCost(callsInRange);
    const subRevenueMinusTwilio = subtractMoneyExact(
      provider.stripe.subscriptionRevenue,
      provider.stripe.currency,
      provider.twilio.monthSpend,
      provider.twilio.currency,
    );

    const attention = buildAttentionState({
      rowVoiceEnabled: workspace.voiceEnabled,
      subscriptionStatus: provider.stripe.subscriptionStatus || workspace.subscriptionStatus || "inactive",
      lastActivityAt,
      stripeCoverage: provider.stripe.coverage,
      twilioCoverage: provider.twilio.coverage,
      incidents: workspaceIncidents.length,
      provisioningIssue,
      passiveWorkspaceHealth: passiveHealth,
    });

    return {
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      ownerEmail: deriveOwnerEmail(workspace),
      workspaceType: workspace.type,
      industryType: workspace.industryType || "Unknown",
      createdAt: workspace.createdAt.toISOString(),
      subscriptionStatus: provider.stripe.subscriptionStatus || workspace.subscriptionStatus || "inactive",
      planLabel: provider.stripe.planLabel,
      billingInterval: provider.stripe.billingInterval,
      subscriptionRevenue: provider.stripe.subscriptionRevenue,
      subscriptionRevenueCurrency: provider.stripe.currency,
      twilioMonthSpend: provider.twilio.monthSpend,
      twilioMonthSpendCurrency: provider.twilio.currency,
      subRevenueMinusTwilio: subRevenueMinusTwilio.amount,
      subRevenueMinusTwilioCurrency: subRevenueMinusTwilio.currency,
      paidInvoiceRevenueInRange:
        roundMoney(paidInvoicesInRange.reduce((sum, invoice) => sum + toNumber(invoice.total), 0)) || 0,
      jobsWonWithTracey,
      voiceCallsInRange: callsInRange.length,
      lastActivityAt: toIso(lastActivityAt),
      lastVoiceCallAt: toIso(lastVoiceCallAt),
      provisioningIssue: provisioningIssue ? provisioningIssue.provisioningStatus : null,
      attentionLevel: attention.level,
      attentionReasons: attention.reasons,
      passiveHealth: passiveHealth
        ? {
            status: passiveHealth.overallStatus,
            summary: passiveHealth.summary,
          }
        : null,
      coverage: {
        stripe: provider.stripe.coverage,
        twilio: provider.twilio.coverage,
        aiEstimate: aiEstimate.coverage,
      },
    } satisfies CustomerUsageRow;
  });

  const search = normalizeSearch(filters.q);
  const filteredRows = rows.filter((row) => {
    if (!search) return true;
    const haystack = normalizeSearch([
      row.workspaceName,
      row.ownerEmail,
      row.workspaceType,
      row.industryType,
      row.subscriptionStatus,
    ].join(" "));

    return haystack.includes(search);
  });

  const attentionRank: Record<CustomerUsageRow["attentionLevel"], number> = {
    critical: 0,
    warning: 1,
    none: 2,
  };

  filteredRows.sort((left, right) => {
    if (filters.sort === "subRevenue") {
      return (right.subscriptionRevenue || 0) - (left.subscriptionRevenue || 0);
    }
    if (filters.sort === "twilioSpend") {
      return (right.twilioMonthSpend || 0) - (left.twilioMonthSpend || 0);
    }
    if (filters.sort === "invoiceRevenue") {
      return right.paidInvoiceRevenueInRange - left.paidInvoiceRevenueInRange;
    }
    if (filters.sort === "jobsWon") {
      return right.jobsWonWithTracey - left.jobsWonWithTracey;
    }
    if (filters.sort === "lastActivity") {
      return new Date(right.lastActivityAt || 0).getTime() - new Date(left.lastActivityAt || 0).getTime();
    }

    const attentionDiff = attentionRank[left.attentionLevel] - attentionRank[right.attentionLevel];
    if (attentionDiff !== 0) return attentionDiff;
    return (right.subscriptionRevenue || 0) - (left.subscriptionRevenue || 0);
  });

  const selectedRow = filteredRows.find((row) => row.workspaceId === filters.workspace) || filteredRows[0] || null;

  const selectedWorkspace = selectedRow
    ? (() => {
        const workspace = workspaces.find((entry) => entry.id === selectedRow.workspaceId);
        if (!workspace) return null;

        const workspaceDeals = dealsByWorkspace.get(workspace.id) || [];
        const workspaceContacts = contactsByWorkspace.get(workspace.id) || [];
        const workspaceInvoices = invoicesByWorkspace.get(workspace.id) || [];
        const workspaceCalls = callsByWorkspace.get(workspace.id) || [];
        const workspaceIncidents = incidentsByWorkspace.get(workspace.id) || [];
        const workspaceFeedback = feedbackByWorkspace.get(workspace.id) || [];
        const provider = providerByWorkspace.get(workspace.id)!;
        const callsInRange = workspaceCalls.filter((call) => call.startedAt >= rangeStart);
        const inboundCallsInRange = callsInRange.filter((call) => inferCallDirection(call.callType) === "inbound");
        const outboundCallsInRange = callsInRange.filter((call) => inferCallDirection(call.callType) === "outbound");
        const completedCallsInRange = callsInRange.filter((call) => Boolean(call.endedAt));
        const totalMinutesInRange =
          roundMoney(callsInRange.reduce((sum, call) => sum + getCallDurationMinutes(call.startedAt, call.endedAt), 0)) || 0;
        const wonDeals = workspaceDeals.filter((deal) => deal.stage === "WON");
        const currentMonthJobsWonWithTracey = countJobsWonWithTracey(workspaceDeals, currentMonthStart);
        const stageDistribution = Object.entries(
          workspaceDeals.reduce<Record<string, number>>((acc, deal) => {
            acc[deal.stage] = (acc[deal.stage] || 0) + 1;
            return acc;
          }, {}),
        )
          .map(([stage, count]) => ({
            stage: STAGE_LABELS[stage] || stage,
            count,
          }))
          .sort((left, right) => right.count - left.count);
        const wonDealDurations = wonDeals
          .map((deal) => Math.max(0, (deal.stageChangedAt.getTime() - deal.createdAt.getTime()) / 86_400_000))
          .filter((value) => Number.isFinite(value));
        const invoicePaymentLatencies = workspaceInvoices
          .filter((invoice) => invoice.issuedAt && invoice.paidAt)
          .map((invoice) => Math.max(0, (invoice.paidAt!.getTime() - invoice.issuedAt!.getTime()) / 86_400_000));
        const paidInvoices = workspaceInvoices.filter((invoice) => invoice.status === "PAID");
        const aiEstimate = estimateVoiceAiCost(callsInRange);
        const subRevenueMinusTwilio = subtractMoneyExact(
          provider.stripe.subscriptionRevenue,
          provider.stripe.currency,
          provider.twilio.monthSpend,
          provider.twilio.currency,
        );
        const feedbackInRange = workspaceFeedback.filter((item) => item.createdAt >= rangeStart);
        const lowScoresInRange = feedbackInRange.filter((item) => item.score <= 6);

        return {
          row: selectedRow,
          identity: {
            workspaceId: workspace.id,
            workspaceName: workspace.name,
            workspaceType: workspace.type,
            industryType: workspace.industryType || "Unknown",
            ownerId: workspace.ownerId,
            ownerEmail: deriveOwnerEmail(workspace),
            voiceEnabled: workspace.voiceEnabled,
            twilioPhoneNumber: workspace.twilioPhoneNumber,
            onboardingComplete: workspace.onboardingComplete,
            tutorialComplete: workspace.tutorialComplete,
            createdAt: workspace.createdAt.toISOString(),
            updatedAt: workspace.updatedAt.toISOString(),
          },
          billing: {
            stripeCustomerId: workspace.stripeCustomerId,
            stripeSubscriptionId: workspace.stripeSubscriptionId,
            subscriptionStatus: selectedRow.subscriptionStatus,
            planLabel: selectedRow.planLabel,
            billingInterval: selectedRow.billingInterval,
            currentPeriodEnd: provider.stripe.currentPeriodEnd,
            latestInvoiceStatus: provider.stripe.latestInvoiceStatus,
            latestInvoiceAmount: provider.stripe.latestInvoiceAmount,
            latestInvoiceCurrency: provider.stripe.latestInvoiceCurrency,
            latestInvoiceDate: provider.stripe.latestInvoiceDate,
            subscriptionRevenue: provider.stripe.subscriptionRevenue,
            subscriptionRevenueCurrency: provider.stripe.currency,
            revenue7d:
              roundMoney(
                paidInvoices
                  .filter((invoice) => invoice.paidAt && invoice.paidAt >= rangeStart7d)
                  .reduce((sum, invoice) => sum + toNumber(invoice.total), 0),
              ) || 0,
            revenue30d:
              roundMoney(
                paidInvoices
                  .filter((invoice) => invoice.paidAt && invoice.paidAt >= rangeStart30d)
                  .reduce((sum, invoice) => sum + toNumber(invoice.total), 0),
              ) || 0,
            revenue90d:
              roundMoney(
                paidInvoices
                  .filter((invoice) => invoice.paidAt && invoice.paidAt >= rangeStart90d)
                  .reduce((sum, invoice) => sum + toNumber(invoice.total), 0),
              ) || 0,
            revenueLifetime: roundMoney(paidInvoices.reduce((sum, invoice) => sum + toNumber(invoice.total), 0)) || 0,
            paidInvoiceCount: paidInvoices.length,
            unpaidInvoiceCount: workspaceInvoices.filter((invoice) => !["PAID", "VOID"].includes(invoice.status)).length,
          },
          funnel: {
            contactsTotal: workspaceContacts.length,
            contactsNew7d: workspaceContacts.filter((contact) => contact.createdAt >= rangeStart7d).length,
            contactsNew30d: workspaceContacts.filter((contact) => contact.createdAt >= rangeStart30d).length,
            dealsCreated7d: workspaceDeals.filter((deal) => deal.createdAt >= rangeStart7d).length,
            dealsCreated30d: workspaceDeals.filter((deal) => deal.createdAt >= rangeStart30d).length,
            dealsWon: wonDeals.length,
            dealsLost: workspaceDeals.filter((deal) => deal.stage === "LOST").length,
            dealsOpen: workspaceDeals.filter((deal) => !["WON", "LOST", "DELETED", "ARCHIVED"].includes(deal.stage)).length,
            stageDistribution,
            winRatePercent: roundMoney((wonDeals.length / Math.max(workspaceDeals.length, 1)) * 100) || 0,
            averageDaysToWin:
              roundMoney(
                wonDealDurations.length
                  ? wonDealDurations.reduce((sum, value) => sum + value, 0) / wonDealDurations.length
                  : 0,
              ) || 0,
            jobsWonWithTracey: countJobsWonWithTracey(workspaceDeals, rangeStart),
            jobsWonWithTraceyCurrentMonth: currentMonthJobsWonWithTracey,
            averageInvoiceValue:
              roundMoney(
                paidInvoices.length
                  ? paidInvoices.reduce((sum, invoice) => sum + toNumber(invoice.total), 0) / paidInvoices.length
                  : 0,
              ) || 0,
            invoicePaymentLatencyDays:
              invoicePaymentLatencies.length
                ? roundMoney(invoicePaymentLatencies.reduce((sum, value) => sum + value, 0) / invoicePaymentLatencies.length)
                : null,
          },
          voice: {
            totalCallsInRange: callsInRange.length,
            inboundCallsInRange: inboundCallsInRange.length,
            outboundCallsInRange: outboundCallsInRange.length,
            completedCallsInRange: completedCallsInRange.length,
            incompleteCallsInRange: callsInRange.length - completedCallsInRange.length,
            totalMinutesInRange,
            averageDurationMinutes: roundMoney(safeDivide(totalMinutesInRange, callsInRange.length)) || 0,
            maxDurationMinutes:
              roundMoney(
                callsInRange.reduce((max, call) => Math.max(max, getCallDurationMinutes(call.startedAt, call.endedAt)), 0),
              ) || 0,
            recentCalls: workspaceCalls
              .slice()
              .sort((left, right) => right.startedAt.getTime() - left.startedAt.getTime())
              .slice(0, 10)
              .map((call) => ({
                id: call.id,
                startedAt: call.startedAt.toISOString(),
                durationMinutes: roundMoney(getCallDurationMinutes(call.startedAt, call.endedAt)) || 0,
                callerPhone: call.callerPhone,
                calledPhone: call.calledPhone,
                callType: call.callType,
                contactName: call.contact?.name || call.callerName || null,
                hasSummary: Boolean(call.summary),
                hasTranscript: Boolean(call.transcriptText),
              })),
            incidents: workspaceIncidents.map((incident) => ({
              id: incident.id,
              summary: incident.summary,
              severity: incident.severity,
              status: incident.status,
              updatedAt: incident.updatedAt.toISOString(),
              details: incident.details ?? null,
            })),
          },
          costs: {
            subscriptionRevenue: provider.stripe.subscriptionRevenue,
            subscriptionRevenueCurrency: provider.stripe.currency,
            twilioMonthSpend: provider.twilio.monthSpend,
            twilioDaySpend: provider.twilio.daySpend,
            twilioCurrency: provider.twilio.currency,
            subRevenueMinusTwilio: subRevenueMinusTwilio.amount,
            subRevenueMinusTwilioCurrency: subRevenueMinusTwilio.currency,
            costPerWonJob: calculateCostPerWonJob(provider.twilio.monthSpend, currentMonthJobsWonWithTracey),
            costPerWonJobCurrency: provider.twilio.currency,
            twilioUsageCategories: provider.twilio.categories,
            estimatedAiCost: aiEstimate,
          },
          activity: {
            lastDealCreatedAt: toIso(workspaceDeals.slice().sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0]?.createdAt || null),
            lastDealWonAt: toIso(wonDeals.slice().sort((left, right) => right.stageChangedAt.getTime() - left.stageChangedAt.getTime())[0]?.stageChangedAt || null),
            lastInvoicePaidAt: toIso(paidInvoices.slice().sort((left, right) => right.paidAt!.getTime() - left.paidAt!.getTime())[0]?.paidAt || null),
            lastVoiceCallAt: selectedRow.lastVoiceCallAt,
            lastWorkspaceActivityAt: selectedRow.lastActivityAt,
            attentionReasons: selectedRow.attentionReasons,
          },
          feedback: {
            feedbackCountInRange: feedbackInRange.length,
            averageScoreInRange:
              feedbackInRange.length
                ? roundMoney(feedbackInRange.reduce((sum, item) => sum + item.score, 0) / feedbackInRange.length)
                : null,
            lowScoresInRange: lowScoresInRange.length,
            unresolvedLowScores: workspaceFeedback.filter((item) => item.score <= 6 && !item.resolved).length,
            recentFeedback: workspaceFeedback.slice(0, 8).map((item) => ({
              id: item.id,
              score: item.score,
              comment: item.comment,
              resolved: item.resolved,
              createdAt: item.createdAt.toISOString(),
              contactName: item.contact.name || "Unknown contact",
              dealTitle: item.deal?.title || "Unknown deal",
            })),
          },
        };
      })()
    : null;

  const paidCustomers = filteredRows.filter((row) => ["active", "trialing"].includes(row.subscriptionStatus.toLowerCase())).length;
  const subscriptionRevenue = aggregateMoney(
    filteredRows.map((row) => ({
      amount: row.subscriptionRevenue,
      currency: row.subscriptionRevenueCurrency,
    })),
  );
  const twilioMonthSpend = aggregateMoney(
    filteredRows.map((row) => ({
      amount: row.twilioMonthSpend,
      currency: row.twilioMonthSpendCurrency,
    })),
  );
  const subRevenueMinusTwilio = aggregateMoney(
    filteredRows.map((row) => ({
      amount: row.subRevenueMinusTwilio,
      currency: row.subRevenueMinusTwilioCurrency,
    })),
  );

  const stripeCoverage = {
    live: filteredRows.filter((row) => row.coverage.stripe === "live").length,
    degraded: filteredRows.filter((row) => row.coverage.stripe === "degraded").length,
    missing: filteredRows.filter((row) => row.coverage.stripe === "missing").length,
  } satisfies Record<CoverageStatus, number>;
  const twilioCoverage = {
    live: filteredRows.filter((row) => row.coverage.twilio === "live").length,
    degraded: filteredRows.filter((row) => row.coverage.twilio === "degraded").length,
    missing: filteredRows.filter((row) => row.coverage.twilio === "missing").length,
  } satisfies Record<CoverageStatus, number>;
  const aiEstimateCoverage = {
    live: filteredRows.filter((row) => row.coverage.aiEstimate === "live").length,
    degraded: filteredRows.filter((row) => row.coverage.aiEstimate === "degraded").length,
    missing: filteredRows.filter((row) => row.coverage.aiEstimate === "missing").length,
  } satisfies Record<CoverageStatus, number>;

  const providerFailures = [
    ...(launch.voiceCritical.status !== "healthy"
      ? [{
          id: "voice-critical",
          label: "Voice critical",
          status: launch.voiceCritical.status,
          summary: launch.voiceCritical.summary,
          lastSeenAt: launch.checkedAt,
          source: "ops" as const,
        }]
      : []),
    ...(launch.monitoring.healthAudit.status !== "healthy"
      ? [{
          id: "monitor-health-audit",
          label: "Voice agent health audit",
          status: launch.monitoring.healthAudit.status,
          summary: launch.monitoring.healthAudit.summary,
          lastSeenAt: launch.monitoring.healthAudit.lastFailureAt || launch.checkedAt,
          source: "ops" as const,
        }]
      : []),
    ...(launch.monitoring.watchdog.status !== "healthy"
      ? [{
          id: "monitor-watchdog",
          label: "Voice monitor watchdog",
          status: launch.monitoring.watchdog.status,
          summary: launch.monitoring.watchdog.summary,
          lastSeenAt: launch.monitoring.watchdog.lastFailureAt || launch.checkedAt,
          source: "ops" as const,
        }]
      : []),
    ...(launch.monitoring.passiveTraffic.status !== "healthy"
      ? [{
          id: "monitor-passive-traffic",
          label: "Passive traffic audit",
          status: launch.monitoring.passiveTraffic.status,
          summary: launch.monitoring.passiveTraffic.summary,
          lastSeenAt: launch.monitoring.passiveTraffic.lastFailureAt || launch.checkedAt,
          source: "ops" as const,
        }]
      : []),
    ...(launch.communications.status !== "healthy"
      ? [{
          id: "communications",
          label: "Communications readiness",
          status: launch.communications.status,
          summary: launch.communications.summary,
          lastSeenAt: launch.checkedAt,
          source: "ops" as const,
        }]
      : []),
    ...(launch.provisioning.status !== "healthy"
      ? [{
          id: "provisioning",
          label: "Provisioning",
          status: launch.provisioning.status,
          summary: launch.provisioning.summary,
          lastSeenAt: launch.provisioning.recentIssues[0]?.updatedAt || launch.checkedAt,
          source: "ops" as const,
        }]
      : []),
    ...(launch.passiveProduction.status !== "healthy"
      ? [{
          id: "passive-production",
          label: "Passive production health",
          status: launch.passiveProduction.status,
          summary: launch.passiveProduction.summary,
          lastSeenAt: launch.checkedAt,
          source: "ops" as const,
        }]
      : []),
    ...webhookDiagnostics
      .filter((provider) => {
        if (provider.errorCount === 0) return false;
        if (!provider.lastSuccess && provider.lastError) return true;
        if (!provider.lastError) return false;
        return new Date(provider.lastError).getTime() >= new Date(provider.lastSuccess || 0).getTime();
      })
      .map((provider) => ({
        id: `webhook-${provider.provider}`,
        label: `${provider.provider} webhook`,
        status: "degraded" as RollupStatus,
        summary: `${provider.errorCount} error event${provider.errorCount === 1 ? "" : "s"} recorded.`,
        lastSeenAt: provider.lastError,
        source: "webhook" as const,
      })),
  ];

  const newestProvisioningFailures = launch.provisioning.recentIssues
    .filter((issue) => issue.provisioningStatus === "failed" || issue.provisioningStatus === "blocked_duplicate")
    .slice(0, 6);

  return {
    filters,
    truthModel: {
      exact: "Taken straight from stored records or live provider data, or calculated directly from those exact inputs without fallback guesses.",
      rollup: "A status summary built from exact checks. Use it to skim quickly, then inspect the exact rows underneath before acting.",
      estimate: "Voice-only AI cost estimated from persisted call transcripts and the published rate card in code. It never appears in the top truth KPIs.",
    },
    overview: {
      totalCustomers: filteredRows.length,
      paidCustomers,
      paidInvoiceRevenueInRange:
        roundMoney(filteredRows.reduce((sum, row) => sum + row.paidInvoiceRevenueInRange, 0)) || 0,
      jobsWonWithTracey: filteredRows.reduce((sum, row) => sum + row.jobsWonWithTracey, 0),
      customersNeedingAction: filteredRows.filter((row) => row.attentionLevel !== "none").length,
      openProvisioningBlockers: launch.provisioning.counts.failed + launch.provisioning.counts.blocked_duplicate,
      opsIssueCount: providerFailures.length,
      subscriptionRevenue,
      twilioMonthSpend,
      subRevenueMinusTwilio,
      coverage: {
        stripe: stripeCoverage,
        twilio: twilioCoverage,
        aiEstimate: aiEstimateCoverage,
      },
      lists: {
        immediateAttentionCustomers: filteredRows
          .filter((row) => row.attentionLevel !== "none")
          .slice(0, 8)
          .map((row) => ({
            workspaceId: row.workspaceId,
            workspaceName: row.workspaceName,
            level: row.attentionLevel === "critical" ? "critical" : "warning",
            reasons: row.attentionReasons.slice(0, 3),
          })),
        newestProvisioningFailures,
        staleCustomers: filteredRows
          .filter((row) => !row.lastActivityAt || new Date(row.lastActivityAt) < subDays(new Date(), 30))
          .slice(0, 8)
          .map((row) => ({
            workspaceId: row.workspaceId,
            workspaceName: row.workspaceName,
            lastActivityAt: row.lastActivityAt,
            reasons: row.attentionReasons.filter((reason) => reason.toLowerCase().includes("activity")),
          })),
        providerFailures: providerFailures.slice(0, 8),
      },
    },
    rows: filteredRows,
    selectedWorkspace,
    ops: {
      launch,
      webhookDiagnostics,
    },
  };
}
