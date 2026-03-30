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

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

export default function NotificationsSettingsPage() {
  const pushConfigured = Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null)
  const [saving, setSaving] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)

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
          webPushEnabled: false,
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

  const setWebPush = async (enabled: boolean) => {
    if (!prefs) return
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidPublicKey) {
      toast.error("Push is not configured yet (missing VAPID key).")
      return
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      toast.error("This browser does not support push notifications.")
      return
    }
    setPushBusy(true)
    try {
      const registration = await navigator.serviceWorker.ready
      if (!enabled) {
        const existing = await registration.pushManager.getSubscription()
        if (existing) {
          await fetch("/api/push/unsubscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: existing.endpoint }),
          })
          await existing.unsubscribe()
        }
        await updatePref("webPushEnabled", false)
        toast.success("Push notifications turned off")
        return
      }

      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        toast.error("Please allow browser notifications to enable push.")
        return
      }
      const existing = await registration.pushManager.getSubscription()
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64UrlToUint8Array(vapidPublicKey) as unknown as BufferSource,
        }))
      const payload = subscription.toJSON()
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      await updatePref("webPushEnabled", true)
      toast.success("Push notifications enabled")
    } catch {
      toast.error("Could not update push notifications")
    } finally {
      setPushBusy(false)
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
          <h3 className="app-section-title">Notifications</h3>
          <p className="app-body-secondary">Choose which emails and app alerts you want to receive.</p>
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
          <CardDescription>Choose what appears in the app.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Task reminders</Label>
              <p className="text-sm text-muted-foreground">Show reminders for your day and follow-ups.</p>
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
          <div className="relative overflow-hidden rounded-[18px] border border-slate-200 p-4 dark:border-slate-800">
            {!pushConfigured && (
              <>
                <div className="pointer-events-none absolute inset-0 bg-white/55 backdrop-blur-[1px] dark:bg-slate-950/45" />
                <div className="pointer-events-none absolute right-3 top-3 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-900 dark:border-amber-800 dark:bg-amber-950/70 dark:text-amber-100">
                  Draft
                </div>
              </>
            )}
            <div className="relative flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label>Browser push notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Get instant phone or laptop alerts for new app notifications.
                </p>
                {!pushConfigured && (
                  <p className="text-sm text-muted-foreground">Not available yet.</p>
                )}
              </div>
              <Switch
                checked={pushConfigured && prefs.webPushEnabled}
                disabled={!pushConfigured || pushBusy}
                onCheckedChange={(v) => {
                  void setWebPush(v)
                }}
              />
            </div>
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
