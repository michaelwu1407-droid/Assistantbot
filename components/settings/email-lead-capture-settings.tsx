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

function getReadinessMessage(readiness: LeadCaptureEmailReadiness | null) {
  if (!readiness) {
    return {
      tone: "muted" as const,
      title: "Checking lead email setup",
      body: "We are checking whether lead email forwarding is ready.",
    };
  }

  if (!readiness.ready) {
    return {
      tone: "warning" as const,
      title: "Lead email forwarding is not ready yet",
      body: "Do not forward live leads here yet. Earlymark is still finishing the email setup for your account.",
    };
  }

  if (!readiness.receivingConfirmed) {
    return {
      tone: "info" as const,
      title: "Forwarding address is ready",
      body: "This address is ready to use. Once your first forwarded lead email arrives, Earlymark will confirm it is working end to end.",
    };
  }

  return {
    tone: "success" as const,
    title: "Lead email forwarding is live",
    body: formatDate(readiness.lastInboundEmailSuccessAt)
      ? `Forwarded lead emails are being received. Last successful lead email: ${formatDate(readiness.lastInboundEmailSuccessAt)}.`
      : "Forwarded lead emails are being received normally.",
  };
}

export function EmailLeadCaptureSettings() {
  const [forwardingEmail, setForwardingEmail] = useState<string>("");
  const [autoCallLeads, setAutoCallLeads] = useState(false);
  const [readiness, setReadiness] = useState<LeadCaptureEmailReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const readinessMessage = getReadinessMessage(readiness);

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
          <CardTitle>Lead email forwarding</CardTitle>
        </div>
        <CardDescription>
          Forward lead emails from platforms like HiPages, Airtasker, or ServiceSeeking to this address so Earlymark can create the lead automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={
            readinessMessage.tone === "success"
              ? "rounded-[18px] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
              : readinessMessage.tone === "warning"
                ? "rounded-[18px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
                : readinessMessage.tone === "info"
                  ? "rounded-[18px] border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"
                  : "rounded-[18px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"
          }
        >
          <div className="font-medium">{readinessMessage.title}</div>
          <div className="mt-1">{readinessMessage.body}</div>
        </div>

        <div className="space-y-2">
          <Label>Forward lead emails to</Label>
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
                ? "When a forwarded lead email arrives here, Earlymark will create the lead automatically."
                : "This address is ready. Forward your first live lead email here to finish confirming the flow."
              : "Wait until the setup above is ready before forwarding live leads to this address."}
          </p>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border/50 p-4">
          <div>
            <Label htmlFor="auto-call-leads" className="text-base font-medium">Call new email leads straight away</Label>
            <p className="text-sm text-muted-foreground mt-0.5">
              If this is on, Tracey will call the lead as soon as an eligible lead email arrives. If it is off, the lead is still captured in Earlymark without the immediate call.
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
