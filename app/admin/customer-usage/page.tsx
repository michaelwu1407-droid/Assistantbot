import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  COST_PER_WON_JOB_FORMULA,
  describeExactMarginCoverageGap,
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

function attentionLabel(level: CustomerUsageDashboardData["rows"][number]["attentionLevel"]) {
  if (level === "critical") return "Critical";
  if (level === "warning") return "Watch";
  return "Healthy";
}

function primaryHealthSummary(row: CustomerUsageDashboardData["rows"][number]) {
  if (row.provisioningIssue) {
    return `Operational blocker: ${row.provisioningIssue}`;
  }

  if (row.voiceEnabled && row.coverage.twilio !== "live") {
    return `Operational blocker: Twilio coverage ${row.coverage.twilio}`;
  }

  if (row.subscriptionStatus.toLowerCase() === "active" && row.coverage.stripe !== "live") {
    return `Operational blocker: Stripe coverage ${row.coverage.stripe}`;
  }

  return row.attentionReasons[0] || row.passiveHealth?.summary || "No active health issues.";
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

function EmptyState({ children }: { children: ReactNode }) {
  return <div className="text-sm text-slate-500">{children}</div>;
}

function SectionCard({
  title,
  description,
  children,
  aside,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <Card className="rounded-[18px]">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base text-slate-950">{title}</CardTitle>
            {description ? <CardDescription className="mt-1 text-xs text-slate-600">{description}</CardDescription> : null}
          </div>
          {aside}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function MetricSummaryTable({ data }: { data: CustomerUsageDashboardData }) {
  const rows = [
    {
      metric: "Paid customers",
      type: "exact" as const,
      value: formatNumber(data.overview.paidCustomers),
      method: `${data.overview.totalCustomers} workspaces in the current filtered view.`,
    },
    {
      metric: "Subscription revenue",
      type: "exact" as const,
      value: formatMoney(data.overview.subscriptionRevenue.amount, data.overview.subscriptionRevenue.currency),
      method: `Live Stripe recurring subscription revenue only. Coverage ${data.overview.subscriptionRevenue.coveredCount}/${data.overview.totalCustomers}.`,
    },
    {
      metric: "Twilio month spend",
      type: "exact" as const,
      value: formatMoney(data.overview.twilioMonthSpend.amount, data.overview.twilioMonthSpend.currency),
      method: `Sum of live Twilio Usage Records for the current calendar month using Twilio's ThisMonth totalprice feed. Coverage ${data.overview.twilioMonthSpend.coveredCount}/${data.overview.totalCustomers} means that many customers returned live Twilio month-spend data.`,
    },
    {
      metric: "Paid invoice totals",
      type: "exact" as const,
      value: formatMoney(data.overview.paidInvoiceRevenueInRange),
      method: `Invoices with status PAID and paidAt inside the selected ${data.filters.range} window.`,
    },
    {
      metric: "Jobs Won With Tracey",
      type: "exact" as const,
      value: formatNumber(data.overview.jobsWonWithTracey),
      method: JOBS_WON_WITH_TRACEY_FORMULA,
    },
    {
      metric: "Sub rev - Twilio month spend",
      type: "exact" as const,
      value: formatMoney(data.overview.subRevenueMinusTwilio.amount, data.overview.subRevenueMinusTwilio.currency),
      method: `${SUB_REVENUE_MINUS_TWILIO_FORMULA} Excluded ${data.overview.subRevenueMinusTwilio.excludedCount} customers without full exact coverage.`,
    },
    {
      metric: "Customers needing action",
      type: "rollup" as const,
      value: formatNumber(data.overview.customersNeedingAction),
      method: "Rollup count of customers with billing, provisioning, stale-activity, or passive-health action signals.",
    },
    {
      metric: "Open provisioning blockers",
      type: "exact" as const,
      value: formatNumber(data.overview.openProvisioningBlockers),
      method: "Failed or duplicate-blocked provisioning states.",
    },
    {
      metric: "Ops issues",
      type: "rollup" as const,
      value: formatNumber(data.overview.opsIssueCount),
      method: "Failing or stale monitors plus webhook/provider issues.",
    },
  ];

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Metric</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Value</TableHead>
          <TableHead>How it is calculated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.metric}>
            <TableCell className="font-medium text-slate-900">{row.metric}</TableCell>
            <TableCell>{truthBadge(row.type)}</TableCell>
            <TableCell className="font-medium text-slate-900">{row.value}</TableCell>
            <TableCell className="max-w-[560px] text-xs leading-5 text-slate-600">{row.method}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function TruthLegendTable({ data }: { data: CustomerUsageDashboardData }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Class</TableHead>
          <TableHead>Meaning</TableHead>
          <TableHead>How to use it</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>{truthBadge("exact")}</TableCell>
          <TableCell className="font-medium text-slate-900">Exact numbers</TableCell>
          <TableCell className="text-sm text-slate-600">{data.truthModel.exact}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>{truthBadge("rollup")}</TableCell>
          <TableCell className="font-medium text-slate-900">Status rollups</TableCell>
          <TableCell className="text-sm text-slate-600">{data.truthModel.rollup}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>{truthBadge("estimate")}</TableCell>
          <TableCell className="font-medium text-slate-900">Voice AI estimate</TableCell>
          <TableCell className="text-sm text-slate-600">{data.truthModel.estimate}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

function CoverageTable({ data }: { data: CustomerUsageDashboardData }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Coverage</TableHead>
          <TableHead>Live</TableHead>
          <TableHead>Degraded</TableHead>
          <TableHead>Missing</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell className="font-medium text-slate-900">Stripe</TableCell>
          <TableCell>{data.overview.coverage.stripe.live}</TableCell>
          <TableCell>{data.overview.coverage.stripe.degraded}</TableCell>
          <TableCell>{data.overview.coverage.stripe.missing}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-medium text-slate-900">Twilio</TableCell>
          <TableCell>{data.overview.coverage.twilio.live}</TableCell>
          <TableCell>{data.overview.coverage.twilio.degraded}</TableCell>
          <TableCell>{data.overview.coverage.twilio.missing}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-medium text-slate-900">Voice AI estimate</TableCell>
          <TableCell>{data.overview.coverage.aiEstimate.live}</TableCell>
          <TableCell>{data.overview.coverage.aiEstimate.degraded}</TableCell>
          <TableCell>{data.overview.coverage.aiEstimate.missing}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

function CustomerTable({
  rows,
  filters,
  selectedWorkspaceId,
}: {
  rows: CustomerUsageDashboardData["rows"];
  filters: CustomerUsageFilters;
  selectedWorkspaceId?: string;
}) {
  const displayRows = rows.flatMap((row) => {
    if (row.users.length === 0) {
      return [{ row, user: null as null | CustomerUsageDashboardData["rows"][number]["users"][number] }];
    }

    return row.users.map((user) => ({ row, user }));
  });

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[1500px]">
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Provisioned number</TableHead>
            <TableHead>Sub rev</TableHead>
            <TableHead>Twilio MTD</TableHead>
            <TableHead>Margin</TableHead>
            <TableHead>Revenue &amp; jobs won</TableHead>
            <TableHead># calls</TableHead>
            <TableHead>Last activity</TableHead>
            <TableHead>Health</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayRows.map(({ row, user }) => (
            <TableRow key={`${row.workspaceId}:${user?.id || "nouser"}`} className={selectedWorkspaceId === row.workspaceId ? "bg-slate-50" : undefined}>
              <TableCell className="min-w-[240px] align-top">
                <Link className="underline-offset-4 hover:underline" href={buildQuery(filters, { tab: "customers", workspace: row.workspaceId })}>
                  {row.workspaceName}
                </Link>
                <div className="mt-1 text-xs text-slate-500">{row.industryType}</div>
              </TableCell>
              <TableCell className="min-w-[220px] align-top">
                <div className="font-medium text-slate-900">{user?.name || "--"}</div>
                <div className="mt-1 text-xs text-slate-500">{user?.email || row.ownerEmail}</div>
              </TableCell>
              <TableCell className="min-w-[130px] align-top">
                <div className="font-medium text-slate-900">{formatShortDate(row.createdAt)}</div>
                <div className="mt-1 text-xs text-slate-500">Customer created</div>
              </TableCell>
              <TableCell className="min-w-[150px] align-top">
                <div className="font-medium text-slate-900">{row.twilioPhoneNumber || "--"}</div>
                <div className="mt-1 text-xs text-slate-500">{row.twilioPhoneNumber ? "Provisioned" : "Not provisioned"}</div>
              </TableCell>
              <TableCell className="min-w-[140px] align-top">
                <div className="font-medium text-slate-900">{formatMoney(row.subscriptionRevenue, row.subscriptionRevenueCurrency)}</div>
                <div className="mt-1 text-xs text-slate-500">{row.subscriptionStatus}</div>
              </TableCell>
              <TableCell className="min-w-[150px] align-top">
                <div className="font-medium text-slate-900">{formatMoney(row.twilioMonthSpend, row.twilioMonthSpendCurrency)}</div>
                <div className="mt-1">
                  <Badge variant={coverageVariant(row.coverage.twilio)}>Twilio {row.coverage.twilio}</Badge>
                </div>
              </TableCell>
              <TableCell className="min-w-[160px] align-top">
                <div className="font-medium text-slate-900">{formatMoney(row.subRevenueMinusTwilio, row.subRevenueMinusTwilioCurrency)}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {row.subRevenueMinusTwilio == null
                    ? describeExactMarginCoverageGap({
                        subscriptionRevenue: row.subscriptionRevenue,
                        subscriptionRevenueCurrency: row.subscriptionRevenueCurrency,
                        twilioMonthSpend: row.twilioMonthSpend,
                        twilioMonthSpendCurrency: row.twilioMonthSpendCurrency,
                        stripeCoverage: row.coverage.stripe,
                        twilioCoverage: row.coverage.twilio,
                      })
                    : "Sub rev - Twilio MTD"}
                </div>
              </TableCell>
              <TableCell className="min-w-[170px] align-top">
                <div className="font-medium text-slate-900">{formatMoney(row.paidInvoiceRevenueInRange)}</div>
                <div className="mt-1 text-xs text-slate-500">{formatNumber(row.jobsWonWithTracey)} jobs won</div>
              </TableCell>
              <TableCell className="min-w-[150px] align-top">
                <div className="font-medium text-slate-900">{formatNumber(row.voiceCallsInRange)}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {row.lastVoiceCallAt ? `Last call ${formatShortDate(row.lastVoiceCallAt)}` : "No calls yet"}
                </div>
              </TableCell>
              <TableCell className="min-w-[170px] align-top">
                <div className="font-medium text-slate-900">{formatShortDate(row.lastActivityAt)}</div>
                <div className="mt-1 text-xs text-slate-500">{row.lastActivityAt ? formatDate(row.lastActivityAt) : "No recent activity"}</div>
              </TableCell>
              <TableCell className="min-w-[260px] align-top">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusVariant(row.attentionLevel)}>{attentionLabel(row.attentionLevel)}</Badge>
                  {row.coverage.stripe !== "live" ? <Badge variant={coverageVariant(row.coverage.stripe)}>Stripe {row.coverage.stripe}</Badge> : null}
                  {row.coverage.aiEstimate !== "live" ? <Badge variant={coverageVariant(row.coverage.aiEstimate)}>AI {row.coverage.aiEstimate}</Badge> : null}
                </div>
                <div className="mt-2 text-xs leading-5 text-slate-600">
                  {primaryHealthSummary(row)}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ActionQueues({ data, filters }: { data: CustomerUsageDashboardData; filters: CustomerUsageFilters }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Customers needing immediate attention</h3>
        <div className="mt-3 overflow-x-auto">
          {data.overview.lists.immediateAttentionCustomers.length === 0 ? (
            <EmptyState>No customers currently need action.</EmptyState>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Reasons</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.overview.lists.immediateAttentionCustomers.map((item) => (
                  <TableRow key={item.workspaceId}>
                    <TableCell className="font-medium">
                      <Link className="underline-offset-4 hover:underline" href={buildQuery(filters, { tab: "customers", workspace: item.workspaceId })}>
                        {item.workspaceName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(item.level)}>{item.level}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">{item.reasons.join(" | ")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-900">Newest provisioning failures</h3>
        <div className="mt-3 overflow-x-auto">
          {data.overview.lists.newestProvisioningFailures.length === 0 ? (
            <EmptyState>No open provisioning blockers.</EmptyState>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.overview.lists.newestProvisioningFailures.map((item) => (
                  <TableRow key={`${item.workspaceId}:${item.updatedAt}`}>
                    <TableCell className="font-medium text-slate-900">{item.workspaceName}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(item.provisioningStatus === "failed" ? "critical" : "warning")}>
                        {item.provisioningStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(item.updatedAt)}</TableCell>
                    <TableCell className="text-xs text-slate-600">{item.error || "--"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-900">Stale customers</h3>
        <div className="mt-3 overflow-x-auto">
          {data.overview.lists.staleCustomers.length === 0 ? (
            <EmptyState>No stale customers right now.</EmptyState>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Last activity</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.overview.lists.staleCustomers.map((item) => (
                  <TableRow key={item.workspaceId}>
                    <TableCell className="font-medium">
                      <Link className="underline-offset-4 hover:underline" href={buildQuery(filters, { tab: "customers", workspace: item.workspaceId })}>
                        {item.workspaceName}
                      </Link>
                    </TableCell>
                    <TableCell>{formatDate(item.lastActivityAt)}</TableCell>
                    <TableCell className="text-xs text-slate-600">{item.reasons.join(" | ") || "No meaningful activity in the last 30 days"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-900">Webhook and provider failures</h3>
        <div className="mt-3 overflow-x-auto">
          {data.overview.lists.providerFailures.length === 0 ? (
            <EmptyState>No active provider issues.</EmptyState>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead>Last seen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.overview.lists.providerFailures.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-slate-900">{item.label}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(item.status)}>{item.source}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">{item.summary}</TableCell>
                    <TableCell>{formatDate(item.lastSeenAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}

function OpsRollupTable({ data }: { data: CustomerUsageDashboardData }) {
  const rows = [
    {
      section: "Release truth",
      status: data.ops.launch.release.worker.status,
      summary: `Web SHA ${data.ops.launch.release.app.shortGitSha || "--"} | Worker ${data.ops.launch.release.worker.status}`,
      details: `Web deploy ${data.ops.launch.release.app.deploymentId || "--"}`,
    },
    {
      section: "Voice critical",
      status: data.ops.launch.voiceCritical.status,
      summary: data.ops.launch.voiceCritical.summary,
      details: `Twilio ${data.ops.launch.voiceCritical.twilioVoiceRouting.status} | LiveKit ${data.ops.launch.voiceCritical.livekitSip.status} | Fleet ${data.ops.launch.voiceCritical.voiceFleet.status}`,
    },
    {
      section: "Communications readiness",
      status: data.ops.launch.communications.status,
      summary: data.ops.launch.communications.summary,
      details: `SMS ${data.ops.launch.communications.sms.status} | Email ${data.ops.launch.communications.email.status}`,
    },
    {
      section: "Provisioning",
      status: data.ops.launch.provisioning.status,
      summary: data.ops.launch.provisioning.summary,
      details: `Pending ${data.ops.launch.provisioning.pendingCount} | Failed ${data.ops.launch.provisioning.failedCount} | Blocked ${data.ops.launch.provisioning.counts.blocked_duplicate}`,
    },
    {
      section: "Monitor freshness",
      status: data.ops.launch.monitoring.status,
      summary: data.ops.launch.monitoring.summary,
      details: `Health audit ${data.ops.launch.monitoring.healthAudit.status} | Watchdog ${data.ops.launch.monitoring.watchdog.status} | Passive traffic ${data.ops.launch.monitoring.passiveTraffic.status}`,
    },
    {
      section: "Passive production health",
      status: data.ops.launch.passiveProduction.status,
      summary: data.ops.launch.passiveProduction.summary,
      details: `Active ${data.ops.launch.passiveProduction.activeWorkspaceCount} | Failures ${data.ops.launch.passiveProduction.unhealthyActiveWorkspaceCount} | Unknown ${data.ops.launch.passiveProduction.unknownWorkspaceCount}`,
    },
  ];

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Section</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Summary</TableHead>
          <TableHead>Key datapoints</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.section}>
            <TableCell className="font-medium text-slate-900">{row.section}</TableCell>
            <TableCell>
              <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
            </TableCell>
            <TableCell className="text-sm text-slate-700">{row.summary}</TableCell>
            <TableCell className="text-xs text-slate-600">{row.details}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
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
                  <div className="mt-1 text-slate-500">{item.dealTitle} | {formatShortDate(item.createdAt)}</div>
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
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Customer observability</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["1d", "7d", "30d", "90d"] as const).map((range) => (
            <Link
              key={range}
              href={buildQuery(filters, { range, workspace: filters.workspace || "" })}
              className={`inline-flex h-10 items-center rounded-full px-4 text-sm font-medium ${filters.range === range ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-700"}`}
            >
              {range}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          ["overview", "Overview"],
          ["customers", "Customers"],
          ["ops", "Ops"],
        ] as const).map(([tab, label]) => (
          <Link
            key={tab}
            href={buildQuery(filters, { tab })}
            className={`inline-flex h-10 items-center rounded-full px-4 text-sm font-medium ${filters.tab === tab ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-700"}`}
          >
            {label}
          </Link>
        ))}
      </div>

      {filters.tab === "overview" ? (
        <section className="space-y-4">
          <SectionCard
            title="How to read this page"
            description="Exact numbers are the source of truth. Rollups help you skim. Estimates never appear in the top truth KPIs."
          >
            <TruthLegendTable data={data} />
          </SectionCard>

          <SectionCard
            title="Overview metrics"
            description={`Top-line customer, revenue, usage, and issue counts for the selected ${filters.range} window.`}
          >
            <MetricSummaryTable data={data} />
          </SectionCard>

          <SectionCard
            title="Coverage and data availability"
            description="Live provider coverage for the customers in the current view."
          >
            <CoverageTable data={data} />
          </SectionCard>

          <SectionCard
            title="Customers"
            description={`${data.rows.length} workspaces in the current filtered view.`}
            aside={
              <Link
                href={buildQuery(filters, { tab: "customers" })}
                className="inline-flex h-9 items-center rounded-full border border-slate-200 px-4 text-sm font-medium text-slate-700"
              >
                Open detailed customer view
              </Link>
            }
          >
            <CustomerTable rows={data.rows} filters={filters} selectedWorkspaceId={selected?.row.workspaceId} />
          </SectionCard>

          <SectionCard
            title="Immediate action queues"
            description="The short lists to check first when something needs attention."
          >
            <ActionQueues data={data} filters={filters} />
          </SectionCard>
        </section>
      ) : null}

      {filters.tab === "customers" ? (
        <section className="space-y-4">
          <SectionCard title="Customer filters" description="Filter and sort the full customer table without leaving this page.">
            <form className="flex flex-col gap-3 md:flex-row" method="get">
              <input type="hidden" name="tab" value="customers" />
              <input type="hidden" name="range" value={filters.range} />
              {filters.workspace ? <input type="hidden" name="workspace" value={filters.workspace} /> : null}
              <input className="h-11 flex-1 rounded-full border border-slate-200 px-4 text-sm" defaultValue={filters.q} name="q" placeholder="Search customer, user, or provisioned number" />
              <select className="h-11 rounded-full border border-slate-200 px-4 text-sm" defaultValue={filters.sort} name="sort">
                <option value="attention">Sort: attention</option>
                <option value="subRevenue">Sort: sub revenue</option>
                <option value="twilioSpend">Sort: Twilio spend</option>
                <option value="invoiceRevenue">Sort: paid invoices</option>
                <option value="jobsWon">Sort: Jobs Won With Tracey</option>
                <option value="lastActivity">Sort: last activity</option>
                <option value="voiceCalls">Sort: voice calls</option>
                <option value="createdAt">Sort: newest</option>
                <option value="name">Sort: name</option>
              </select>
              <button className="h-11 rounded-full bg-slate-900 px-5 text-sm font-medium text-white" type="submit">Apply</button>
            </form>
          </SectionCard>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(380px,1fr)]">
            <SectionCard title="Customer table" description={`${data.rows.length} customers in the current filtered view.`}>
              <CustomerTable rows={data.rows} filters={filters} selectedWorkspaceId={selected?.row.workspaceId} />
            </SectionCard>

            {selected ? (
              <SelectedWorkspacePanel selected={selected} />
            ) : (
              <Card className="rounded-[18px]">
                <CardContent className="pt-6 text-sm text-slate-500">No workspace selected.</CardContent>
              </Card>
            )}
          </div>
        </section>
      ) : null}

      {filters.tab === "ops" ? (
        <section className="space-y-4">
          <SectionCard
            title="Ops overview"
            description={data.ops.launch.summary}
            aside={<Badge variant={statusVariant(data.ops.launch.status)}>{data.ops.launch.status}</Badge>}
          >
            <div className="text-xs text-slate-500">Checked {formatDate(data.ops.launch.checkedAt)}</div>
          </SectionCard>

          <SectionCard
            title="Ops checks"
            description="Rollups for release, voice, communications, provisioning, monitoring, and passive production health."
          >
            <OpsRollupTable data={data} />
          </SectionCard>

          <div id="webhooks">
            <SectionCard title="Webhook diagnostics" description="Exact provider event timestamps and error counts.">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Last success</TableHead>
                    <TableHead>Last error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.ops.webhookDiagnostics.map((provider) => (
                    <TableRow key={provider.provider}>
                      <TableCell className="font-medium capitalize text-slate-900">{provider.provider}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(provider.errorCount > 0 ? "warning" : "healthy")}>
                          {provider.successCount} ok / {provider.errorCount} err
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(provider.lastSuccess)}</TableCell>
                      <TableCell>{formatDate(provider.lastError)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </SectionCard>
          </div>
        </section>
      ) : null}
    </div>
  );
}
