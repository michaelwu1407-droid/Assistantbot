"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Clock } from "lucide-react"
import { updateWorkspaceSettings, getWorkspaceSettings } from "@/actions/settings-actions"
import { toast } from "sonner"

interface WorkingHoursFormProps {
  initialData: {
    workingHoursStart: string
    workingHoursEnd: string
    agendaNotifyTime: string
    wrapupNotifyTime: string
  }
}

export function WorkingHoursForm({ initialData }: WorkingHoursFormProps) {
  const [start, setStart] = useState(initialData.workingHoursStart)
  const [end, setEnd] = useState(initialData.workingHoursEnd)
  const [agendaTime, setAgendaTime] = useState(initialData.agendaNotifyTime)
  const [wrapupTime, setWrapupTime] = useState(initialData.wrapupNotifyTime)
  const [emergency, setEmergency] = useState(true)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const currentSettings = await getWorkspaceSettings()
      if (!currentSettings) {
        toast.error("Failed to get current settings")
        return
      }
      
      await updateWorkspaceSettings({
        agentMode: currentSettings.agentMode || "EXECUTE",
        workingHoursStart: start,
        workingHoursEnd: end,
        agendaNotifyTime: agendaTime,
        wrapupNotifyTime: wrapupTime,
        aiPreferences: currentSettings.aiPreferences || undefined,
        autoUpdateGlossary: currentSettings.autoUpdateGlossary,
        callOutFee: currentSettings.callOutFee,
        jobReminderHours: currentSettings.jobReminderHours || undefined,
        enableJobReminders: currentSettings.enableJobReminders,
        enableTripSms: currentSettings.enableTripSms,
        agentScriptStyle: currentSettings.agentScriptStyle as "opening" | "closing" | undefined,
        agentBusinessName: currentSettings.agentBusinessName || undefined,
        agentOpeningMessage: currentSettings.agentOpeningMessage || undefined,
        agentClosingMessage: currentSettings.agentClosingMessage || undefined,
        textAllowedStart: currentSettings.textAllowedStart || undefined,
        textAllowedEnd: currentSettings.textAllowedEnd || undefined,
        callAllowedStart: currentSettings.callAllowedStart || undefined,
        callAllowedEnd: currentSettings.callAllowedEnd || undefined,
        softChase: currentSettings.softChase || undefined,
        invoiceFollowUp: currentSettings.invoiceFollowUp || undefined,
        inboundEmailAlias: currentSettings.inboundEmailAlias,
        autoCallLeads: currentSettings.autoCallLeads,
      })
      toast.success("Working hours saved")
    } catch {
      toast.error("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Business hours
        </CardTitle>
        <CardDescription>
          When your business is open. Used for AI scheduling and notifications.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Start time</Label>
            <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>End time</Label>
            <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Morning agenda notify</Label>
            <Input type="time" value={agendaTime} onChange={(e) => setAgendaTime(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Evening wrap-up notify</Label>
            <Input type="time" value={wrapupTime} onChange={(e) => setWrapupTime(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>Emergency callout</Label>
            <p className="text-xs text-slate-500">Offer emergency service outside business hours</p>
          </div>
          <Switch checked={emergency} onCheckedChange={setEmergency} />
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save hours"}
        </Button>
      </CardContent>
    </Card>
  )
}
