import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireInternalAdminAccess } from "@/lib/internal-admin";
import { getLaunchReadiness } from "@/lib/launch-readiness";

export const dynamic = "force-dynamic";

function statusVariant(status: "healthy" | "degraded" | "unhealthy") {
  if (status === "unhealthy") return "destructive" as const;
  if (status === "degraded") return "secondary" as const;
  return "default" as const;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "--";
  return new Date(value).toLocaleString("en-AU", {
    timeZone: "Australia/Sydney",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className="mt-2 text-xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

export default async function OpsStatusPage() {
  await requireInternalAdminAccess();
  const data = await getLaunchReadiness();

  return (
    <div className="mx-auto max-w-[1800px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Launch Status</h1>
          <Badge variant={statusVariant(data.status)}>{data.status}</Badge>
        </div>
        <p className="text-sm text-slate-600">{data.summary}</p>
        <p className="text-xs text-slate-500">Checked {formatDate(data.checkedAt)}</p>
      </div>

      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <SummaryMetric label="Web SHA" value={data.release.app.shortGitSha || "--"} />
        <SummaryMetric label="Web Deploy" value={data.release.app.deploymentId || "--"} />
        <SummaryMetric label="Worker SHAs" value={data.release.worker.liveDeployGitShas.join(", ") || "--"} />
        <SummaryMetric label="Provisioning Issues" value={String(data.provisioning.issueCount)} />
        <SummaryMetric label="Pending Provisioning" value={String(data.provisioning.pendingCount)} />
        <SummaryMetric label="Managed SMS Numbers" value={String(data.communications.sms.managedNumberCount)} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Release Truth</CardTitle>
            <CardDescription>Current web and worker deploy state visible from production telemetry.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Web release</span>
              <span className="font-medium text-slate-900">
                {data.release.app.shortGitSha || "--"} ({data.release.app.provider})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Worker release status</span>
              <Badge variant={statusVariant(data.release.worker.status)}>{data.release.worker.status}</Badge>
            </div>
            <div className="rounded-md bg-slate-50 p-3 text-xs text-slate-700">
              {data.release.worker.summary}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Host</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>SHAs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.release.worker.hosts.map((host) => (
                  <TableRow key={host.hostId}>
                    <TableCell>{host.hostId}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(host.status)}>{host.status}</Badge>
                    </TableCell>
                    <TableCell>{host.workerRoles.join(", ") || "--"}</TableCell>
                    <TableCell>{host.deployGitShas.join(", ") || "--"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Critical Voice Gate</CardTitle>
            <CardDescription>Routing, SIP, runtime, and fleet health used for launch-critical verification.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Status</span>
              <Badge variant={statusVariant(data.voiceCritical.status)}>{data.voiceCritical.status}</Badge>
            </div>
            <div className="rounded-md bg-slate-50 p-3 text-xs text-slate-700">{data.voiceCritical.summary}</div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="rounded-md border border-slate-200 p-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">Twilio voice routing</div>
                <div className="mt-1 font-medium text-slate-900">{data.voiceCritical.twilioVoiceRouting.status}</div>
              </div>
              <div className="rounded-md border border-slate-200 p-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">LiveKit SIP</div>
                <div className="mt-1 font-medium text-slate-900">{data.voiceCritical.livekitSip.status}</div>
              </div>
              <div className="rounded-md border border-slate-200 p-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">Voice runtime drift</div>
                <div className="mt-1 font-medium text-slate-900">{data.voiceCritical.voiceWorker.status}</div>
              </div>
              <div className="rounded-md border border-slate-200 p-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">Voice fleet</div>
                <div className="mt-1 font-medium text-slate-900">{data.voiceCritical.voiceFleet.status}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Canary</CardTitle>
            <CardDescription>Most recent spoken probe state.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Badge variant={statusVariant(data.canary.status)}>{data.canary.status}</Badge>
            <div className="rounded-md bg-slate-50 p-3 text-xs text-slate-700">{data.canary.summary}</div>
            <div className="text-xs text-slate-600">
              Probe result: {data.canary.probeResult || "--"}<br />
              Target: {data.canary.targetNumber || "--"}<br />
              Last success: {formatDate(data.canary.monitor.lastSuccessAt)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Communications</CardTitle>
            <CardDescription>SMS and inbound email readiness.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">SMS</span>
              <Badge variant={statusVariant(data.communications.sms.status)}>{data.communications.sms.status}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Email</span>
              <Badge variant={statusVariant(data.communications.email.status)}>{data.communications.email.status}</Badge>
            </div>
            <div className="rounded-md bg-slate-50 p-3 text-xs text-slate-700">
              {data.communications.summary}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Provisioning</CardTitle>
            <CardDescription>Workspace Twilio provisioning drift and failures.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Badge variant={statusVariant(data.provisioning.status)}>{data.provisioning.status}</Badge>
            <div className="rounded-md bg-slate-50 p-3 text-xs text-slate-700">{data.provisioning.summary}</div>
            <div className="text-xs text-slate-600">
              Failed: {data.provisioning.failedCount}<br />
              Pending: {data.provisioning.pendingCount}<br />
              Blocked duplicate: {data.provisioning.counts.blocked_duplicate}
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Provisioning Issues</CardTitle>
          <CardDescription>Latest workspaces still waiting on or failing Twilio setup.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workspace</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.provisioning.recentIssues.length === 0 ? (
                <TableRow>
                  <TableCell className="text-slate-500" colSpan={5}>No active provisioning issues.</TableCell>
                </TableRow>
              ) : data.provisioning.recentIssues.map((issue) => (
                <TableRow key={`${issue.workspaceId}:${issue.updatedAt}`}>
                  <TableCell>{issue.workspaceName}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(issue.provisioningStatus === "failed" ? "unhealthy" : "degraded")}>
                      {issue.provisioningStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(issue.updatedAt)}</TableCell>
                  <TableCell>{issue.stageReached || "--"}</TableCell>
                  <TableCell className="max-w-[420px] text-xs text-slate-600">{issue.error || "--"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
