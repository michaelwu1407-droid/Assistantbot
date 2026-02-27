"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Mail, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getWorkspaceSettings, updateWorkspaceSettings } from "@/actions/settings-actions";
import { getOrAllocateLeadCaptureEmail } from "@/actions/settings-actions";

export function EmailLeadCaptureSettings() {
  const [forwardingEmail, setForwardingEmail] = useState<string>("");
  const [autoCallLeads, setAutoCallLeads] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [email, settings] = await Promise.all([
          getOrAllocateLeadCaptureEmail(),
          getWorkspaceSettings(),
        ]);
        if (!cancelled) {
          setForwardingEmail(email);
          setAutoCallLeads(settings?.autoCallLeads ?? false);
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
      toast.success(checked ? "Travis will call new leads immediately." : "Auto-call new leads turned off.");
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
          Forward "Lead Won" emails from HiPages, Airtasker, or ServiceSeeking to your unique address.
          Format is [firstname]@[businessname].earlymark.ai, with 1, 2, etc. appended if first names repeat.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
            Set up a filter to forward lead emails to this address. We identify the lead and create the contact and deal automatically.
          </p>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border/50 p-4">
          <div>
            <Label htmlFor="auto-call-leads" className="text-base font-medium">Call new leads immediately?</Label>
            <p className="text-sm text-muted-foreground mt-0.5">
              If ON, Travis calls the lead immediately when an eligible lead email arrives. If OFF, the lead is still captured, but no immediate call is made.
            </p>
          </div>
          <Switch
            id="auto-call-leads"
            checked={autoCallLeads}
            onCheckedChange={handleToggleAutoCall}
            disabled={saving}
          />
        </div>
      </CardContent>
    </Card>
  );
}
