"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getWorkspaceSettings, updateWorkspaceSettings } from "@/actions/settings-actions";
import { Clock, MessageSquare, Settings } from "lucide-react";

export function ReminderSettings() {
  const [settings, setSettings] = useState({
    jobReminderHours: 24,
    enableJobReminders: true,
    enableTripSms: true,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const result = await getWorkspaceSettings();
      if (result) {
        setSettings({
          jobReminderHours: result.jobReminderHours || 24,
          enableJobReminders: result.enableJobReminders ?? true,
          enableTripSms: result.enableTripSms ?? true,
        });
      }
    } catch (error) {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await updateWorkspaceSettings({
        ...settings,
        // Include other required fields
        agentMode: "ORGANIZE",
        workingHoursStart: "08:00",
        workingHoursEnd: "17:00",
        agendaNotifyTime: "07:30",
        wrapupNotifyTime: "17:30",
      });
      toast.success("Settings saved successfully");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Job Reminders
          <Badge variant="outline">Beta</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="text-center py-4">Loading settings...</div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="enableJobReminders">Enable Job Reminders</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically send reminder SMS to customers before scheduled jobs
                </p>
              </div>
              <Switch
                id="enableJobReminders"
                checked={settings.enableJobReminders}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enableJobReminders: checked })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="jobReminderHours">Reminder Time</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="jobReminderHours"
                  type="number"
                  min="1"
                  max="168"
                  value={settings.jobReminderHours}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      jobReminderHours: parseInt(e.target.value) || 24,
                    })
                  }
                  disabled={!settings.enableJobReminders}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">
                  hours before the job
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Default: 24 hours. Range: 1-168 hours (1 week)
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="enableTripSms">Enable Trip SMS</Label>
                <p className="text-sm text-muted-foreground">
                  Send "On my way" SMS when driver starts trip in maps view
                </p>
              </div>
              <Switch
                id="enableTripSms"
                checked={settings.enableTripSms}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enableTripSms: checked })
                }
              />
            </div>

            <div className="pt-4 border-t">
              <Button onClick={saveSettings} disabled={saving} className="w-full">
                {saving ? "Saving..." : "Save Settings"}
              </Button>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <MessageSquare className="h-4 w-4" />
                <span className="font-medium">How it works:</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Job reminders are sent automatically {settings.jobReminderHours} hours before scheduled time</li>
                <li>• Trip SMS is sent when driver clicks "Start Trip" in maps view</li>
                <li>• All messages are logged as activities for tracking</li>
                <li>• Requires Twilio phone number to be configured</li>
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
