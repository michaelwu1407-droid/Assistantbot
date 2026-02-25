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
          Forward &quot;Lead Won&quot; emails from HiPages, Airtasker, or ServiceSeeking to your unique address. We create the contact and deal and can call the lead straight away.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Your forwarding email</Label>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm font-mono">
              {forwardingEmail || "—"}
            </code>
            <Button variant="outline" size="icon" onClick={handleCopy} disabled={!forwardingEmail} title="Copy">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Set up a Gmail (or other) filter to forward &quot;Lead Won&quot; / &quot;Job Won&quot; emails from HiPages, Airtasker, or ServiceSeeking to this address. We’ll identify the lead, create a contact and deal, and optionally call them immediately.
          </p>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border/50 p-4">
          <div>
            <Label htmlFor="auto-call-leads" className="text-base font-medium">Call new leads immediately?</Label>
            <p className="text-sm text-muted-foreground mt-0.5">
              When we receive a lead email, Travis can place an outbound call to the lead’s phone number right away to lock in the job.
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
