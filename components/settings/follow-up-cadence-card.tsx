"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bell } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { getWorkspaceSettings, updateWorkspaceSettings } from "@/actions/settings-actions"

const QUOTE_PRESETS = [
  { label: "3 days", days: 3 },
  { label: "5 days", days: 5 },
  { label: "1 week", days: 7 },
  { label: "2 weeks", days: 14 },
]

const INVOICE_PRESETS = [
  { label: "1 week", days: 7 },
  { label: "2 weeks", days: 14 },
  { label: "3 weeks", days: 21 },
  { label: "1 month", days: 30 },
]

export function FollowUpCadenceCard() {
  const [quoteDays, setQuoteDays] = useState(3)
  const [invoiceDays, setInvoiceDays] = useState(7)
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getWorkspaceSettings().then((s) => {
      if (!s) return
      const sc = s.softChase as { triggerDays?: number } | undefined
      const inv = s.invoiceFollowUp as { triggerDays?: number } | undefined
      setQuoteDays(sc?.triggerDays ?? 3)
      setInvoiceDays(inv?.triggerDays ?? 7)
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const current = await getWorkspaceSettings()
      if (!current) throw new Error()
      await updateWorkspaceSettings({
        agentMode: current.agentMode ?? "DRAFT",
        workingHoursStart: current.workingHoursStart ?? "08:00",
        workingHoursEnd: current.workingHoursEnd ?? "17:00",
        agendaNotifyTime: current.agendaNotifyTime ?? "07:30",
        wrapupNotifyTime: current.wrapupNotifyTime ?? "17:30",
        workspaceTimezone: current.workspaceTimezone ?? "Australia/Sydney",
        softChase: { triggerDays: quoteDays, channel: "sms" },
        invoiceFollowUp: { triggerDays: invoiceDays, channel: "email" },
      })
      toast.success("Follow-up cadence saved")
    } catch {
      toast.error("Couldn't save — please try again.")
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Tracey follow-up reminders
        </CardTitle>
        <CardDescription>
          Tracey will remind you in the app when quotes or invoices have been waiting too long.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <p className="app-body-primary font-medium">Chase unanswered quotes after</p>
          <p className="app-body-secondary">
            If a customer hasn&apos;t replied to a quote, Tracey will nudge you to follow up.
          </p>
          <div className="grid grid-cols-4 gap-2">
            {QUOTE_PRESETS.map((p) => (
              <button
                key={p.days}
                type="button"
                onClick={() => setQuoteDays(p.days)}
                className={cn(
                  "rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                  quoteDays === p.days
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card text-foreground hover:bg-muted"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="app-body-primary font-medium">Chase unpaid invoices after</p>
          <p className="app-body-secondary">
            If an invoice hasn&apos;t been paid, Tracey will remind you to send a follow-up.
          </p>
          <div className="grid grid-cols-4 gap-2">
            {INVOICE_PRESETS.map((p) => (
              <button
                key={p.days}
                type="button"
                onClick={() => setInvoiceDays(p.days)}
                className={cn(
                  "rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                  invoiceDays === p.days
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card text-foreground hover:bg-muted"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <Button onClick={save} disabled={saving} className="w-full">
          {saving ? "Saving…" : "Save"}
        </Button>
      </CardContent>
    </Card>
  )
}
