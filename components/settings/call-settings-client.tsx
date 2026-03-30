"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, MessageSquare, Save } from "lucide-react"
import { getPhoneNumberStatus } from "@/actions/phone-settings"
import { getWorkspaceSettings, updateWorkspaceSettings } from "@/actions/settings-actions"
import {
  getAutomatedMessageRules,
  updateAutomatedMessageRule,
  type AutomatedMessageRuleView,
} from "@/actions/automated-message-actions"
import { toast } from "sonner"
import { AU_TIMEZONE_OPTIONS, DEFAULT_WORKSPACE_TIMEZONE } from "@/lib/timezone"

type SettingsState = {
  agentMode: string
  workingHoursStart: string
  workingHoursEnd: string
  agendaNotifyTime: string
  wrapupNotifyTime: string
  workspaceTimezone?: string
  agentBusinessName?: string
  textAllowedStart?: string
  textAllowedEnd?: string
  callAllowedStart?: string
  callAllowedEnd?: string
}

type PhoneStatus = {
  hasPhoneNumber: boolean
  hasSubaccount: boolean
}

const DEFAULT_SETTINGS: SettingsState = {
  agentMode: "EXECUTION",
  workingHoursStart: "08:00",
  workingHoursEnd: "17:00",
  agendaNotifyTime: "07:30",
  wrapupNotifyTime: "17:30",
  workspaceTimezone: DEFAULT_WORKSPACE_TIMEZONE,
  textAllowedStart: "08:00",
  textAllowedEnd: "20:00",
  callAllowedStart: "08:00",
  callAllowedEnd: "20:00",
}

const BOOKING_REMINDER_TIMINGS = [
  { value: "-24", label: "24h before" },
  { value: "-12", label: "12h before" },
  { value: "-1", label: "1h before" },
  { value: "-30", label: "30 mins before" },
  { value: "-15", label: "15 mins before" },
]

const FOLLOW_UP_TIMINGS = [
  { value: "1", label: "1h after" },
  { value: "2", label: "2h after" },
  { value: "6", label: "6h after" },
  { value: "12", label: "12h after" },
  { value: "24", label: "24h after" },
]

function ensureSmsSignature(message: string, businessName: string) {
  const trimmed = message.trim()
  const signature = `Kind regards, Tracey (AI assistant for ${businessName})`
  if (!trimmed) return signature
  const withoutSignature = trimmed.replace(
    /\n*\s*Kind regards,\s*Tracey\s*\(AI assistant for .*?\)\s*$/i,
    "",
  ).trim()
  return `${withoutSignature}\n\n${signature}`
}

function getRuleType(triggerType: string): "booking-reminder" | "booking-confirmation" | "follow-up" | "other" {
  if (triggerType.includes("booking_confirmation")) return "booking-confirmation"
  if (triggerType.includes("follow_up")) return "follow-up"
  if (triggerType.includes("booking_reminder")) return "booking-reminder"
  return "other"
}

function getRuleDisplayName(rule: AutomatedMessageRuleView) {
  const type = getRuleType(rule.triggerType)
  if (type === "booking-reminder") return "Booking reminder"
  if (type === "booking-confirmation") return "Booking confirmation"
  if (type === "follow-up") return "Post-job follow-up"
  return rule.name
}

function getRuleDescription(rule: AutomatedMessageRuleView) {
  const type = getRuleType(rule.triggerType)
  if (type === "booking-reminder") return "Reminder sent before the booked time."
  if (type === "booking-confirmation") return "Confirmation sent when the booking is locked in."
  if (type === "follow-up") return "Follow-up sent after the job is completed."
  return rule.triggerType
}

function getRuleTimingOptions(rule: AutomatedMessageRuleView) {
  const type = getRuleType(rule.triggerType)
  if (type === "booking-reminder") return BOOKING_REMINDER_TIMINGS
  if (type === "follow-up") return FOLLOW_UP_TIMINGS
  if (type === "booking-confirmation") {
    return [{ value: "0", label: "Instant (on accepted booking)" }]
  }
  return [
    { value: "-1", label: "1h before" },
    { value: "0", label: "At event" },
    { value: "1", label: "1h after" },
  ]
}

