import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  COST_PER_WON_JOB_FORMULA,
  getCustomerUsageDashboardData,
  JOBS_WON_WITH_TRACEY_FORMULA,
  parseCustomerUsageFilters,
  SUB_REVENUE_MINUS_TWILIO_FORMULA,
  type CoverageStatus,
  type CustomerUsageDashboardData,
  type CustomerUsageFilters,
} from "@/lib/admin/customer-usage";
import { requireInternalAdminAccess } from "@/lib/internal-admin";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function formatNumber(value: number | null | undefined) {
  if (value == null) return "--";
  return value.toLocaleString("en-AU");
}

function formatMoney(value: number | null | undefined, currency?: string | null) {
  if (value == null) return "--";
  if (!currency) return "$" + value.toLocaleString("en-AU", { maximumFractionDigits: 2 });
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
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

function truthBadge(tone: "exact" | "rollup" | "estimate") {
  if (tone === "rollup") return <Badge variant="secondary">Rollup</Badge>;
  if (tone === "estimate") return <Badge variant="outline">Estimate</Badge>;
  return <Badge variant="outline">Exact</Badge>;
}

function statusVariant(status: string) {
  if (status === "unhealthy" || status === "critical") return "destructive" as const;
  if (status === "degraded" || status === "warning") return "secondary" as const;
  return "default" as const;
}

function coverageVariant(status: CoverageStatus) {
  if (status === "missing") return "destructive" as const;
  if (status === "degraded") return "secondary" as const;
  return "default" as const;
}

function buildQuery(filters: CustomerUsageFilters, overrides: Partial<Record<keyof CustomerUsageFilters, string>>) {
  const params = new URLSearchParams();
  const nextFilters: Record<keyof CustomerUsageFilters, string> = {
    tab: filters.tab,
    range: filters.range,
    workspace: filters.workspace,
    q: filters.q,
    sort: filters.sort,
    ...overrides,
  };

  for (const [key, value] of Object.entries(nextFilters)) {
    if (value) params.set(key, value);
  }

  return `?${params.toString()}`;
}

function KpiCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "exact" | "rollup" | "estimate";
}) {
  return (
    <Card className="rounded-[18px]">
      <CardHeader className="space-y-2 pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-semibold text-slate-900">{label}</CardTitle>
          {truthBadge(tone)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight text-slate-950">{value}</div>
        <p className="mt-2 text-xs leading-5 text-slate-600">{detail}</p>
      </CardContent>
    </Card>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2 text-sm last:border-b-0">
      <div className="text-slate-500">{label}</div>
      <div className="max-w-[60%] text-right font-medium text-slate-900">{value}</div>
    </div>
  );
}

function SectionNote({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700">{children}</div>;
}

function CoverageCard({
  title,
  live,
  degraded,
  missing,
}: {
  title: string;
  live: number;
  degraded: number;
  missing: number;
}) {
  return (
    <Card className="rounded-[18px]">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-slate-900">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex gap-2 text-xs">
        <Badge variant="default">Live {live}</Badge>
        <Badge variant="secondary">Degraded {degraded}</Badge>
        <Badge variant="destructive">Missing {missing}</Badge>
      </CardContent>
    </Card>
  );
}

function ListCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card className="rounded-[18px]">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-slate-900">{title}</CardTitle>
        <CardDescription className="text-xs text-slate-600">{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return <div className="text-sm text-slate-500">{children}</div>;
}

function SelectedWorkspacePanel({ selected }: { selected: NonNullable<CustomerUsageDashboardData["selectedWorkspace"]> }) {
  return (
    <Card className="rounded-[18px]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">{selected.identity.workspaceName}</CardTitle>
            <CardDescription className="text-xs text-slate-600">{selected.identity.workspaceId}</CardDescription>
          </div>
          <Badge variant={statusVariant(selected.row.attentionLevel)}>{selected.row.attentionLevel}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <section>
          <div className="mb-2 text-sm font-semibold text-slate-900">Identity</div>
          <DetailItem label="Owner" value={selected.identity.ownerEmail} />
          <DetailItem label="Type" value={`${selected.identity.workspaceType} / ${selected.identity.industryType}`} />
          <DetailItem label="Tracey number" value={selected.identity.twilioPhoneNumber || "--"} />
          <DetailItem label="Voice enabled" value={selected.identity.voiceEnabled ? "Yes" : "No"} />
          <DetailItem label="Onboarding" value={selected.identity.onboardingComplete ? "Complete" : "Incomplete"} />
        </section>

        <section>
          <div className="mb-2 text-sm font-semibold text-slate-900">Billing</div>
          <DetailItem label="Status" value={selected.billing.subscriptionStatus} />
          <DetailItem label="Plan" value={`${selected.billing.planLabel} (${selected.billing.billingInterval})`} />
          <DetailItem label="Sub revenue" value={formatMoney(selected.billing.subscriptionRevenue, selected.billing.subscriptionRevenueCurrency)} />
          <DetailItem label="Latest Stripe invoice" value={`${selected.billing.latestInvoiceStatus || "--"} / ${formatMoney(selected.billing.latestInvoiceAmount, selected.billing.latestInvoiceCurrency)}`} />
          <DetailItem label="Revenue 30d" value={formatMoney(selected.billing.revenue30d)} />
          <DetailItem label="Revenue lifetime" value={formatMoney(selected.billing.revenueLifetime)} />
        </section>

        <section>
          <div className="mb-2 text-sm font-semibold text-slate-900">Funnel</div>
          <DetailItem label="Contacts" value={formatNumber(selected.funnel.contactsTotal)} />
          <DetailItem label="Deals won / lost / open" value={`${selected.funnel.dealsWon} / ${selected.funnel.dealsLost} / ${selected.funnel.dealsOpen}`} />
          <DetailItem label="Win rate" value={`${formatNumber(selected.funnel.winRatePercent)}%`} />
          <DetailItem label="Avg days to win" value={formatNumber(selected.funnel.averageDaysToWin)} />
          <DetailItem label="Jobs Won With Tracey" value={formatNumber(selected.funnel.jobsWonWithTracey)} />
          <SectionNote>{JOBS_WON_WITH_TRACEY_FORMULA}</SectionNote>
        </section>

        <section>
          <div className="mb-2 text-sm font-semibold text-slate-900">Voice</div>
          <DetailItem label="Calls in range" value={formatNumber(selected.voice.totalCallsInRange)} />
          <DetailItem label="Inbound / outbound" value={`${selected.voice.inboundCallsInRange} / ${selected.voice.outboundCallsInRange}`} />
          <DetailItem label="Minutes in range" value={formatNumber(selected.voice.totalMinutesInRange)} />
          <DetailItem label="Avg duration" value={`${formatNumber(selected.voice.averageDurationMinutes)} min`} />
          <DetailItem label="Open incidents" value={formatNumber(selected.voice.incidents.length)} />
        </section>

        <section>
          <div className="mb-2 text-sm font-semibold text-slate-900">Costs</div>
          <DetailItem label="Twilio month spend" value={formatMoney(selected.costs.twilioMonthSpend, selected.costs.twilioCurrency)} />
          <DetailItem label="Sub rev - Twilio" value={formatMoney(selected.costs.subRevenueMinusTwilio, selected.costs.subRevenueMinusTwilioCurrency)} />
          <DetailItem label="Cost per won job" value={formatMoney(selected.costs.costPerWonJob, selected.costs.costPerWonJobCurrency)} />
          <DetailItem label="Estimated AI cost" value={formatMoney(selected.costs.estimatedAiCost.totalUsd, "USD")} />
          <SectionNote>{SUB_REVENUE_MINUS_TWILIO_FORMULA}</SectionNote>
          <SectionNote>{COST_PER_WON_JOB_FORMULA}</SectionNote>
          <SectionNote>{selected.costs.estimatedAiCost.note}</SectionNote>
        </section>

        <section>
          <div className="mb-2 text-sm font-semibold text-slate-900">Activity</div>
          <DetailItem label="Last activity" value={formatDate(selected.activity.lastWorkspaceActivityAt)} />
          <DetailItem label="Last voice call" value={formatDate(selected.activity.lastVoiceCallAt)} />
          <DetailItem label="Last invoice paid" value={formatDate(selected.activity.lastInvoicePaidAt)} />
          <div className="mt-3 space-y-2">
            {selected.activity.attentionReasons.length === 0 ? (
              <EmptyState>No active attention signals.</EmptyState>
            ) : (
              selected.activity.attentionReasons.map((reason) => (
                <div key={reason} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  {reason}
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <div className="mb-2 text-sm font-semibold text-slate-900">Feedback</div>
          <DetailItem label="Ratings in range" value={formatNumber(selected.feedback.feedbackCountInRange)} />
          <DetailItem label="Average score" value={selected.feedback.averageScoreInRange == null ? "--" : `${selected.feedback.averageScoreInRange}/10`} />
          <DetailItem label="Low scores in range" value={formatNumber(selected.feedback.lowScoresInRange)} />
          <DetailItem label="Unresolved low scores" value={formatNumber(selected.feedback.unresolvedLowScores)} />
          <div className="mt-3 space-y-2">
            {selected.feedback.recentFeedback.length === 0 ? (
              <EmptyState>No customer feedback stored yet.</EmptyState>
            ) : (
              selected.feedback.recentFeedback.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-slate-900">{item.contactName}</span>
                    <span className="text-slate-600">{item.score}/10</span>
                  </div>
                  <div className="mt-1 text-slate-500">{item.dealTitle} • {formatShortDate(item.createdAt)}</div>
                  {item.comment ? <div className="mt-1 text-slate-700">{item.comment}</div> : null}
                </div>
              ))
            )}
          </div>
        </section>
      </CardContent>
    </Card>
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

  return (
    <div className="mx-auto max-w-[1800px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Customer observability</h1>
          <p className="max-w-3xl text-sm text-slate-600">One internal source of truth for customer health, exact billing/cost coverage, and ops readiness.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["7d", "30d", "90d"] as const).map((range) => (
            <Link key={range} href={buildQuery(filters, { range, workspace: filters.workspace || "" })} className={`inline-flex h-10 items-center rounded-full px-4 text-sm font-medium ${filters.range === range ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-700"}`}>
              {range}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="rounded-[18px]"><CardContent className="pt-6">{data.truthModel.exact}</CardContent></Card>
        <Card className="rounded-[18px]"><CardContent className="pt-6">{data.truthModel.rollup}</CardContent></Card>
        <Card className="rounded-[18px]"><CardContent className="pt-6">{data.truthModel.estimate}</CardContent></Card>
      </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <KpiCard label="Paid customers" value={formatNumber(data.overview.paidCustomers)} detail={`${data.overview.totalCustomers} workspaces in current filtered view.`} tone="exact" />
        <KpiCard label="Subscription revenue" value={formatMoney(data.overview.subscriptionRevenue.amount, data.overview.subscriptionRevenue.currency)} detail={`Live Stripe coverage ${data.overview.subscriptionRevenue.coveredCount}/${data.overview.totalCustomers}.`} tone="exact" />
        <KpiCard label="Twilio month spend" value={formatMoney(data.overview.twilioMonthSpend.amount, data.overview.twilioMonthSpend.currency)} detail={`Live Twilio coverage ${data.overview.twilioMonthSpend.coveredCount}/${data.overview.totalCustomers}.`} tone="exact" />
        <KpiCard label="Paid invoice totals" value={formatMoney(data.overview.paidInvoiceRevenueInRange)} detail={`Paid invoice totals with paidAt inside the selected ${filters.range} window.`} tone="exact" />
        <KpiCard label="Jobs Won With Tracey" value={formatNumber(data.overview.jobsWonWithTracey)} detail={JOBS_WON_WITH_TRACEY_FORMULA} tone="exact" />
        <KpiCard label="Sub rev - Twilio month spend" value={formatMoney(data.overview.subRevenueMinusTwilio.amount, data.overview.subRevenueMinusTwilio.currency)} detail={`Excluded ${data.overview.subRevenueMinusTwilio.excludedCount} customers without full exact coverage.`} tone="exact" />
        <KpiCard label="Customers needing action" value={formatNumber(data.overview.customersNeedingAction)} detail="Rollup count of customers with billing, provisioning, stale-activity, or passive-health action signals." tone="rollup" />
        <KpiCard label="Open provisioning blockers" value={formatNumber(data.overview.openProvisioningBlockers)} detail="Exact count of failed or duplicate-blocked provisioning states." tone="exact" />
        <KpiCard label="Ops issues" value={formatNumber(data.overview.opsIssueCount)} detail="Rollup count of failing/stale monitors plus webhook/provider issues." tone="rollup" />
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <CoverageCard title="Stripe coverage" live={data.overview.coverage.stripe.live} degraded={data.overview.coverage.stripe.degraded} missing={data.overview.coverage.stripe.missing} />
        <CoverageCard title="Twilio coverage" live={data.overview.coverage.twilio.live} degraded={data.overview.coverage.twilio.degraded} missing={data.overview.coverage.twilio.missing} />
        <CoverageCard title="AI estimate coverage" live={data.overview.coverage.aiEstimate.live} degraded={data.overview.coverage.aiEstimate.degraded} missing={data.overview.coverage.aiEstimate.missing} />
      </section>

      <div className="flex flex-wrap gap-2">
        {([
          ["overview", "Overview"],
          ["customers", "Customers"],
          ["ops", "Ops"],
        ] as const).map(([tab, label]) => (
          <Link key={tab} href={buildQuery(filters, { tab })} className={`inline-flex h-10 items-center rounded-full px-4 text-sm font-medium ${filters.tab === tab ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-700"}`}>
            {label}
          </Link>
        ))}
      </div>

      {filters.tab === "overview" ? (
        <section className="grid gap-4 xl:grid-cols-2">
          <ListCard title="Customers needing immediate attention" description="Highest-priority customer issues first.">
            <div className="space-y-2">
              {data.overview.lists.immediateAttentionCustomers.length === 0 ? <EmptyState>No customers currently need action.</EmptyState> : data.overview.lists.immediateAttentionCustomers.map((item) => (
                <Link key={item.workspaceId} href={buildQuery(filters, { tab: "customers", workspace: item.workspaceId })} className="block rounded-xl border border-slate-200 px-3 py-3 text-sm">
                  <div className="flex items-center justify-between gap-3"><span className="font-medium text-slate-900">{item.workspaceName}</span><Badge variant={statusVariant(item.level)}>{item.level}</Badge></div>
                  <div className="mt-2 text-xs text-slate-600">{item.reasons.join(" • ")}</div>
                </Link>
              ))}
            </div>
          </ListCard>
          <ListCard title="Newest provisioning failures" description="Exact recent failures and duplicate blockers.">
            <div className="space-y-2">
              {data.overview.lists.newestProvisioningFailures.length === 0 ? <EmptyState>No open provisioning blockers.</EmptyState> : data.overview.lists.newestProvisioningFailures.map((item) => (
                <div key={`${item.workspaceId}:${item.updatedAt}`} className="rounded-xl border border-slate-200 px-3 py-3 text-sm">
                  <div className="flex items-center justify-between gap-3"><span className="font-medium text-slate-900">{item.workspaceName}</span><Badge variant={statusVariant(item.provisioningStatus === "failed" ? "critical" : "warning")}>{item.provisioningStatus}</Badge></div>
                  <div className="mt-2 text-xs text-slate-600">{item.error || "No error text"} • {formatDate(item.updatedAt)}</div>
                </div>
              ))}
            </div>
          </ListCard>
          <ListCard title="Stale customers" description="No meaningful activity in the last 30 days.">
            <div className="space-y-2">
              {data.overview.lists.staleCustomers.length === 0 ? <EmptyState>No stale customers right now.</EmptyState> : data.overview.lists.staleCustomers.map((item) => (
                <Link key={item.workspaceId} href={buildQuery(filters, { tab: "customers", workspace: item.workspaceId })} className="block rounded-xl border border-slate-200 px-3 py-3 text-sm">
                  <div className="font-medium text-slate-900">{item.workspaceName}</div>
                  <div className="mt-1 text-xs text-slate-500">Last activity {formatDate(item.lastActivityAt)}</div>
                </Link>
              ))}
            </div>
          </ListCard>
          <ListCard title="Webhook and provider failures" description="Ops or provider issues that need inspection.">
            <div className="space-y-2">
              {data.overview.lists.providerFailures.length === 0 ? <EmptyState>No active provider issues.</EmptyState> : data.overview.lists.providerFailures.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 px-3 py-3 text-sm">
                  <div className="flex items-center justify-between gap-3"><span className="font-medium text-slate-900">{item.label}</span><Badge variant={statusVariant(item.status)}>{item.source}</Badge></div>
                  <div className="mt-2 text-xs text-slate-600">{item.summary}</div>
                  <div className="mt-1 text-xs text-slate-500">Last seen {formatDate(item.lastSeenAt)}</div>
                </div>
              ))}
            </div>
          </ListCard>
        </section>
      ) : null}

      {filters.tab === "customers" ? (
        <section className="space-y-4">
          <Card className="rounded-[18px]">
            <CardContent className="pt-6">
              <form className="flex flex-col gap-3 md:flex-row" method="get">
                <input type="hidden" name="tab" value="customers" />
                <input type="hidden" name="range" value={filters.range} />
                {filters.workspace ? <input type="hidden" name="workspace" value={filters.workspace} /> : null}
                <input className="h-11 flex-1 rounded-full border border-slate-200 px-4 text-sm" defaultValue={filters.q} name="q" placeholder="Search workspace or owner" />
                <select className="h-11 rounded-full border border-slate-200 px-4 text-sm" defaultValue={filters.sort} name="sort">
                  <option value="attention">Sort: attention</option>
                  <option value="subRevenue">Sort: sub revenue</option>
                  <option value="twilioSpend">Sort: Twilio spend</option>
                  <option value="invoiceRevenue">Sort: paid invoices</option>
                  <option value="jobsWon">Sort: Jobs Won With Tracey</option>
                  <option value="lastActivity">Sort: last activity</option>
                </select>
                <button className="h-11 rounded-full bg-slate-900 px-5 text-sm font-medium text-white" type="submit">Apply</button>
              </form>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(380px,1fr)]">
            <Card className="rounded-[18px]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Customers</CardTitle>
                <CardDescription>{data.rows.length} workspaces in the current filtered view.</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto pt-0">
                <Table className="min-w-[1220px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Workspace</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sub rev</TableHead>
                      <TableHead>Twilio MTD</TableHead>
                      <TableHead>Sub rev - Twilio</TableHead>
                      <TableHead>Paid invoices</TableHead>
                      <TableHead>Jobs Won With Tracey</TableHead>
                      <TableHead>Voice calls</TableHead>
                      <TableHead>Last activity</TableHead>
                      <TableHead>Provisioning / issues</TableHead>
                      <TableHead>Coverage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.rows.map((row) => (
                      <TableRow key={row.workspaceId} className={selected?.row.workspaceId === row.workspaceId ? "bg-slate-50" : undefined}>
                        <TableCell className="font-medium">
                          <Link className="underline-offset-4 hover:underline" href={buildQuery(filters, { workspace: row.workspaceId })}>{row.workspaceName}</Link>
                          <div className="mt-1 text-xs text-slate-500">{row.ownerEmail}</div>
                        </TableCell>
                        <TableCell><Badge variant={statusVariant(row.attentionLevel)}>{row.subscriptionStatus}</Badge></TableCell>
                        <TableCell>{formatMoney(row.subscriptionRevenue, row.subscriptionRevenueCurrency)}</TableCell>
                        <TableCell>{formatMoney(row.twilioMonthSpend, row.twilioMonthSpendCurrency)}</TableCell>
                        <TableCell>{formatMoney(row.subRevenueMinusTwilio, row.subRevenueMinusTwilioCurrency)}</TableCell>
                        <TableCell>{formatMoney(row.paidInvoiceRevenueInRange)}</TableCell>
                        <TableCell>{formatNumber(row.jobsWonWithTracey)}</TableCell>
                        <TableCell>{formatNumber(row.voiceCallsInRange)}</TableCell>
                        <TableCell>{formatShortDate(row.lastActivityAt)}</TableCell>
                        <TableCell className="text-xs text-slate-600">{row.provisioningIssue || row.attentionReasons[0] || "--"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant={coverageVariant(row.coverage.stripe)}>Stripe {row.coverage.stripe}</Badge>
                            <Badge variant={coverageVariant(row.coverage.twilio)}>Twilio {row.coverage.twilio}</Badge>
                            <Badge variant={coverageVariant(row.coverage.aiEstimate)}>AI {row.coverage.aiEstimate}</Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {selected ? <SelectedWorkspacePanel selected={selected} /> : <Card className="rounded-[18px]"><CardContent className="pt-6 text-sm text-slate-500">No workspace selected.</CardContent></Card>}
          </div>
        </section>
      ) : null}

      {filters.tab === "ops" ? (
        <section className="space-y-4">
          <Card className="rounded-[18px]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Ops overview</CardTitle>
                  <CardDescription className="text-xs text-slate-600">{data.ops.launch.summary}</CardDescription>
                </div>
                <Badge variant={statusVariant(data.ops.launch.status)}>{data.ops.launch.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="text-xs text-slate-500">Checked {formatDate(data.ops.launch.checkedAt)}</CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <ListCard title="Release truth" description="Worker and web release state.">{truthBadge("rollup")}<div className="mt-3 space-y-2 text-sm text-slate-700"><div>Web SHA: {data.ops.launch.release.app.shortGitSha || "--"}</div><div>Web deploy: {data.ops.launch.release.app.deploymentId || "--"}</div><div>Worker status: {data.ops.launch.release.worker.status}</div></div></ListCard>
            <ListCard title="Voice critical" description="Routing, SIP, runtime, and latency.">{truthBadge("rollup")}<div className="mt-3 space-y-2 text-sm text-slate-700"><div>{data.ops.launch.voiceCritical.summary}</div><div>Twilio routing: {data.ops.launch.voiceCritical.twilioVoiceRouting.status}</div><div>LiveKit SIP: {data.ops.launch.voiceCritical.livekitSip.status}</div><div>Runtime drift: {data.ops.launch.voiceCritical.voiceWorker.status}</div><div>Fleet: {data.ops.launch.voiceCritical.voiceFleet.status}</div></div></ListCard>
            <ListCard title="Communications readiness" description="SMS and inbound email configuration.">{truthBadge("rollup")}<div className="mt-3 space-y-2 text-sm text-slate-700"><div>{data.ops.launch.communications.summary}</div><div>SMS: {data.ops.launch.communications.sms.status}</div><div>Email: {data.ops.launch.communications.email.status}</div><div>Inbound email domain: {data.ops.launch.communications.email.domain}</div></div></ListCard>
            <ListCard title="Provisioning" description="Workspace provisioning drift and blockers.">{truthBadge("rollup")}<div className="mt-3 space-y-2 text-sm text-slate-700"><div>{data.ops.launch.provisioning.summary}</div><div>Pending: {data.ops.launch.provisioning.pendingCount}</div><div>Failed: {data.ops.launch.provisioning.failedCount}</div><div>Blocked duplicate: {data.ops.launch.provisioning.counts.blocked_duplicate}</div></div></ListCard>
            <ListCard title="Monitor freshness" description="Scheduled monitor recency.">{truthBadge("rollup")}<div className="mt-3 space-y-2 text-sm text-slate-700"><div>{data.ops.launch.monitoring.summary}</div><div>Health audit: {data.ops.launch.monitoring.healthAudit.status}</div><div>Watchdog: {data.ops.launch.monitoring.watchdog.status}</div><div>Passive traffic audit: {data.ops.launch.monitoring.passiveTraffic.status}</div></div></ListCard>
            <ListCard title="Passive production health" description="Real customer traffic rather than synthetic probes.">{truthBadge("rollup")}<div className="mt-3 space-y-2 text-sm text-slate-700"><div>{data.ops.launch.passiveProduction.summary}</div><div>Active workspaces: {data.ops.launch.passiveProduction.activeWorkspaceCount}</div><div>Failures: {data.ops.launch.passiveProduction.unhealthyActiveWorkspaceCount}</div><div>Unknown: {data.ops.launch.passiveProduction.unknownWorkspaceCount}</div></div></ListCard>
          </div>

          <Card id="webhooks" className="rounded-[18px]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Webhook diagnostics</CardTitle>
                  <CardDescription className="text-xs text-slate-600">Exact provider event timestamps and error counts.</CardDescription>
                </div>
                {truthBadge("exact")}
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {data.ops.webhookDiagnostics.map((provider) => (
                <div key={provider.provider} className="rounded-xl border border-slate-200 px-3 py-3 text-sm">
                  <div className="flex items-center justify-between gap-3"><span className="font-medium capitalize text-slate-900">{provider.provider}</span><Badge variant={statusVariant(provider.errorCount > 0 ? "warning" : "healthy")}>{provider.successCount} ok / {provider.errorCount} err</Badge></div>
                  <div className="mt-2 text-xs text-slate-600">Last success {formatDate(provider.lastSuccess)}</div>
                  <div className="mt-1 text-xs text-slate-600">Last error {formatDate(provider.lastError)}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
