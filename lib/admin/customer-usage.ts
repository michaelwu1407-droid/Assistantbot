import { subDays, subMonths } from "date-fns";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { getBillingIntervalForPriceId, getPlanLabelForPriceId } from "@/lib/billing-plan";
import { getWebhookDiagnostics } from "@/actions/webhook-actions";
import { getLatencySnapshot } from "@/lib/telemetry/latency";
import { stripe } from "@/lib/stripe";

export type UsageRange = "7d" | "30d" | "90d" | "1y";
export type CustomerUsageSort =
  | "mrr"
  | "twilioCost"
  | "revenue"
  | "calls"
  | "recentActivity"
  | "health";

export type CustomerUsageFilters = {
  range: UsageRange;
  q: string;
  status: string;
  industry: string;
  voice: "all" | "enabled" | "disabled";
  sort: CustomerUsageSort;
  workspace: string;
};

type HealthStatus = "healthy" | "degraded" | "unhealthy";

type TwilioUsageCategory = {
  category: string;
  usage: number;
  usageUnit: string;
  price: number;
  priceUnit: string;
};

type ProviderSnapshot = {
  stripe: {
    available: boolean;
    degraded: boolean;
    live: boolean;
    normalizedMrr: number;
    subscriptionStatus: string | null;
    currentPeriodEnd: string | null;
    latestInvoiceStatus: string | null;
    latestInvoiceAmount: number | null;
    latestInvoiceDate: string | null;
  };
  twilio: {
    available: boolean;
    degraded: boolean;
    live: boolean;
    monthSpend: number;
    daySpend: number;
    categories: TwilioUsageCategory[];
  };
  ai: {
    available: false;
    degraded: true;
    note: string;
  };
};

export type CustomerUsageRow = {
  workspaceId: string;
  workspaceName: string;
  ownerEmail: string;
  workspaceType: string;
  industryType: string;
  createdAt: string;
  onboardingComplete: boolean;
  tutorialComplete: boolean;
  subscriptionStatus: string;
  planLabel: string;
  billingInterval: string;
  currentPeriodEnd: string | null;
  teamMembers: number;
  contactsTotal: number;
  contactsNewInRange: number;
  dealsTotal: number;
  dealsWon: number;
  dealsLost: number;
  dealsOpen: number;
  invoicesDraft: number;
  invoicesIssued: number;
  invoicesPaid: number;
  invoicesVoid: number;
  completedRevenueInRange: number;
  averageInvoiceValue: number;
  voiceEnabled: boolean;
  twilioPhoneNumber: string | null;
  twilioSubaccountPresent: boolean;
  voiceCallCountInRange: number;
  voiceMinutesInRange: number;
  lastVoiceCallAt: string | null;
  currentMonthTwilioSpend: number | null;
  twilioSpendPerCall: number | null;
  twilioSpendPerWonDeal: number | null;
  normalizedMrr: number | null;
  marginProxy: number | null;
  lastActivityAt: string | null;
  lastWebhookSuccess: string | null;
  lastWebhookError: string | null;
  healthStatus: HealthStatus;
  healthReasons: string[];
  coverage: {
    stripe: "live" | "stored" | "missing";
    twilio: "live" | "stored" | "missing";
    ai: "missing";
  };
};