export function CallSettingsClient() {
  const [phoneStatus, setPhoneStatus] = useState<PhoneStatus>({ hasPhoneNumber: false, hasSubaccount: false })
  const [settings, setSettings] = useState<SettingsState | null>(null)
  const [rules, setRules] = useState<AutomatedMessageRuleView[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingRuleId, setSavingRuleId] = useState<string | null>(null)
  const [rulesError, setRulesError] = useState<string | null>(null)

  const businessName = useMemo(() => settings?.agentBusinessName?.trim() || "your business", [settings?.agentBusinessName])

  useEffect(() => {
    Promise.allSettled([getPhoneNumberStatus(), getWorkspaceSettings(), getAutomatedMessageRules()])
      .then((results) => {
        const [phoneResult, settingsResult, rulesResult] = results

        if (phoneResult.status === "fulfilled") {
          setPhoneStatus({
            hasPhoneNumber: Boolean(phoneResult.value.hasPhoneNumber),
            hasSubaccount: Boolean(phoneResult.value.hasSubaccount),
          })
        }

        if (settingsResult.status === "fulfilled" && settingsResult.value) {
          const ws = settingsResult.value
          setSettings({
            agentMode: ws.agentMode || "EXECUTION",
            workingHoursStart: ws.workingHoursStart || "08:00",
            workingHoursEnd: ws.workingHoursEnd || "17:00",
            agendaNotifyTime: ws.agendaNotifyTime || "07:30",
            wrapupNotifyTime: ws.wrapupNotifyTime || "17:30",
            workspaceTimezone: ws.workspaceTimezone || DEFAULT_WORKSPACE_TIMEZONE,
            agentBusinessName: ws.agentBusinessName || "",
            textAllowedStart: ws.textAllowedStart || "08:00",
            textAllowedEnd: ws.textAllowedEnd || "20:00",
            callAllowedStart: ws.callAllowedStart || "08:00",
            callAllowedEnd: ws.callAllowedEnd || "20:00",
          })
        } else {
          setSettings(DEFAULT_SETTINGS)
          toast.error("Loaded default contact settings because your saved settings could not be loaded.")
        }

        if (rulesResult.status === "fulfilled") {
          setRules(rulesResult.value)
          setRulesError(null)
        } else {
          setRules([])
          setRulesError("Automated text messages are unavailable right now. Try again in a moment.")
          toast.error("Failed to load automated text messages")
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const saveSettings = async (next: SettingsState) => {
    setSaving(true)
    try {
      await updateWorkspaceSettings({
        agentMode: next.agentMode,
        workingHoursStart: next.workingHoursStart,
        workingHoursEnd: next.workingHoursEnd,
        agendaNotifyTime: next.agendaNotifyTime,
        wrapupNotifyTime: next.wrapupNotifyTime,
        workspaceTimezone: next.workspaceTimezone,
        textAllowedStart: next.textAllowedStart,
        textAllowedEnd: next.textAllowedEnd,
        callAllowedStart: next.callAllowedStart,
        callAllowedEnd: next.callAllowedEnd,
      })
      setSettings(next)
      toast.success("Settings saved")
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const saveRule = async (rule: AutomatedMessageRuleView) => {
    setSavingRuleId(rule.id)
    try {
      const normalizedHoursOffset = getRuleType(rule.triggerType) === "booking-confirmation" ? 0 : rule.hoursOffset
      const normalizedTemplate = ensureSmsSignature(rule.messageTemplate, businessName)

      const result = await updateAutomatedMessageRule(rule.id, {
        enabled: rule.enabled,
        messageTemplate: normalizedTemplate,
        hoursOffset: normalizedHoursOffset,
      })
      if (!result.success) {
        throw new Error(result.error || "Failed to update template")
      }

      setRules((prev) =>
        prev.map((currentRule) =>
          currentRule.id === rule.id
            ? { ...rule, hoursOffset: normalizedHoursOffset, messageTemplate: normalizedTemplate }
            : currentRule,
        ),
      )
      toast.success("Automated text message saved")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update template")
    } finally {
      setSavingRuleId(null)
    }
  }

  if (loading || !settings) {
    return (
      <div className="flex items-center gap-2 text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm dark:border-slate-800">
        <CardHeader>
          <CardTitle>Customer contact hours</CardTitle>
          <CardDescription>
            Choose when Tracey is allowed to call or text customers. This is separate from your business opening hours in My business.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select
                value={settings.workspaceTimezone || DEFAULT_WORKSPACE_TIMEZONE}
                onValueChange={(value) => setSettings((current) => (current ? { ...current, workspaceTimezone: value } : current))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AU_TIMEZONE_OPTIONS.map((timezone) => (
                    <SelectItem key={timezone} value={timezone}>
                      {timezone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Text customers between</Label>
              <Input
                type="time"
                value={settings.textAllowedStart || "08:00"}
                onChange={(event) =>
                  setSettings((current) => (current ? { ...current, textAllowedStart: event.target.value } : current))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>and</Label>
              <Input
                type="time"
                value={settings.textAllowedEnd || "20:00"}
                onChange={(event) =>
                  setSettings((current) => (current ? { ...current, textAllowedEnd: event.target.value } : current))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Call customers between</Label>
              <Input
                type="time"
                value={settings.callAllowedStart || "08:00"}
                onChange={(event) =>
                  setSettings((current) => (current ? { ...current, callAllowedStart: event.target.value } : current))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>and</Label>
              <Input
                type="time"
                value={settings.callAllowedEnd || "20:00"}
                onChange={(event) =>
                  setSettings((current) => (current ? { ...current, callAllowedEnd: event.target.value } : current))
                }
              />
            </div>
          </div>

          <Button size="sm" onClick={() => saveSettings(settings)} disabled={saving}>
            {saving ? "Saving..." : "Save contact hours"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm dark:border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Automated text messages
          </CardTitle>
          <CardDescription>
            These are the automatic text messages Tracey sends for bookings and follow-up.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!phoneStatus.hasPhoneNumber || !phoneStatus.hasSubaccount ? (
            <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
              Automated text messages start sending after your Tracey number is provisioned in Account.
            </div>
          ) : null}

          {rulesError ? (
            <div className="rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200">
              {rulesError}
            </div>
          ) : rules.length === 0 ? (
            <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
              No automated text messages have been set up yet.
            </div>
          ) : (
            rules.map((rule) => (
              <div key={rule.id} className="space-y-3 rounded-[18px] border border-slate-200 p-4 dark:border-slate-700">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{getRuleDisplayName(rule)}</p>
                    <p className="text-xs text-slate-500">{getRuleDescription(rule)}</p>
                  </div>
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={(checked) =>
                      setRules((prev) => prev.map((currentRule) => (
                        currentRule.id === rule.id ? { ...currentRule, enabled: checked } : currentRule
                      )))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Send timing</Label>
                  {getRuleType(rule.triggerType) === "booking-confirmation" ? (
                    <Input value="Instant (on accepted booking)" disabled />
                  ) : (
                    <Select
                      value={String(rule.hoursOffset)}
                      onValueChange={(value) =>
                        setRules((prev) =>
                          prev.map((currentRule) => (
                            currentRule.id === rule.id
                              ? { ...currentRule, hoursOffset: Number(value) }
                              : currentRule
                          )),
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getRuleTimingOptions(rule).map((option) => (
                          <SelectItem key={`${rule.id}-${option.value}`} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea
                    value={rule.messageTemplate}
                    onChange={(event) =>
                      setRules((prev) =>
                        prev.map((currentRule) => (
                          currentRule.id === rule.id
                            ? { ...currentRule, messageTemplate: event.target.value }
                            : currentRule
                        )),
                      )
                    }
                    rows={3}
                  />
                  <p className="text-xs text-slate-500">
                    Sign-off is fixed and automatically appended: Kind regards, Tracey (AI assistant for {businessName}).
                  </p>
                </div>

                <Button size="sm" variant="outline" onClick={() => saveRule(rule)} disabled={savingRuleId === rule.id}>
                  {savingRuleId === rule.id ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Save automated message
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
