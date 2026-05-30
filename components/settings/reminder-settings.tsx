"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getWorkspaceSettings, updateWorkspaceSettings } from "@/actions/settings-actions";
import { Clock, MessageSquare } from "lucide-react";

const REMINDER_PRESETS = [
  { label: "2 hours before", hours: 2 },
  { label: "The day before", hours: 24 },
  { label: "Two days before", hours: 48 },
  { label: "A week before", hours: 168 },
] as const;

export function ReminderSettings() {
  const [settings, setSettings] = useState({
    jobReminderHours: 24,
    enableJobReminders: true,
    enableTripSms: true,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    getWorkspaceSettings()
      .then((result) => {
        if (result) {
          setSettings({
            jobReminderHours: result.jobReminderHours || 24,
            enableJobReminders: result.enableJobReminders ?? true,
            enableTripSms: result.enableTripSms ?? true,
          });
        }
      })
      .catch(() => toast.error("Couldn't load settings — please refresh."))
      .finally(() => setLoading(false));
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const current = await getWorkspaceSettings();
      if (!current) throw new Error("Couldn't load settings");
      await updateWorkspaceSettings({
        agentMode: current.agentMode ?? "DRAFT",
        workingHoursStart: current.workingHoursStart ?? "08:00",
        workingHoursEnd: current.workingHoursEnd ?? "17:00",
        agendaNotifyTime: current.agendaNotifyTime ?? "07:30",
        wrapupNotifyTime: current.wrapupNotifyTime ?? "17:30",
        workspaceTimezone: current.workspaceTimezone ?? "Australia/Sydney",
        jobReminderHours: settings.jobReminderHours,
        enableJobReminders: settings.enableJobReminders,
        enableTripSms: settings.enableTripSms,
      });
      toast.success("Reminder settings saved");
    } catch {
      toast.error("Couldn't save settings — please try again.");
    } finally {
      setSaving(false);
    }
  };

  const selectedPreset = REMINDER_PRESETS.find((p) => p.hours === settings.jobReminderHours);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Job Reminders
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="text-center py-4 app-body-secondary">Loading…</div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="enableJobReminders">Send reminder to customer</Label>
                <p className="app-body-secondary">
                  Tracey texts the customer a reminder before each scheduled job.
                </p>
              </div>
              <Switch
                id="enableJobReminders"
                checked={settings.enableJobReminders}
                onCheckedChange={(checked) => setSettings({ ...settings, enableJobReminders: checked })}
              />
            </div>

            <div className={cn("space-y-2", !settings.enableJobReminders && "opacity-40 pointer-events-none")}>
              <Label>When to send it</Label>
              <div className="grid grid-cols-2 gap-2">
                {REMINDER_PRESETS.map((preset) => (
                  <button
                    key={preset.hours}
                    type="button"
                    onClick={() => setSettings({ ...settings, jobReminderHours: preset.hours })}
                    className={cn(
                      "rounded-md border px-3 py-2.5 text-sm font-medium text-left transition-colors",
                      settings.jobReminderHours === preset.hours
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-card text-foreground hover:bg-muted"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="enableTripSms">Send &quot;On my way&quot; text</Label>
                <p className="app-body-secondary">
                  When you start driving to a job, Tracey lets the customer know you&apos;re on your way.
                </p>
              </div>
              <Switch
                id="enableTripSms"
                checked={settings.enableTripSms}
                onCheckedChange={(checked) => setSettings({ ...settings, enableTripSms: checked })}
              />
            </div>

            <div className="pt-4 border-t">
              <Button onClick={saveSettings} disabled={saving} className="w-full">
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>

            <div className="rounded-md bg-muted/50 p-4 space-y-1">
              <div className="flex items-center gap-2 app-body-primary font-medium">
                <MessageSquare className="h-4 w-4" />
                How it works
              </div>
              <ul className="app-body-secondary space-y-1 pl-6 list-disc">
                {settings.enableJobReminders && selectedPreset && (
                  <li>Customer gets a reminder text {selectedPreset.label.toLowerCase()}</li>
                )}
                {settings.enableTripSms && (
                  <li>Customer gets an &quot;on my way&quot; text when you start driving</li>
                )}
                <li>All messages are saved to the job timeline</li>
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
