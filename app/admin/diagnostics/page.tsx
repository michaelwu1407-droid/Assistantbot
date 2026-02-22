import { getWebhookDiagnostics } from "@/actions/webhook-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function DiagnosticsPage() {
  const diagnostics = await getWebhookDiagnostics();

  const formatDate = (iso: string | null) => {
    if (!iso) return "Never";
    const d = new Date(iso);
    return d.toLocaleString("en-AU", {
      timeZone: "Australia/Sydney",
      dateStyle: "medium",
      timeStyle: "medium",
    });
  };

  const timeSince = (iso: string | null) => {
    if (!iso) return "";
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "(just now)";
    if (mins < 60) return `(${mins}m ago)`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `(${hrs}h ago)`;
    const days = Math.floor(hrs / 24);
    return `(${days}d ago)`;
  };

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Webhook Diagnostics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Internal monitoring page showing the last successful webhook
          timestamps for each provider.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {diagnostics.map((d) => (
          <Card key={d.provider}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span className="capitalize">{d.provider}</span>
                <Badge
                  variant={
                    d.lastSuccess && !d.lastError
                      ? "default"
                      : d.lastError
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {d.successCount > 0 ? "Active" : "No Events"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                    Last Success
                  </div>
                  <div className="mt-1 font-mono text-xs">
                    {formatDate(d.lastSuccess)}
                  </div>
                  <div className="text-xs text-emerald-600">
                    {timeSince(d.lastSuccess)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                    Last Error
                  </div>
                  <div className="mt-1 font-mono text-xs">
                    {formatDate(d.lastError)}
                  </div>
                  <div className="text-xs text-red-600">
                    {timeSince(d.lastError)}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 text-xs">
                <span className="text-emerald-600 font-medium">
                  {d.successCount} successes
                </span>
                <span className="text-red-600 font-medium">
                  {d.errorCount} errors
                </span>
              </div>

              {d.recentEvents.length > 0 && (
                <div className="border-t pt-3">
                  <div className="text-xs font-medium text-muted-foreground mb-2">
                    Recent Events
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {d.recentEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center justify-between text-xs font-mono py-1 px-2 rounded bg-slate-50"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              event.status === "success"
                                ? "bg-emerald-500"
                                : "bg-red-500"
                            }`}
                          />
                          <span className="truncate max-w-[180px]">
                            {event.eventType}
                          </span>
                        </div>
                        <span className="text-muted-foreground shrink-0">
                          {new Date(event.createdAt).toLocaleTimeString(
                            "en-AU",
                            { hour: "2-digit", minute: "2-digit" }
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