export type CustomerUsageDashboardData = {
  filters: CustomerUsageFilters;
  summary: {
    totalWorkspaces: number;
    activePaidWorkspaces: number;
    inactiveOrTrialWorkspaces: number;
    totalInternalUsers: number;
    totalContacts: number;
    totalDeals: number;
    totalVoiceCallsInRange: number;
    totalCompletedRevenueInRange: number;
    normalizedMrr: number;
    currentMonthTwilioSpend: number;
    liveStripeCoverageCount: number;
    liveTwilioCoverageCount: number;
    missingCostCoverageCount: number;
    unhealthyMonitorWorkspaces: number;
    voiceDisabledWorkspaces: number;
    pastDueSubscriptions: number;
    staleActivityWorkspaces: number;
  };
  rows: CustomerUsageRow[];
  selectedWorkspace: {
    row: CustomerUsageRow;
    identity: {
      workspaceId: string;
      workspaceName: string;
      ownerId: string | null;
      ownerEmail: string;
      createdAt: string;
      updatedAt: string;
      voiceEnabled: boolean;
      autoCallLeads: boolean;
      onboardingComplete: boolean;
      tutorialComplete: boolean;
    };
    billing: {
      stripeCustomerId: string | null;
      stripeSubscriptionId: string | null;
      planLabel: string;
      billingInterval: string;
      subscriptionStatus: string;
      currentPeriodEnd: string | null;
      latestInvoiceStatus: string | null;
      latestInvoiceAmount: number | null;
      latestInvoiceDate: string | null;
      revenue7d: number;
      revenue30d: number;
      revenue90d: number;
      revenueLifetime: number;
      paidInvoiceTotal: number;
      unpaidInvoiceCount: number;
    };
    funnel: {
      contactsTotal: number;
      contactsNew7d: number;
      contactsNew30d: number;
      dealsCreated7d: number;
      dealsCreated30d: number;
      stageDistribution: Array<{ stage: string; count: number }>;
      winRate: number;
      averageDaysToWin: number;
      jobsWonWithTracey: number;
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
    cost: {
      twilioMonthToDate: number | null;
      twilioDayToDate: number | null;
      twilioUsageCategories: TwilioUsageCategory[];
      normalizedMrr: number | null;
      grossMarginProxy: number | null;
      costPerContact: number | null;
      costPerCall: number | null;
      costPerWonJob: number | null;
      aiCostNote: string;
    };
    activity: {
      lastDealCreatedAt: string | null;
      lastDealWonAt: string | null;
      lastInvoicePaidAt: string | null;
      lastVoiceCallAt: string | null;
      lastWorkspaceActivityAt: string | null;
      staleWarnings: string[];
    };
  } | null;
  ops: {
    monitorRuns: Array<{
      monitorKey: string;
      status: string;
      summary: string;
      checkedAt: string;
      lastSuccessAt: string | null;
      lastFailureAt: string | null;
    }>;
    webhookDiagnostics: Awaited<ReturnType<typeof getWebhookDiagnostics>>;
    latencySnapshot: Awaited<ReturnType<typeof getLatencySnapshot>>;
  };
  coverage: {
    stripe: {
      live: number;
      stored: number;
      missing: number;
    };
    twilio: {
      live: number;
      stored: number;
      missing: number;
    };
    ai: {
      missing: number;
    };
  };
};

type WorkspaceRecord = Awaited<ReturnType<typeof fetchWorkspaceBase>>[number];

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

function getRangeStart(range: UsageRange) {
  const now = new Date();
  if (range === "7d") return subDays(now, 7);
  if (range === "90d") return subDays(now, 90);
  if (range === "1y") return subMonths(now, 12);
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

function safeDivide(value: number, divisor: number) {
  if (!divisor) return null;
  return value / divisor;
}

function roundMoney(value: number | null) {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
}

function toIso(value?: Date | null) {
  return value ? value.toISOString() : null;
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
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

function detectTraceyWonDeal(metadata: unknown, stage: string, createdAt: Date, stageChangedAt: Date | null) {
  if (!["NEGOTIATION", "SCHEDULED", "PIPELINE", "INVOICED", "PENDING_COMPLETION", "WON"].includes(stage)) {
    return false;
  }

  const meta = metadata && typeof metadata === "object" ? (metadata as Record<string, unknown>) : {};
  const source = typeof meta.source === "string" ? meta.source.toLowerCase() : "";
  const hasSystemSource =
    Boolean(source) ||
    Boolean(meta.leadWonEmail) ||
    typeof meta.leadSource === "string" ||
    typeof meta.provider === "string" ||
    typeof meta.portal === "string";

  const createdDirectlyAtCurrentStage =
    stageChangedAt && Math.abs(stageChangedAt.getTime() - createdAt.getTime()) < 60_000;

  if (!hasSystemSource && createdDirectlyAtCurrentStage) {
    return false;
  }

  return true;
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

function normalizeStripeMrrFromSubscription(subscription: Stripe.Subscription) {
  const items = Array.isArray(subscription.items?.data) ? subscription.items.data : [];
  const monthly = items.reduce((sum: number, item: Stripe.SubscriptionItem) => {
    const unitAmount = toNumber(item?.price?.unit_amount) / 100;
    const quantity = toNumber(item?.quantity) || 1;
    const interval = item?.price?.recurring?.interval;
    if (interval === "year") {
      return sum + (unitAmount * quantity) / 12;
    }
    return sum + unitAmount * quantity;
  }, 0);

  return roundMoney(monthly) || 0;
}

async function fetchStripeSnapshot(workspace: WorkspaceRecord): Promise<ProviderSnapshot["stripe"]> {
  if (!workspace.stripeCustomerId && !workspace.stripeSubscriptionId && !workspace.stripePriceId) {
    return {
      available: false,
      degraded: false,
      live: false,
      normalizedMrr: 0,
      subscriptionStatus: workspace.subscriptionStatus || null,
      currentPeriodEnd: toIso(workspace.stripeCurrentPeriodEnd),
      latestInvoiceStatus: null,
      latestInvoiceAmount: null,
      latestInvoiceDate: null,
    };
  }

  try {
    const subscription: Stripe.Subscription | null = workspace.stripeSubscriptionId
      ? await withTimeout(
          stripe
            .subscriptions.retrieve(workspace.stripeSubscriptionId, {
            expand: ["latest_invoice", "items.data.price"],
            })
            .then((result) => result as unknown as Stripe.Subscription),
          6_000,
          null,
        )
      : null;

    const latestInvoice =
      subscription && subscription.latest_invoice && typeof subscription.latest_invoice === "object"
        ? (subscription.latest_invoice as Stripe.Invoice)
        : workspace.stripeCustomerId
          ? await withTimeout(
              stripe.invoices
                .list({
                  customer: workspace.stripeCustomerId,
                  limit: 1,
                })
                .then((result) => result.data[0] || null),
              6_000,
              null,
            )
          : null;

    const fallbackMrr = workspace.stripePriceId
      ? getBillingIntervalForPriceId(workspace.stripePriceId) === "yearly"
        ? 59
        : 59
      : 0;
    const subscriptionPeriodEnd = subscription
      ? subscription.items.data.reduce((max, item) => Math.max(max, item.current_period_end || 0), 0)
      : 0;

    return {
      available: true,
      degraded: !subscription,
      live: Boolean(subscription),
      normalizedMrr: subscription ? normalizeStripeMrrFromSubscription(subscription) : fallbackMrr,
      subscriptionStatus: subscription?.status || workspace.subscriptionStatus || null,
      currentPeriodEnd:
        subscriptionPeriodEnd
          ? new Date(subscriptionPeriodEnd * 1000).toISOString()
          : toIso(workspace.stripeCurrentPeriodEnd),
      latestInvoiceStatus: latestInvoice?.status || null,
      latestInvoiceAmount:
        typeof latestInvoice?.amount_paid === "number"
          ? roundMoney(latestInvoice.amount_paid / 100)
          : typeof latestInvoice?.amount_due === "number"
            ? roundMoney(latestInvoice.amount_due / 100)
            : null,
      latestInvoiceDate:
        typeof latestInvoice?.created === "number" ? new Date(latestInvoice.created * 1000).toISOString() : null,
    };
  } catch {
    return {
      available: true,
      degraded: true,
      live: false,
      normalizedMrr: workspace.stripePriceId ? 59 : 0,
      subscriptionStatus: workspace.subscriptionStatus || null,
      currentPeriodEnd: toIso(workspace.stripeCurrentPeriodEnd),
      latestInvoiceStatus: null,
      latestInvoiceAmount: null,
      latestInvoiceDate: null,
    };
  }
}

async function fetchTwilioSnapshot(workspace: WorkspaceRecord): Promise<ProviderSnapshot["twilio"]> {
  const credentials = getTwilioCredentials(workspace);
  if (!credentials) {
    return {
      available: false,
      degraded: false,
      live: false,
      monthSpend: 0,
      daySpend: 0,
      categories: [],
    };
  }

  try {
    const [monthTotals, dayTotals, categories] = await Promise.all([
      withTimeout(fetchTwilioUsageRecords(workspace, "ThisMonth", "totalprice"), 6_000, null),
      withTimeout(fetchTwilioUsageRecords(workspace, "Today", "totalprice"), 6_000, null),
      withTimeout(fetchTwilioUsageRecords(workspace, "ThisMonth"), 6_000, null),
    ]);

    return {
      available: true,
      degraded: !monthTotals,
      live: Boolean(monthTotals),
      monthSpend: roundMoney(monthTotals?.reduce((sum, record) => sum + toNumber(record.price), 0) || 0) || 0,
      daySpend: roundMoney(dayTotals?.reduce((sum, record) => sum + toNumber(record.price), 0) || 0) || 0,
      categories: (categories || [])
        .filter((record) => record.category)
        .map((record) => ({
          category: record.category || "unknown",
          usage: toNumber(record.usage),
          usageUnit: record.usage_unit || "",
          price: roundMoney(toNumber(record.price)) || 0,
          priceUnit: record.price_unit || "",
        }))
        .sort((a, b) => b.price - a.price),
    };
  } catch {
    return {
      available: true,
      degraded: true,
      live: false,
      monthSpend: 0,
      daySpend: 0,
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
    ai: {
      available: false,
      degraded: true,
      note: "Not instrumented yet",
    },
  };
}

function buildHealthStatus(input: {
  rowVoiceEnabled: boolean;
  subscriptionStatus: string;
  lastActivityAt: string | null;
  stripeCoverage: "live" | "stored" | "missing";
  twilioCoverage: "live" | "stored" | "missing";
  incidents: number;
}) {
  const reasons: string[] = [];
  const staleCutoff = subDays(new Date(), 30);

  if (!input.rowVoiceEnabled) reasons.push("Voice disabled");
  if (["past_due", "unpaid", "canceled", "incomplete_expired"].includes(input.subscriptionStatus.toLowerCase())) {
    reasons.push(`Subscription ${input.subscriptionStatus}`);
  }
  if (input.incidents > 0) reasons.push(`${input.incidents} open voice incidents`);
  if (!input.lastActivityAt || new Date(input.lastActivityAt) < staleCutoff) reasons.push("Stale activity");
  if (input.stripeCoverage === "stored" || input.twilioCoverage === "stored") reasons.push("Provider coverage degraded");
  if (input.stripeCoverage === "missing" && input.twilioCoverage === "missing") reasons.push("Cost coverage missing");

  let status: HealthStatus = "healthy";
  if (!input.rowVoiceEnabled || reasons.some((reason) => reason.startsWith("Subscription")) || input.incidents > 0) {
    status = "unhealthy";
  } else if (reasons.length > 0) {
    status = "degraded";
  }

  return { status, reasons };
}

export function parseCustomerUsageFilters(searchParams?: Record<string, string | string[] | undefined>): CustomerUsageFilters {
  const readValue = (key: keyof CustomerUsageFilters) => {
    const value = searchParams?.[key];
    return Array.isArray(value) ? value[0] || "" : value || "";
  };

  const rangeValue = readValue("range");
  const sortValue = readValue("sort");
  const voiceValue = readValue("voice");

  return {
    range: rangeValue === "7d" || rangeValue === "90d" || rangeValue === "1y" ? rangeValue : "30d",
    q: readValue("q").trim(),
    status: readValue("status").trim(),
    industry: readValue("industry").trim(),
    voice: voiceValue === "enabled" || voiceValue === "disabled" ? voiceValue : "all",
    sort:
      sortValue === "mrr" ||
      sortValue === "revenue" ||
      sortValue === "calls" ||
      sortValue === "recentActivity" ||
      sortValue === "health"
        ? sortValue
        : "twilioCost",
    workspace: readValue("workspace").trim(),
  };
}

export async function getCustomerUsageDashboardData(
  filters: CustomerUsageFilters,
): Promise<CustomerUsageDashboardData> {
  const rangeStart = getRangeStart(filters.range);
  const rangeStart7d = getRangeStart("7d");
  const rangeStart30d = getRangeStart("30d");
  const rangeStart90d = getRangeStart("90d");

  const [
    workspaces,
    contacts,
    deals,
    invoices,
    voiceCalls,
    activityLogs,
    monitorRuns,
    incidents,
    webhookDiagnostics,
    latencySnapshot,
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
        workspaceId: true,
        stage: true,
        value: true,
        invoicedAmount: true,
        metadata: true,
        createdAt: true,
        stageChangedAt: true,
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
        startedAt: true,
        endedAt: true,
        createdAt: true,
        summary: true,
        transcriptText: true,
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
    db.opsMonitorRun.findMany({
      orderBy: {
        checkedAt: "desc",
      },
      take: 12,
      select: {
        monitorKey: true,
        status: true,
        summary: true,
        checkedAt: true,
        lastSuccessAt: true,
        lastFailureAt: true,
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
      take: 20,
      select: {
        id: true,
        summary: true,
        severity: true,
        status: true,
        updatedAt: true,
        details: true,
      },
    }),
    getWebhookDiagnostics(),
    getLatencySnapshot(),
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

  const incidentsByWorkspace = new Map<string, typeof incidents>();
  for (const incident of incidents) {
    const detailsText = JSON.stringify(incident.details || {}).toLowerCase();
    for (const workspace of workspaces) {
      const phone = (workspace.twilioPhoneNumber || "").replace(/\s+/g, "").toLowerCase();
      if (!phone || !detailsText.includes(phone)) continue;
      const existing = incidentsByWorkspace.get(workspace.id) || [];
      existing.push(incident);
      incidentsByWorkspace.set(workspace.id, existing);
    }
  }

  const rows = workspaces.map((workspace) => {
    const workspaceContacts = contactsByWorkspace.get(workspace.id) || [];
    const workspaceDeals = dealsByWorkspace.get(workspace.id) || [];
    const workspaceInvoices = invoicesByWorkspace.get(workspace.id) || [];
    const workspaceCalls = callsByWorkspace.get(workspace.id) || [];
    const workspaceActivity = activityByWorkspace.get(workspace.id) || [];
    const workspaceIncidents = incidentsByWorkspace.get(workspace.id) || [];
    const provider = providerByWorkspace.get(workspace.id);

    const contactsNewInRange = workspaceContacts.filter((contact) => contact.createdAt >= rangeStart).length;
    const dealsWon = workspaceDeals.filter((deal) => deal.stage === "WON").length;
    const dealsLost = workspaceDeals.filter((deal) => deal.stage === "LOST").length;
    const dealsOpen = workspaceDeals.filter((deal) => !["WON", "LOST", "ARCHIVED", "DELETED"].includes(deal.stage)).length;
    const invoicesDraft = workspaceInvoices.filter((invoice) => invoice.status === "DRAFT").length;
    const invoicesIssued = workspaceInvoices.filter((invoice) => invoice.status === "ISSUED").length;
    const invoicesPaid = workspaceInvoices.filter((invoice) => invoice.status === "PAID").length;
    const invoicesVoid = workspaceInvoices.filter((invoice) => invoice.status === "VOID").length;
    const completedRevenueInRange =
      roundMoney(
        workspaceInvoices
          .filter((invoice) => invoice.status === "PAID" && invoice.paidAt && invoice.paidAt >= rangeStart)
          .reduce((sum, invoice) => sum + toNumber(invoice.total), 0),
      ) || 0;
    const averageInvoiceValue =
      roundMoney(
        workspaceInvoices.length
          ? workspaceInvoices.reduce((sum, invoice) => sum + toNumber(invoice.total), 0) / workspaceInvoices.length
          : 0,
      ) || 0;
    const callsInRange = workspaceCalls.filter((call) => call.startedAt >= rangeStart);
    const voiceMinutesInRange =
      roundMoney(callsInRange.reduce((sum, call) => sum + getCallDurationMinutes(call.startedAt, call.endedAt), 0)) || 0;
    const lastVoiceCallAt =
      workspaceCalls.slice().sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0]?.startedAt || null;
    const lastActivityAt =
      workspaceActivity.slice().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]?.createdAt || null;
    const stripeCoverage = provider?.stripe.live ? "live" : provider?.stripe.available ? "stored" : "missing";
    const twilioCoverage = provider?.twilio.live ? "live" : provider?.twilio.available ? "stored" : "missing";
    const health = buildHealthStatus({
      rowVoiceEnabled: workspace.voiceEnabled,
      subscriptionStatus: provider?.stripe.subscriptionStatus || workspace.subscriptionStatus || "inactive",
      lastActivityAt: toIso(lastActivityAt),
      stripeCoverage,
      twilioCoverage,
      incidents: workspaceIncidents.length,
    });

    return {
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      ownerEmail: deriveOwnerEmail(workspace),
      workspaceType: workspace.type,
      industryType: workspace.industryType || "Unknown",
      createdAt: workspace.createdAt.toISOString(),
      onboardingComplete: workspace.onboardingComplete,
      tutorialComplete: workspace.tutorialComplete,
      subscriptionStatus: provider?.stripe.subscriptionStatus || workspace.subscriptionStatus || "inactive",
      planLabel: workspace.stripePriceId ? getPlanLabelForPriceId(workspace.stripePriceId) : "No plan",
      billingInterval: (workspace.stripePriceId ? getBillingIntervalForPriceId(workspace.stripePriceId) : null) || "n/a",
      currentPeriodEnd: provider?.stripe.currentPeriodEnd || toIso(workspace.stripeCurrentPeriodEnd),
      teamMembers: workspace.users.length,
      contactsTotal: workspaceContacts.length,
      contactsNewInRange,
      dealsTotal: workspaceDeals.length,
      dealsWon,
      dealsLost,
      dealsOpen,
      invoicesDraft,
      invoicesIssued,
      invoicesPaid,
      invoicesVoid,
      completedRevenueInRange,
      averageInvoiceValue,
      voiceEnabled: workspace.voiceEnabled,
      twilioPhoneNumber: workspace.twilioPhoneNumber,
      twilioSubaccountPresent: Boolean(workspace.twilioSubaccountId && workspace.twilioSubaccountAuthToken),
      voiceCallCountInRange: callsInRange.length,
      voiceMinutesInRange,
      lastVoiceCallAt: toIso(lastVoiceCallAt),
      currentMonthTwilioSpend: provider?.twilio.available ? roundMoney(provider.twilio.monthSpend) : null,
      twilioSpendPerCall: provider?.twilio.available ? roundMoney(safeDivide(provider.twilio.monthSpend, callsInRange.length) || 0) : null,
      twilioSpendPerWonDeal: provider?.twilio.available ? roundMoney(safeDivide(provider.twilio.monthSpend, dealsWon) || 0) : null,
      normalizedMrr: provider?.stripe.available ? roundMoney(provider.stripe.normalizedMrr) : null,
      marginProxy:
        provider?.stripe.available || provider?.twilio.available
          ? roundMoney((provider?.stripe.normalizedMrr || 0) - (provider?.twilio.monthSpend || 0))
          : null,
      lastActivityAt: toIso(lastActivityAt),
      lastWebhookSuccess: null,
      lastWebhookError: null,
      healthStatus: health.status,
      healthReasons: health.reasons,
      coverage: {
        stripe: stripeCoverage,
        twilio: twilioCoverage,
        ai: "missing",
      },
    } satisfies CustomerUsageRow;
  });

  const search = normalizeSearch(filters.q);
  const filteredRows = rows.filter((row) => {
    if (search) {
      const haystack = normalizeSearch(
        [row.workspaceName, row.ownerEmail, row.workspaceType, row.industryType, row.twilioPhoneNumber || ""].join(" "),
      );
      if (!haystack.includes(search)) return false;
    }

    if (filters.status && row.subscriptionStatus.toLowerCase() !== filters.status.toLowerCase()) return false;
    if (filters.industry && row.industryType.toLowerCase() !== filters.industry.toLowerCase()) return false;
    if (filters.voice === "enabled" && !row.voiceEnabled) return false;
    if (filters.voice === "disabled" && row.voiceEnabled) return false;

    return true;
  });

  const healthOrder: Record<HealthStatus, number> = {
    unhealthy: 0,
    degraded: 1,
    healthy: 2,
  };

  filteredRows.sort((a, b) => {
    if (filters.sort === "mrr") return (b.normalizedMrr || 0) - (a.normalizedMrr || 0);
    if (filters.sort === "revenue") return b.completedRevenueInRange - a.completedRevenueInRange;
    if (filters.sort === "calls") return b.voiceCallCountInRange - a.voiceCallCountInRange;
    if (filters.sort === "recentActivity") {
      return new Date(b.lastActivityAt || 0).getTime() - new Date(a.lastActivityAt || 0).getTime();
    }
    if (filters.sort === "health") {
      return healthOrder[a.healthStatus] - healthOrder[b.healthStatus];
    }
    return (b.currentMonthTwilioSpend || 0) - (a.currentMonthTwilioSpend || 0);
  });

  const selectedRow = filteredRows.find((row) => row.workspaceId === filters.workspace) || filteredRows[0] || null;

  const selectedWorkspace = selectedRow
    ? (() => {
        const workspace = workspaces.find((entry) => entry.id === selectedRow.workspaceId);
        if (!workspace) return null;

        const workspaceContacts = contactsByWorkspace.get(workspace.id) || [];
        const workspaceDeals = dealsByWorkspace.get(workspace.id) || [];
        const workspaceInvoices = invoicesByWorkspace.get(workspace.id) || [];
        const workspaceCalls = callsByWorkspace.get(workspace.id) || [];
        const workspaceIncidents = incidentsByWorkspace.get(workspace.id) || [];
        const provider = providerByWorkspace.get(workspace.id);
        const callsInRange = workspaceCalls.filter((call) => call.startedAt >= rangeStart);
        const inboundCallsInRange = callsInRange.filter((call) => inferCallDirection(call.callType) === "inbound");
        const outboundCallsInRange = callsInRange.filter((call) => inferCallDirection(call.callType) === "outbound");
        const completedCallsInRange = callsInRange.filter((call) => Boolean(call.endedAt));
        const wonDeals = workspaceDeals.filter((deal) => deal.stage === "WON");
        const paidInvoices = workspaceInvoices.filter((invoice) => invoice.status === "PAID");
        const totalMinutesInRange =
          roundMoney(callsInRange.reduce((sum, call) => sum + getCallDurationMinutes(call.startedAt, call.endedAt), 0)) || 0;
        const stageDistribution = Object.entries(
          workspaceDeals.reduce<Record<string, number>>((acc, deal) => {
            acc[deal.stage] = (acc[deal.stage] || 0) + 1;
            return acc;
          }, {}),
        )
          .map(([stage, count]) => ({ stage: STAGE_LABELS[stage] || stage, count }))
          .sort((a, b) => b.count - a.count);
        const wonDealDurations = wonDeals
          .map((deal) => Math.max(0, (deal.stageChangedAt.getTime() - deal.createdAt.getTime()) / 86_400_000))
          .filter((value) => Number.isFinite(value));
        const invoicePaymentLatencies = workspaceInvoices
          .filter((invoice) => invoice.issuedAt && invoice.paidAt)
          .map((invoice) => Math.max(0, (invoice.paidAt!.getTime() - invoice.issuedAt!.getTime()) / 86_400_000));
        const staleWarnings: string[] = [];

        if (!selectedRow.lastActivityAt || new Date(selectedRow.lastActivityAt) < subDays(new Date(), 30)) {
          staleWarnings.push("No meaningful workspace activity in the last 30 days.");
        }
        if (!selectedRow.lastVoiceCallAt || new Date(selectedRow.lastVoiceCallAt) < rangeStart) {
          staleWarnings.push(`No voice calls recorded inside the current ${filters.range} window.`);
        }
        if (provider?.stripe.subscriptionStatus && ["past_due", "unpaid"].includes(provider.stripe.subscriptionStatus)) {
          staleWarnings.push(`Subscription is ${provider.stripe.subscriptionStatus}.`);
        }

        return {
          row: selectedRow,
          identity: {
            workspaceId: workspace.id,
            workspaceName: workspace.name,
            ownerId: workspace.ownerId,
            ownerEmail: deriveOwnerEmail(workspace),
            createdAt: workspace.createdAt.toISOString(),
            updatedAt: workspace.updatedAt.toISOString(),
            voiceEnabled: workspace.voiceEnabled,
            autoCallLeads: workspace.autoCallLeads,
            onboardingComplete: workspace.onboardingComplete,
            tutorialComplete: workspace.tutorialComplete,
          },
          billing: {
            stripeCustomerId: workspace.stripeCustomerId,
            stripeSubscriptionId: workspace.stripeSubscriptionId,
            planLabel: selectedRow.planLabel,
            billingInterval: selectedRow.billingInterval,
            subscriptionStatus: selectedRow.subscriptionStatus,
            currentPeriodEnd: selectedRow.currentPeriodEnd,
            latestInvoiceStatus: provider?.stripe.latestInvoiceStatus || null,
            latestInvoiceAmount: provider?.stripe.latestInvoiceAmount || null,
            latestInvoiceDate: provider?.stripe.latestInvoiceDate || null,
            revenue7d:
              roundMoney(
                workspaceInvoices
                  .filter((invoice) => invoice.status === "PAID" && invoice.paidAt && invoice.paidAt >= rangeStart7d)
                  .reduce((sum, invoice) => sum + toNumber(invoice.total), 0),
              ) || 0,
            revenue30d:
              roundMoney(
                workspaceInvoices
                  .filter((invoice) => invoice.status === "PAID" && invoice.paidAt && invoice.paidAt >= rangeStart30d)
                  .reduce((sum, invoice) => sum + toNumber(invoice.total), 0),
              ) || 0,
            revenue90d:
              roundMoney(
                workspaceInvoices
                  .filter((invoice) => invoice.status === "PAID" && invoice.paidAt && invoice.paidAt >= rangeStart90d)
                  .reduce((sum, invoice) => sum + toNumber(invoice.total), 0),
              ) || 0,
            revenueLifetime: roundMoney(paidInvoices.reduce((sum, invoice) => sum + toNumber(invoice.total), 0)) || 0,
            paidInvoiceTotal: paidInvoices.length,
            unpaidInvoiceCount: workspaceInvoices.filter((invoice) => !["PAID", "VOID"].includes(invoice.status)).length,
          },
          funnel: {
            contactsTotal: workspaceContacts.length,
            contactsNew7d: workspaceContacts.filter((contact) => contact.createdAt >= rangeStart7d).length,
            contactsNew30d: workspaceContacts.filter((contact) => contact.createdAt >= rangeStart30d).length,
            dealsCreated7d: workspaceDeals.filter((deal) => deal.createdAt >= rangeStart7d).length,
            dealsCreated30d: workspaceDeals.filter((deal) => deal.createdAt >= rangeStart30d).length,
            stageDistribution,
            winRate: roundMoney((wonDeals.length / Math.max(workspaceDeals.length, 1)) * 100) || 0,
            averageDaysToWin:
              roundMoney(
                wonDealDurations.length
                  ? wonDealDurations.reduce((sum, value) => sum + value, 0) / wonDealDurations.length
                  : 0,
              ) || 0,
            jobsWonWithTracey: wonDeals.filter((deal) =>
              detectTraceyWonDeal(deal.metadata, deal.stage, deal.createdAt, deal.stageChangedAt),
            ).length,
            averageInvoiceValue: selectedRow.averageInvoiceValue,
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
            averageDurationMinutes: roundMoney(safeDivide(totalMinutesInRange, callsInRange.length) || 0) || 0,
            maxDurationMinutes:
              roundMoney(
                callsInRange.reduce((max, call) => Math.max(max, getCallDurationMinutes(call.startedAt, call.endedAt)), 0),
              ) || 0,
            recentCalls: workspaceCalls
              .slice()
              .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
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
          cost: {
            twilioMonthToDate: provider?.twilio.available ? roundMoney(provider.twilio.monthSpend) : null,
            twilioDayToDate: provider?.twilio.available ? roundMoney(provider.twilio.daySpend) : null,
            twilioUsageCategories: provider?.twilio.categories || [],
            normalizedMrr: provider?.stripe.available ? roundMoney(provider.stripe.normalizedMrr) : null,
            grossMarginProxy:
              provider?.stripe.available || provider?.twilio.available
                ? roundMoney((provider?.stripe.normalizedMrr || 0) - (provider?.twilio.monthSpend || 0))
                : null,
            costPerContact: provider?.twilio.available ? roundMoney(safeDivide(provider.twilio.monthSpend, workspaceContacts.length) || 0) : null,
            costPerCall: provider?.twilio.available ? roundMoney(safeDivide(provider.twilio.monthSpend, workspaceCalls.length) || 0) : null,
            costPerWonJob: provider?.twilio.available ? roundMoney(safeDivide(provider.twilio.monthSpend, wonDeals.length) || 0) : null,
            aiCostNote: provider?.ai.note || "Not instrumented yet",
          },
          activity: {
            lastDealCreatedAt: toIso(workspaceDeals.slice().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]?.createdAt || null),
            lastDealWonAt: toIso(wonDeals.slice().sort((a, b) => b.stageChangedAt.getTime() - a.stageChangedAt.getTime())[0]?.stageChangedAt || null),
            lastInvoicePaidAt: toIso(paidInvoices.slice().sort((a, b) => b.paidAt!.getTime() - a.paidAt!.getTime())[0]?.paidAt || null),
            lastVoiceCallAt: selectedRow.lastVoiceCallAt,
            lastWorkspaceActivityAt: selectedRow.lastActivityAt,
            staleWarnings,
          },
        };
      })()
    : null;

  const summary = {
    totalWorkspaces: filteredRows.length,
    activePaidWorkspaces: filteredRows.filter((row) => ["active", "trialing"].includes(row.subscriptionStatus.toLowerCase())).length,
    inactiveOrTrialWorkspaces: filteredRows.filter((row) => !["active"].includes(row.subscriptionStatus.toLowerCase())).length,
    totalInternalUsers: filteredRows.reduce((sum, row) => sum + row.teamMembers, 0),
    totalContacts: filteredRows.reduce((sum, row) => sum + row.contactsTotal, 0),
    totalDeals: filteredRows.reduce((sum, row) => sum + row.dealsTotal, 0),
    totalVoiceCallsInRange: filteredRows.reduce((sum, row) => sum + row.voiceCallCountInRange, 0),
    totalCompletedRevenueInRange: roundMoney(filteredRows.reduce((sum, row) => sum + row.completedRevenueInRange, 0)) || 0,
    normalizedMrr: roundMoney(filteredRows.reduce((sum, row) => sum + (row.normalizedMrr || 0), 0)) || 0,
    currentMonthTwilioSpend: roundMoney(filteredRows.reduce((sum, row) => sum + (row.currentMonthTwilioSpend || 0), 0)) || 0,
    liveStripeCoverageCount: filteredRows.filter((row) => row.coverage.stripe === "live").length,
    liveTwilioCoverageCount: filteredRows.filter((row) => row.coverage.twilio === "live").length,
    missingCostCoverageCount: filteredRows.filter((row) => row.coverage.stripe === "missing" && row.coverage.twilio === "missing").length,
    unhealthyMonitorWorkspaces: filteredRows.filter((row) => row.healthStatus === "unhealthy").length,
    voiceDisabledWorkspaces: filteredRows.filter((row) => !row.voiceEnabled).length,
    pastDueSubscriptions: filteredRows.filter((row) =>
      ["past_due", "unpaid", "canceled", "incomplete_expired"].includes(row.subscriptionStatus.toLowerCase()),
    ).length,
    staleActivityWorkspaces: filteredRows.filter((row) => !row.lastActivityAt || new Date(row.lastActivityAt) < subDays(new Date(), 30)).length,
  };

  const coverage = {
    stripe: {
      live: filteredRows.filter((row) => row.coverage.stripe === "live").length,
      stored: filteredRows.filter((row) => row.coverage.stripe === "stored").length,
      missing: filteredRows.filter((row) => row.coverage.stripe === "missing").length,
    },
    twilio: {
      live: filteredRows.filter((row) => row.coverage.twilio === "live").length,
      stored: filteredRows.filter((row) => row.coverage.twilio === "stored").length,
      missing: filteredRows.filter((row) => row.coverage.twilio === "missing").length,
    },
    ai: {
      missing: filteredRows.length,
    },
  };

  return {
    filters,
    summary,
    rows: filteredRows,
    selectedWorkspace,
    ops: {
      monitorRuns: monitorRuns.map((run) => ({
        monitorKey: run.monitorKey,
        status: run.status,
        summary: run.summary,
        checkedAt: run.checkedAt.toISOString(),
        lastSuccessAt: toIso(run.lastSuccessAt),
        lastFailureAt: toIso(run.lastFailureAt),
      })),
      webhookDiagnostics,
      latencySnapshot,
    },
    coverage,
  };
}
