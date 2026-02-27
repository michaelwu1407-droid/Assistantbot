"use client"

import { useEffect, useState } from "react"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, MessageSquare, Loader2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  getNotificationPreferences,
  saveNotificationPreferences,
  sendTestNotification,
  type NotificationPreferences,
} from "@/actions/notification-actions"
import { toast } from "sonner"

export default function NotificationsSettingsPage() {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null)
  const [saving, setSaving] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)

  useEffect(() => {
    getNotificationPreferences()
      .then(setPrefs)
      .catch(() => {
        setPrefs({
          emailDealUpdates: true,
          emailNewContacts: true,
          emailWeeklySummary: true,
          inAppTaskReminders: true,
          inAppStaleDealAlerts: true,
        })
      })
  }, [])

  const updatePref = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!prefs) return
    const previous = prefs
    const updated = { ...prefs, [key]: value }
    setPrefs(updated)
    setSaving(true)
    try {
      await saveNotificationPreferences(updated)
      toast.success("Notification preferences saved")
    } catch {
      setPrefs(previous)
      toast.error("Failed to save preferences")
    } finally {
      setSaving(false)
    }
  }

  const handleSendTest = async () => {
    setSendingTest(true)
    try {
      await sendTestNotification()
      toast.success("Test notification sent")
    } catch {
      toast.error("Failed to send test notification")
    } finally {
      setSendingTest(false)
    }
  }

  if (!prefs) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Notifications</h3>
          <p className="text-sm text-muted-foreground">Configure real email and in-app notification behavior. Call/text automation is managed in Automated calling & texting.</p>
        </div>
        {saving && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Saving...
          </span>
        )}
      </div>
      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email notifications
          </CardTitle>
          <CardDescription>Choose what emails you receive.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Deal updates</Label>
              <p className="text-sm text-muted-foreground">Get notified when deals are updated.</p>
            </div>
            <Switch checked={prefs.emailDealUpdates} onCheckedChange={(v) => updatePref("emailDealUpdates", v)} />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>New contacts</Label>
              <p className="text-sm text-muted-foreground">Get notified when contacts are created.</p>
            </div>
            <Switch checked={prefs.emailNewContacts} onCheckedChange={(v) => updatePref("emailNewContacts", v)} />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Weekly summary</Label>
              <p className="text-sm text-muted-foreground">Receive a weekly pipeline summary.</p>
            </div>
            <Switch checked={prefs.emailWeeklySummary} onCheckedChange={(v) => updatePref("emailWeeklySummary", v)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            In-app notifications
          </CardTitle>
          <CardDescription>Control what appears in the app notification feed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Task reminders</Label>
              <p className="text-sm text-muted-foreground">Show reminders for daily agenda and follow-ups.</p>
            </div>
            <Switch checked={prefs.inAppTaskReminders} onCheckedChange={(v) => updatePref("inAppTaskReminders", v)} />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Stale deal alerts</Label>
              <p className="text-sm text-muted-foreground">Alert when deals need attention.</p>
            </div>
            <Switch checked={prefs.inAppStaleDealAlerts} onCheckedChange={(v) => updatePref("inAppStaleDealAlerts", v)} />
          </div>
          <Button variant="outline" onClick={handleSendTest} disabled={sendingTest}>
            {sendingTest ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Send test notification
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
