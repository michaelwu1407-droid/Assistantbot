import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getRecentVoiceCallsForWorkspace } from "@/actions/voice-call-actions";

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatCallType(callType: string) {
  if (callType === "normal") return "Customer workspace";
  if (callType === "demo") return "Interview form demo";
  if (callType === "inbound_demo") return "Earlymark inbound";
  return callType;
}

export async function RecentVoiceCalls() {
  const calls = await getRecentVoiceCallsForWorkspace(8);

  return (
    <Card className="border-border dark:border-slate-800 shadow-sm">
      <CardHeader>
        <CardTitle>Recent voice calls</CardTitle>
        <CardDescription>Latest persisted call transcripts and summaries for this workspace.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {calls.length === 0 ? (
          <p className="text-sm text-muted-foreground">No persisted voice calls yet.</p>
        ) : (
          calls.map((call) => (
            <details key={call.id} className="rounded-lg border border-border dark:border-slate-700 p-3">
              <summary className="cursor-pointer list-none">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground dark:text-slate-100">
                      {call.callerName || call.callerPhone || "Unknown caller"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCallType(call.callType)} · {formatDateTime(call.startedAt)}
                    </p>
                    {call.summary ? (
                      <p className="text-sm text-muted-foreground dark:text-slate-300">{call.summary}</p>
                    ) : null}
                  </div>
                  {call.businessName ? (
                    <span className="text-xs text-muted-foreground">{call.businessName}</span>
                  ) : null}
                </div>
              </summary>
              {call.transcriptText ? (
                <pre className="mt-3 whitespace-pre-wrap rounded-md bg-muted/30 p-3 text-xs text-foreground dark:bg-slate-900 dark:text-slate-200">
                  {call.transcriptText}
                </pre>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">Transcript unavailable.</p>
              )}
            </details>
          ))
        )}
      </CardContent>
    </Card>
  );
}
