"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Mail, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getLeadCaptureEmailReadiness, getOrAllocateLeadCaptureEmail, getWorkspaceSettings, updateWorkspaceSettings } from "@/actions/settings-actions";

type LeadCaptureEmailReadiness = Awaited<ReturnType<typeof getLeadCaptureEmailReadiness>>;

function formatDate(value: string | null | undefined) {
  if (!value) return null;
  return new Date(value).toLocaleString("en-AU", {
    timeZone: "Australia/Sydney",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function EmailLeadCaptureSettings() {
  const [forwardingEmail, setForwardingEmail] = useState<string>("");
  const [autoCallLeads, setAutoCallLeads] = useState(false);
  const [readiness, setReadiness] = useState<LeadCaptureEmailReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [email, settings, nextReadiness] = await Promise.all([
          getOrAllocateLeadCaptureEmail(),
          getWorkspaceSettings(),
          getLeadCaptureEmailReadiness(),
        ]);
        if (!cancelled) {
          setForwardingEmail(email);
          setAutoCallLeads(settings?.autoCallLeads ?? false);
          setReadiness(nextReadiness);
        }
      } catch {
        if (!cancelled) setForwardingEmail("");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCopy = async () => {
    if (!forwardingEmail) return;
    try {
      await navigator.clipboard.writeText(forwardingEmail);
      toast.success("Forwarding email copied to clipboard");
    } catch {
      toast.error("Could not copy");
    }
  };

  const handleToggleAutoCall = async (checked: boolean) => {
    setSaving(true);
    try {
      const settings = await getWorkspaceSettings();
      if (!settings) throw new Error("No settings");
      await updateWorkspaceSettings({
        ...settings,
        aiPreferences: settings.aiPreferences ?? undefined,
        jobReminderHours: settings.jobReminderHours ?? undefined,
        inboundEmailAlias: settings.inboundEmailAlias ?? undefined,
        agentScriptStyle: (settings.agentScriptStyle as "opening" | "closing") ?? undefined,
        agentMode: settings.agentMode,
        workingHoursStart: settings.workingHoursStart ?? "08:00",
        workingHoursEnd: settings.workingHoursEnd ?? "17:00",
        agendaNotifyTime: settings.agendaNotifyTime ?? "07:30",
        wrapupNotifyTime: settings.wrapupNotifyTime ?? "17:30",
        autoCallLeads: checked,
      });
      setAutoCallLeads(checked);
      toast.success(checked ? "Tracey will call new leads immediately." : "Auto-call new leads turned off.");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-emerald-600" />
          <CardTitle>Auto-Lead Response</CardTitle>
        </div>
        <CardDescription>
          Forward &quot;Lead Won&quot; emails from HiPages, Airtasker, or ServiceSeeking to your unique address.
          Format is [business-name]@inbound.earlymark.ai. Older forwarding addresses still work, but this is the canonical format shown in the app.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {readiness && !readiness.ready && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <div className="font-medium">Inbound email is not live</div>
            <div className="mt-1">Do not forward leads to this address yet. The inbound mail route for <strong>{readiness.domain}</strong> is not ready.</div>
            <ul className="mt-2 list-disc pl-5">
              {readiness.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        )}
        {readiness?.ready && !readiness.receivingConfirmed && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <div className="font-medium">Inbound email is verified and ready</div>
            <div className="mt-1">
              DNS and Resend are verified for <strong>{readiness.domain}</strong>. We have not yet observed a live inbound lead email in the last{" "}
              {readiness.receivingConfirmationLookbackDays} days.
            </div>
          </div>
        )}
        {readiness?.ready && readiness.receivingConfirmed && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <div className="font-medium">Inbound email is live</div>
            <div className="mt-1">
              Recent inbound email processing confirms the route is working.
              {formatDate(readiness.lastInboundEmailSuccessAt)
                ? ` Last success: ${formatDate(readiness.lastInboundEmailSuccessAt)}.`
                : ""}
            </div>
          </div>
        )}
        <div className="space-y-2">
          <Label>Your forwarding email</Label>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm font-mono">
              {forwardingEmail || "-"}
            </code>
            <Button variant="outline" size="icon" onClick={handleCopy} disabled={!forwardingEmail} title="Copy">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {readiness?.ready
              ? readiness.receivingConfirmed
                ? "Set up a filter to forward lead emails to this address. We identify the lead and create the contact and deal automatically."
                : "This address is verified and ready. Forward your first live lead email here to confirm end-to-end receiving."
              : "This address is reserved, but inbound email is not ready yet. Fix the inbound domain before forwarding live leads."}
          </p>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border/50 p-4">
          <div>
            <Label htmlFor="auto-call-leads" className="text-base font-medium">Call new leads immediately?</Label>
            <p className="text-sm text-muted-foreground mt-0.5">
              If ON, Tracey calls the lead immediately when an eligible lead email arrives. If OFF, the lead is still captured, but no immediate call is made.
            </p>
          </div>
          <Switch
            id="auto-call-leads"
            checked={autoCallLeads}
            onCheckedChange={handleToggleAutoCall}
            disabled={saving || (readiness ? !readiness.ready : false)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
