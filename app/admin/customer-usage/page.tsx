import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  getCustomerUsageDashboardData,
  parseCustomerUsageFilters,
  type CustomerUsageFilters,
  type CustomerUsageRow,
} from "@/lib/admin/customer-usage";
import { requireInternalAdminAccess } from "@/lib/internal-admin";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

const RANGE_OPTIONS = ["7d", "30d", "90d", "1y"] as const;
const SORT_OPTIONS = ["twilioCost", "mrr", "revenue", "calls", "recentActivity", "health"] as const;
const VOICE_OPTIONS = ["all", "enabled", "disabled"] as const;

function formatNumber(value: number | null | undefined) {
  if (value == null) return "--";
  return value.toLocaleString("en-AU");
}

function formatMoney(value: number | null | undefined) {
  if (value == null) return "--";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "--";
  return new Date(value).toLocaleString("en-AU", {
    timeZone: "Australia/Sydney",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatShortDate(value: string | null | undefined) {
  if (!value) return "--";
  return new Date(value).toLocaleDateString("en-AU", {
    timeZone: "Australia/Sydney",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function compactStatusVariant(status: CustomerUsageRow["healthStatus"] | string) {
  if (status === "unhealthy") return "destructive" as const;
  if (status === "degraded") return "secondary" as const;
  return "default" as const;
}

function buildQuery(filters: CustomerUsageFilters, overrides: Partial<Record<keyof CustomerUsageFilters, string>>) {
  const params = new URLSearchParams();
  const nextFilters: Record<keyof CustomerUsageFilters, string> = {
    range: filters.range,
    q: filters.q,
    status: filters.status,
    industry: filters.industry,
    voice: filters.voice,
    sort: filters.sort,
    workspace: filters.workspace,
    ...overrides,
  };

  for (const [key, value] of Object.entries(nextFilters)) {
    if (value) params.set(key, value);
  }

  return `?${params.toString()}`;
}

function SummaryMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-700"
      : tone === "warn"
        ? "text-amber-700"
        : tone === "bad"
          ? "text-red-700"
          : "text-slate-900";

  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className={`mt-2 text-xl font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2 text-sm last:border-b-0">
      <div className="text-slate-500">{label}</div>
      <div className="max-w-[65%] text-right font-medium text-slate-900">{value}</div>
    </div>
  );
}

export default async function CustomerUsagePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireInternalAdminAccess();

  const resolvedSearchParams = await searchParams;
  const filters = parseCustomerUsageFilters(resolvedSearchParams);
  const data = await getCustomerUsageDashboardData(filters);
  const selected = data.selectedWorkspace;
  const statusOptions = Array.from(new Set(data.rows.map((row) => row.subscriptionStatus))).sort();
  const industryOptions = Array.from(new Set(data.rows.map((row) => row.industryType))).sort();

  return (
    <div className="mx-auto max-w-[1800px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Customer Usage + Cost Monitor</h1>
        <p className="text-sm text-slate-600">
          Hidden internal surface for cross-customer usage, billing, voice, and coverage monitoring.
        </p>
      </div>

      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <SummaryMetric label="Workspaces" value={formatNumber(data.summary.totalWorkspaces)} />
        <SummaryMetric label="Paid Active" value={formatNumber(data.summary.activePaidWorkspaces)} tone="good" />
        <SummaryMetric label="Internal Users" value={formatNumber(data.summary.totalInternalUsers)} />
        <SummaryMetric label="Revenue In Range" value={formatMoney(data.summary.totalCompletedRevenueInRange)} tone="good" />
        <SummaryMetric label="Normalized MRR" value={formatMoney(data.summary.normalizedMrr)} tone="good" />
        <SummaryMetric label="Twilio MTD" value={formatMoney(data.summary.currentMonthTwilioSpend)} tone="warn" />
        <SummaryMetric label="Contacts" value={formatNumber(data.summary.totalContacts)} />
        <SummaryMetric label="Deals" value={formatNumber(data.summary.totalDeals)} />
        <SummaryMetric label="Voice Calls" value={formatNumber(data.summary.totalVoiceCallsInRange)} />
        <SummaryMetric label="Live Stripe" value={formatNumber(data.summary.liveStripeCoverageCount)} />
        <SummaryMetric label="Live Twilio" value={formatNumber(data.summary.liveTwilioCoverageCount)} />
        <SummaryMetric label="Missing Cost Coverage" value={formatNumber(data.summary.missingCostCoverageCount)} tone="bad" />
        <SummaryMetric label="Voice Disabled" value={formatNumber(data.summary.voiceDisabledWorkspaces)} tone="warn" />
        <SummaryMetric label="Past Due Subs" value={formatNumber(data.summary.pastDueSubscriptions)} tone="bad" />
        <SummaryMetric label="Stale Workspaces" value={formatNumber(data.summary.staleActivityWorkspaces)} tone="warn" />
        <SummaryMetric label="Unhealthy" value={formatNumber(data.summary.unhealthyMonitorWorkspaces)} tone="bad" />
      </section>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>Query-param driven controls so the exact view is shareable and stable.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-6" method="get">
            <input
              className="h-10 rounded-md border border-slate-200 px-3 text-sm"
              defaultValue={filters.q}
              name="q"
              placeholder="Search workspace, owner, number"
            />
            <select className="h-10 rounded-md border border-slate-200 px-3 text-sm" defaultValue={filters.range} name="range">
              {RANGE_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  Range: {value}
                </option>
              ))}
            </select>
            <select className="h-10 rounded-md border border-slate-200 px-3 text-sm" defaultValue={filters.status} name="status">
              <option value="">All subscription statuses</option>
              {statusOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <select className="h-10 rounded-md border border-slate-200 px-3 text-sm" defaultValue={filters.industry} name="industry">
              <option value="">All industries</option>
              {industryOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <select className="h-10 rounded-md border border-slate-200 px-3 text-sm" defaultValue={filters.voice} name="voice">
              {VOICE_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  Voice: {value}
                </option>
              ))}
            </select>
            <select className="h-10 rounded-md border border-slate-200 px-3 text-sm" defaultValue={filters.sort} name="sort">
              {SORT_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  Sort: {value}
                </option>
              ))}
            </select>
            {filters.workspace ? <input type="hidden" name="workspace" value={filters.workspace} /> : null}
            <div className="md:col-span-2 xl:col-span-6 flex gap-2">
              <button className="h-10 rounded-md bg-slate-900 px-4 text-sm font-medium text-white" type="submit">
                Apply Filters
              </button>
              <Link className="inline-flex h-10 items-center rounded-md border border-slate-200 px-4 text-sm font-medium text-slate-700" href="/admin/customer-usage">
                Reset
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2.2fr)_minmax(360px,1fr)]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">All Customers</CardTitle>
            <CardDescription>{data.rows.length} workspace rows after current filters.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Table className="min-w-[1800px] text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Onboarding</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Period End</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Contacts</TableHead>
                  <TableHead>Deals</TableHead>
                  <TableHead>Invoices</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Avg Invoice</TableHead>
                  <TableHead>Voice</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Subacct</TableHead>
                  <TableHead>Calls</TableHead>
                  <TableHead>Mins</TableHead>
                  <TableHead>Last Call</TableHead>
                  <TableHead>Twilio MTD</TableHead>
                  <TableHead>$/Call</TableHead>
                  <TableHead>$/Won</TableHead>
                  <TableHead>MRR</TableHead>
                  <TableHead>Margin</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead>Webhook</TableHead>
                  <TableHead>Health</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map((row) => (
                  <TableRow key={row.workspaceId} className={selected?.row.workspaceId === row.workspaceId ? "bg-slate-50" : undefined}>
                    <TableCell className="font-medium">
                      <Link className="text-slate-900 underline-offset-4 hover:underline" href={buildQuery(filters, { workspace: row.workspaceId })}>
                        {row.workspaceName}
                      </Link>
                    </TableCell>
                    <TableCell>{row.ownerEmail}</TableCell>
                    <TableCell>
                      <div>{row.workspaceType}</div>
                      <div className="text-[11px] text-slate-500">{row.industryType}</div>
                    </TableCell>
                    <TableCell>{formatShortDate(row.createdAt)}</TableCell>
                    <TableCell>{row.onboardingComplete ? "Done" : "Pending"}</TableCell>
                    <TableCell>{row.subscriptionStatus}</TableCell>
                    <TableCell>
                      <div>{row.planLabel}</div>
                      <div className="text-[11px] text-slate-500">{row.billingInterval}</div>
                    </TableCell>
                    <TableCell>{formatShortDate(row.currentPeriodEnd)}</TableCell>
                    <TableCell>{formatNumber(row.teamMembers)}</TableCell>
                    <TableCell>
                      <div>{formatNumber(row.contactsTotal)}</div>
                      <div className="text-[11px] text-slate-500">+{formatNumber(row.contactsNewInRange)}</div>
                    </TableCell>
                    <TableCell>
                      <div>{formatNumber(row.dealsTotal)}</div>
                      <div className="text-[11px] text-slate-500">W {row.dealsWon} / L {row.dealsLost} / O {row.dealsOpen}</div>
                    </TableCell>
                    <TableCell className="text-[11px]">
                      <div>D {row.invoicesDraft}</div>
                      <div>I {row.invoicesIssued}</div>
                      <div>P {row.invoicesPaid}</div>
                      <div>V {row.invoicesVoid}</div>
                    </TableCell>
                    <TableCell>{formatMoney(row.completedRevenueInRange)}</TableCell>
                    <TableCell>{formatMoney(row.averageInvoiceValue)}</TableCell>
                    <TableCell>{row.voiceEnabled ? "Enabled" : "Disabled"}</TableCell>
                    <TableCell>{row.twilioPhoneNumber || "--"}</TableCell>
                    <TableCell>{row.twilioSubaccountPresent ? "Yes" : "No"}</TableCell>
                    <TableCell>{formatNumber(row.voiceCallCountInRange)}</TableCell>
                    <TableCell>{formatNumber(row.voiceMinutesInRange)}</TableCell>
                    <TableCell>{formatShortDate(row.lastVoiceCallAt)}</TableCell>
                    <TableCell>{formatMoney(row.currentMonthTwilioSpend)}</TableCell>
                    <TableCell>{formatMoney(row.twilioSpendPerCall)}</TableCell>
                    <TableCell>{formatMoney(row.twilioSpendPerWonDeal)}</TableCell>
                    <TableCell>{formatMoney(row.normalizedMrr)}</TableCell>
                    <TableCell>{formatMoney(row.marginProxy)}</TableCell>
                    <TableCell>{formatShortDate(row.lastActivityAt)}</TableCell>
                    <TableCell className="text-[11px] text-slate-500">
                      <div>S {formatShortDate(row.lastWebhookSuccess)}</div>
                      <div>E {formatShortDate(row.lastWebhookError)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant={compactStatusVariant(row.healthStatus)}>{row.healthStatus}</Badge>
                        <div className="text-[11px] text-slate-500">{row.healthReasons.slice(0, 2).join(", ") || "Nominal"}</div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {data.rows.length === 0 ? (
                  <TableRow>
                    <TableCell className="text-sm text-slate-500" colSpan={28}>
                      No workspaces matched the current filters.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Selected Workspace</CardTitle>
            <CardDescription>Per-customer drilldown for identity, usage, billing, voice, cost, and activity.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {selected ? (
              <>
                <section>
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-900">{selected.identity.workspaceName}</div>
                    <Badge variant={compactStatusVariant(selected.row.healthStatus)}>{selected.row.healthStatus}</Badge>
                  </div>
                  <DetailItem label="Workspace ID" value={selected.identity.workspaceId} />
                  <DetailItem label="Owner" value={selected.identity.ownerEmail} />
                  <DetailItem label="Owner ID" value={selected.identity.ownerId || "--"} />
                  <DetailItem label="Created" value={formatDate(selected.identity.createdAt)} />
                  <DetailItem label="Updated" value={formatDate(selected.identity.updatedAt)} />
                  <DetailItem label="Voice Enabled" value={selected.identity.voiceEnabled ? "Yes" : "No"} />
                  <DetailItem label="Auto Call Leads" value={selected.identity.autoCallLeads ? "Yes" : "No"} />
                  <DetailItem label="Onboarding" value={selected.identity.onboardingComplete ? "Complete" : "Incomplete"} />
                  <DetailItem label="Tutorial" value={selected.identity.tutorialComplete ? "Complete" : "Incomplete"} />
                </section>

                <section>
                  <div className="mb-2 text-sm font-semibold text-slate-900">Subscription + Billing</div>
                  <DetailItem label="Stripe Customer" value={selected.billing.stripeCustomerId || "--"} />
                  <DetailItem label="Stripe Subscription" value={selected.billing.stripeSubscriptionId || "--"} />
                  <DetailItem label="Plan" value={`${selected.billing.planLabel} (${selected.billing.billingInterval})`} />
                  <DetailItem label="Status" value={selected.billing.subscriptionStatus} />
                  <DetailItem label="Current Period End" value={formatDate(selected.billing.currentPeriodEnd)} />
                  <DetailItem label="Latest Invoice Status" value={selected.billing.latestInvoiceStatus || "--"} />
                  <DetailItem label="Latest Invoice Amount" value={formatMoney(selected.billing.latestInvoiceAmount)} />
                  <DetailItem label="Latest Invoice Date" value={formatDate(selected.billing.latestInvoiceDate)} />
                  <DetailItem label="Revenue 7d" value={formatMoney(selected.billing.revenue7d)} />
                  <DetailItem label="Revenue 30d" value={formatMoney(selected.billing.revenue30d)} />
                  <DetailItem label="Revenue 90d" value={formatMoney(selected.billing.revenue90d)} />
                  <DetailItem label="Revenue Lifetime" value={formatMoney(selected.billing.revenueLifetime)} />
                  <DetailItem label="Paid Invoice Count" value={formatNumber(selected.billing.paidInvoiceTotal)} />
                  <DetailItem label="Unpaid Invoice Count" value={formatNumber(selected.billing.unpaidInvoiceCount)} />
                </section>

                <section>
                  <div className="mb-2 text-sm font-semibold text-slate-900">Usage Funnel</div>
                  <DetailItem label="Contacts Total" value={formatNumber(selected.funnel.contactsTotal)} />
                  <DetailItem label="Contacts New 7d" value={formatNumber(selected.funnel.contactsNew7d)} />
                  <DetailItem label="Contacts New 30d" value={formatNumber(selected.funnel.contactsNew30d)} />
                  <DetailItem label="Deals Created 7d" value={formatNumber(selected.funnel.dealsCreated7d)} />
                  <DetailItem label="Deals Created 30d" value={formatNumber(selected.funnel.dealsCreated30d)} />
                  <DetailItem label="Win Rate" value={`${formatNumber(selected.funnel.winRate)}%`} />
                  <DetailItem label="Avg Days To Win" value={formatNumber(selected.funnel.averageDaysToWin)} />
                  <DetailItem label="Jobs Won With Tracey" value={formatNumber(selected.funnel.jobsWonWithTracey)} />
                  <DetailItem label="Avg Invoice Value" value={formatMoney(selected.funnel.averageInvoiceValue)} />
                  <DetailItem label="Invoice Payment Latency" value={selected.funnel.invoicePaymentLatencyDays == null ? "--" : `${selected.funnel.invoicePaymentLatencyDays} days`} />
                  <div className="mt-3 space-y-2">
                    <div className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Stage Distribution</div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {selected.funnel.stageDistribution.map((item) => (
                        <div key={item.stage} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                          <div className="text-slate-500">{item.stage}</div>
                          <div className="mt-1 font-semibold text-slate-900">{item.count}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section>
                  <div className="mb-2 text-sm font-semibold text-slate-900">Voice Usage</div>
                  <DetailItem label="Calls In Range" value={formatNumber(selected.voice.totalCallsInRange)} />
                  <DetailItem label="Inbound / Outbound" value={`${selected.voice.inboundCallsInRange} / ${selected.voice.outboundCallsInRange}`} />
                  <DetailItem label="Completed / Incomplete" value={`${selected.voice.completedCallsInRange} / ${selected.voice.incompleteCallsInRange}`} />
                  <DetailItem label="Total Minutes" value={formatNumber(selected.voice.totalMinutesInRange)} />
                  <DetailItem label="Avg Duration" value={`${formatNumber(selected.voice.averageDurationMinutes)} min`} />
                  <DetailItem label="Max Duration" value={`${formatNumber(selected.voice.maxDurationMinutes)} min`} />
                  <div className="mt-3 space-y-2">
                    <div className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Recent Calls</div>
                    <div className="space-y-2">
                      {selected.voice.recentCalls.map((call) => (
                        <div key={call.id} className="rounded-md border border-slate-200 px-3 py-2 text-xs">
                          <div className="flex items-center justify-between gap-4">
                            <div className="font-medium text-slate-900">{call.callType}</div>
                            <div className="text-slate-500">{formatDate(call.startedAt)}</div>
                          </div>
                          <div className="mt-1 text-slate-600">
                            {call.callerPhone || "--"} to {call.calledPhone || "--"} | {call.contactName || "Unknown contact"} | {call.durationMinutes} min
                          </div>
                          <div className="mt-1 text-slate-500">Summary {call.hasSummary ? "yes" : "no"} | Transcript {call.hasTranscript ? "yes" : "no"}</div>
                        </div>
                      ))}
                      {selected.voice.recentCalls.length === 0 ? <div className="text-xs text-slate-500">No calls recorded.</div> : null}
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Open Voice Incidents</div>
                    {selected.voice.incidents.length > 0 ? (
                      <div className="space-y-2">
                        {selected.voice.incidents.map((incident) => (
                          <div key={incident.id} className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs">
                            <div className="flex items-center justify-between gap-3">
                              <div className="font-medium text-red-900">{incident.summary}</div>
                              <Badge variant="destructive">{incident.severity}</Badge>
                            </div>
                            <div className="mt-1 text-red-700">{incident.status} | {formatDate(incident.updatedAt)}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500">No open incidents mapped to this workspace.</div>
                    )}
                  </div>
                </section>

                <section>
                  <div className="mb-2 text-sm font-semibold text-slate-900">Cost Block</div>
                  <DetailItem label="Twilio Month To Date" value={formatMoney(selected.cost.twilioMonthToDate)} />
                  <DetailItem label="Twilio Day To Date" value={formatMoney(selected.cost.twilioDayToDate)} />
                  <DetailItem label="Normalized MRR" value={formatMoney(selected.cost.normalizedMrr)} />
                  <DetailItem label="Gross Margin Proxy" value={formatMoney(selected.cost.grossMarginProxy)} />
                  <DetailItem label="Cost Per Contact" value={formatMoney(selected.cost.costPerContact)} />
                  <DetailItem label="Cost Per Call" value={formatMoney(selected.cost.costPerCall)} />
                  <DetailItem label="Cost Per Won Job" value={formatMoney(selected.cost.costPerWonJob)} />
                  <DetailItem label="AI Cost" value={selected.cost.aiCostNote} />
                  <div className="mt-3 space-y-2">
                    <div className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Twilio Usage Categories</div>
                    {selected.cost.twilioUsageCategories.length > 0 ? (
                      <div className="space-y-2">
                        {selected.cost.twilioUsageCategories.map((category) => (
                          <div key={category.category} className="rounded-md border border-slate-200 px-3 py-2 text-xs">
                            <div className="flex items-center justify-between gap-3">
                              <div className="font-medium text-slate-900">{category.category}</div>
                              <div className="text-slate-900">{formatMoney(category.price)}</div>
                            </div>
                            <div className="mt-1 text-slate-500">
                              {formatNumber(category.usage)} {category.usageUnit || "units"} | {category.priceUnit || "currency"}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500">No live Twilio category spend available.</div>
                    )}
                  </div>
                </section>

                <section>
                  <div className="mb-2 text-sm font-semibold text-slate-900">Activity + Recency</div>
                  <DetailItem label="Last Deal Created" value={formatDate(selected.activity.lastDealCreatedAt)} />
                  <DetailItem label="Last Deal Won" value={formatDate(selected.activity.lastDealWonAt)} />
                  <DetailItem label="Last Invoice Paid" value={formatDate(selected.activity.lastInvoicePaidAt)} />
                  <DetailItem label="Last Voice Call" value={formatDate(selected.activity.lastVoiceCallAt)} />
                  <DetailItem label="Last Workspace Activity" value={formatDate(selected.activity.lastWorkspaceActivityAt)} />
                  <div className="mt-3 space-y-2">
                    <div className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Warnings</div>
                    {selected.activity.staleWarnings.length > 0 ? (
                      <div className="space-y-2">
                        {selected.activity.staleWarnings.map((warning) => (
                          <div key={warning} className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                            {warning}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500">No stale-activity warnings.</div>
                    )}
                  </div>
                </section>
              </>
            ) : (
              <div className="text-sm text-slate-500">No workspace selected.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ops Monitor Runs</CardTitle>
            <CardDescription>Latest internal monitor status records.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.ops.monitorRuns.map((run) => (
              <div key={run.monitorKey} className="rounded-md border border-slate-200 px-3 py-2 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-slate-900">{run.monitorKey}</div>
                  <Badge variant={compactStatusVariant(run.status)}>{run.status}</Badge>
                </div>
                <div className="mt-1 text-slate-600">{run.summary}</div>
                <div className="mt-1 text-slate-500">
                  Checked {formatDate(run.checkedAt)} | Success {formatDate(run.lastSuccessAt)} | Failure {formatDate(run.lastFailureAt)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Webhook Diagnostics</CardTitle>
            <CardDescription>Global provider webhook recency and error volume.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.ops.webhookDiagnostics.map((provider) => (
              <div key={provider.provider} className="rounded-md border border-slate-200 px-3 py-2 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium capitalize text-slate-900">{provider.provider}</div>
                  <div className="text-slate-500">
                    {provider.successCount} success / {provider.errorCount} error
                  </div>
                </div>
                <div className="mt-1 text-slate-500">
                  Last success {formatDate(provider.lastSuccess)} | Last error {formatDate(provider.lastError)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Latency + Coverage</CardTitle>
            <CardDescription>Telemetry snapshot plus provider coverage counts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <div className="rounded-md border border-slate-200 px-3 py-2 text-xs">
                <div className="font-medium text-slate-900">Stripe Coverage</div>
                <div className="mt-1 text-slate-500">
                  Live {data.coverage.stripe.live} | Stored {data.coverage.stripe.stored} | Missing {data.coverage.stripe.missing}
                </div>
              </div>
              <div className="rounded-md border border-slate-200 px-3 py-2 text-xs">
                <div className="font-medium text-slate-900">Twilio Coverage</div>
                <div className="mt-1 text-slate-500">
                  Live {data.coverage.twilio.live} | Stored {data.coverage.twilio.stored} | Missing {data.coverage.twilio.missing}
                </div>
              </div>
              <div className="rounded-md border border-slate-200 px-3 py-2 text-xs">
                <div className="font-medium text-slate-900">AI Cost Coverage</div>
                <div className="mt-1 text-slate-500">Missing {data.coverage.ai.missing} | Not instrumented yet</div>
              </div>
            </div>
            <div className="space-y-2">
              {Object.entries(data.ops.latencySnapshot.metrics).map(([metric, snapshot]) => (
                <div key={metric} className="rounded-md border border-slate-200 px-3 py-2 text-xs">
                  <div className="font-medium text-slate-900">{metric}</div>
                  <div className="mt-1 text-slate-500">
                    p50 {snapshot.p50Ms}ms | p95 {snapshot.p95Ms}ms | max {snapshot.maxMs}ms | avg {snapshot.avgMs}ms | count {snapshot.count}
                  </div>
                </div>
              ))}
              {Object.keys(data.ops.latencySnapshot.metrics).length === 0 ? (
                <div className="text-xs text-slate-500">No latency samples stored.</div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
