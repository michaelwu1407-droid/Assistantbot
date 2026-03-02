"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Phone, Copy, AlertTriangle, Mic, MessageSquare, Volume2, Loader2, Save, ChevronDown } from "lucide-react"
import { getPhoneNumberStatus } from "@/actions/phone-settings"
import { getWorkspaceSettings, updateWorkspaceSettings } from "@/actions/settings-actions"
import { getAutomatedMessageRules, updateAutomatedMessageRule, type AutomatedMessageRuleView } from "@/actions/automated-message-actions"
import { toast } from "sonner"

type SettingsState = {
  agentMode: string
  workingHoursStart: string
  workingHoursEnd: string
  agendaNotifyTime: string
  wrapupNotifyTime: string
  aiPreferences?: string
  autoUpdateGlossary?: boolean
  callOutFee?: number
  jobReminderHours?: number
  enableJobReminders?: boolean
  enableTripSms?: boolean
  agentScriptStyle?: "opening" | "closing"
  agentBusinessName?: string
  agentOpeningMessage?: string
  agentClosingMessage?: string
  textAllowedStart?: string
  textAllowedEnd?: string
  callAllowedStart?: string
  callAllowedEnd?: string
  softChase?: { message?: string; triggerDays?: number; channel?: string }
  invoiceFollowUp?: { message?: string; triggerDays?: number; channel?: string }
  inboundEmailAlias?: string | null
  autoCallLeads?: boolean
  emergencyBypass?: boolean
  emergencyHoursStart?: string
  emergencyHoursEnd?: string
  recordCalls?: boolean
  agentPersonality?: "Professional" | "Friendly"
  agentResponseLength?: number
  voiceEnabled?: boolean
  voiceLanguage?: string
  voiceType?: "female" | "male" | "neutral"
  voiceSpeed?: "0.8" | "1.0" | "1.2"
  voiceGreeting?: string
  voiceAfterHoursMessage?: string
  transcribeVoicemails?: boolean
  autoRespondToMessages?: boolean
}

const DEFAULT_SETTINGS: SettingsState = {
  agentMode: "EXECUTE",
  workingHoursStart: "08:00",
  workingHoursEnd: "17:00",
  agendaNotifyTime: "07:30",
  wrapupNotifyTime: "17:30",
  textAllowedStart: "08:00",
  textAllowedEnd: "20:00",
  callAllowedStart: "08:00",
  callAllowedEnd: "20:00",
  softChase: { message: "", triggerDays: 3, channel: "sms" },
  invoiceFollowUp: { message: "", triggerDays: 7, channel: "email" },
  autoCallLeads: false,
  emergencyBypass: false,
  emergencyHoursStart: "",
  emergencyHoursEnd: "",
  recordCalls: true,
  agentPersonality: "Professional",
  agentResponseLength: 50,
  voiceEnabled: false,
  voiceLanguage: "en-AU",
  voiceType: "female",
  voiceSpeed: "1.0",
  voiceGreeting: "Hi, I'm Tracey, AI assistant for your business.",
  agentOpeningMessage: "Hi, I'm Tracey, AI assistant for your business.",
  agentClosingMessage: "Kind regards, Tracey (AI assistant for your business)",
  voiceAfterHoursMessage: "",
  transcribeVoicemails: true,
  autoRespondToMessages: true,
}

function ensureSmsSignature(message: string, businessName: string) {
  const trimmed = message.trim()
  const signature = `Kind regards, Tracey (AI assistant for ${businessName})`
  if (!trimmed) return signature
  const withoutSignature = trimmed.replace(/\n*\s*Kind regards,\s*Tracey\s*\(AI assistant for .*?\)\s*$/i, "").trim()
  return `${withoutSignature}\n\n${signature}`
}

function ensureCallIntro(message: string, businessName: string) {
  const prefix = `Hi, I'm Tracey, AI assistant for ${businessName}.`
  const trimmed = message.trim()
  if (!trimmed) return prefix
  if (/^hi,\s*i'm travis,\s*ai assistant for /i.test(trimmed)) return trimmed
  return `${prefix} ${trimmed}`
}

function ensureCallSignoff(message: string, businessName: string) {
  const signature = `Kind regards, Tracey (AI assistant for ${businessName})`
  const trimmed = message.trim()
  if (!trimmed) return signature
  const withoutSignature = trimmed.replace(/\n*\s*Kind regards,\s*Tracey\s*\(AI assistant for .*?\)\s*$/i, "").trim()
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
  if (type === "follow-up") return "Follow up"
  return rule.name
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

function getRuleTimingOptions(rule: AutomatedMessageRuleView) {
  const type = getRuleType(rule.triggerType)
  if (type === "booking-reminder") return BOOKING_REMINDER_TIMINGS
  if (type === "follow-up") return FOLLOW_UP_TIMINGS
  if (type === "booking-confirmation") return [{ value: "0", label: "Instant (on accepted booking)" }]
  return [
    { value: "-1", label: "1h before" },
    { value: "0", label: "At event" },
    { value: "1", label: "1h after" },
  ]
}

export function CallSettingsClient() {
  const [status, setStatus] = useState<{ phoneNumber?: string | null; name?: string | null } | null>(null)
  const [settings, setSettings] = useState<SettingsState | null>(null)
  const [rules, setRules] = useState<AutomatedMessageRuleView[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingRuleId, setSavingRuleId] = useState<string | null>(null)
  const [templateLoadWarning, setTemplateLoadWarning] = useState<string | null>(null)

  const businessName = useMemo(() => status?.name || settings?.agentBusinessName || "your business", [status?.name, settings?.agentBusinessName])

  useEffect(() => {
    Promise.allSettled([getPhoneNumberStatus(), getWorkspaceSettings(), getAutomatedMessageRules()])
      .then((results) => {
        const [phoneResult, settingsResult, rulesResult] = results

        if (phoneResult.status === "fulfilled") {
          setStatus({ phoneNumber: phoneResult.value.phoneNumber, name: phoneResult.value.name })
        }

        if (settingsResult.status === "fulfilled" && settingsResult.value) {
          const ws = settingsResult.value
          setSettings({
            agentMode: ws.agentMode || "EXECUTE",
            workingHoursStart: ws.workingHoursStart || "08:00",
            workingHoursEnd: ws.workingHoursEnd || "17:00",
            agendaNotifyTime: ws.agendaNotifyTime || "07:30",
            wrapupNotifyTime: ws.wrapupNotifyTime || "17:30",
            aiPreferences: ws.aiPreferences ?? undefined,
            autoUpdateGlossary: ws.autoUpdateGlossary,
            callOutFee: ws.callOutFee ?? undefined,
            jobReminderHours: ws.jobReminderHours ?? undefined,
            enableJobReminders: ws.enableJobReminders,
            enableTripSms: ws.enableTripSms,
            agentScriptStyle: ws.agentScriptStyle as "opening" | "closing" | undefined,
            agentBusinessName: ws.agentBusinessName,
            agentOpeningMessage: ws.agentOpeningMessage || `Hi, I'm Tracey, AI assistant for ${ws.agentBusinessName || "your business"}.`,
            agentClosingMessage: ws.agentClosingMessage || `Kind regards, Tracey (AI assistant for ${ws.agentBusinessName || "your business"})`,
            textAllowedStart: ws.textAllowedStart,
            textAllowedEnd: ws.textAllowedEnd,
            callAllowedStart: ws.callAllowedStart,
            callAllowedEnd: ws.callAllowedEnd,
            softChase: ws.softChase,
            invoiceFollowUp: ws.invoiceFollowUp,
            inboundEmailAlias: ws.inboundEmailAlias ?? undefined,
            autoCallLeads: ws.autoCallLeads,
            emergencyBypass: ws.emergencyBypass,
            emergencyHoursStart: ws.emergencyHoursStart,
            emergencyHoursEnd: ws.emergencyHoursEnd,
            recordCalls: ws.recordCalls,
            agentPersonality: ws.agentPersonality,
            agentResponseLength: ws.agentResponseLength,
            voiceEnabled: ws.voiceEnabled,
            voiceLanguage: ws.voiceLanguage,
            voiceType: ws.voiceType,
            voiceSpeed: ws.voiceSpeed,
            voiceGreeting: ws.voiceGreeting || `Hi, I'm Tracey, AI assistant for ${ws.agentBusinessName || "your business"}.`,
            voiceAfterHoursMessage: ws.voiceAfterHoursMessage,
            transcribeVoicemails: ws.transcribeVoicemails,
            autoRespondToMessages: ws.autoRespondToMessages,
          })
        } else {
          setSettings(DEFAULT_SETTINGS)
          toast.error("Loaded defaults because workspace call/text settings were unavailable")
        }

        if (rulesResult.status === "fulfilled") {
          setRules(rulesResult.value)
        } else {
          setRules([])
          setTemplateLoadWarning("SMS templates are temporarily unavailable. You can still update all other call and texting settings.")
          toast.error("Failed to load message templates")
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
        aiPreferences: next.aiPreferences,
        autoUpdateGlossary: next.autoUpdateGlossary,
        callOutFee: next.callOutFee,
        jobReminderHours: next.jobReminderHours,
        enableJobReminders: next.enableJobReminders,
        enableTripSms: next.enableTripSms,
        agentScriptStyle: next.agentScriptStyle,
        agentBusinessName: next.agentBusinessName,
        agentOpeningMessage: ensureCallIntro(next.agentOpeningMessage || "", businessName),
        agentClosingMessage: ensureCallSignoff(next.agentClosingMessage || "", businessName),
        textAllowedStart: next.textAllowedStart,
        textAllowedEnd: next.textAllowedEnd,
        callAllowedStart: next.callAllowedStart,
        callAllowedEnd: next.callAllowedEnd,
        softChase: next.softChase,
        invoiceFollowUp: next.invoiceFollowUp,
        inboundEmailAlias: next.inboundEmailAlias,
        autoCallLeads: next.autoCallLeads,
        emergencyBypass: next.emergencyBypass,
        emergencyHoursStart: next.emergencyHoursStart,
        emergencyHoursEnd: next.emergencyHoursEnd,
        recordCalls: next.recordCalls,
        agentPersonality: next.agentPersonality,
        agentResponseLength: next.agentResponseLength,
        voiceEnabled: next.voiceEnabled,
        voiceLanguage: next.voiceLanguage,
        voiceType: next.voiceType,
        voiceSpeed: next.voiceSpeed,
        voiceGreeting: ensureCallIntro(next.voiceGreeting || "", businessName),
        voiceAfterHoursMessage: next.voiceAfterHoursMessage,
        transcribeVoicemails: next.transcribeVoicemails,
        autoRespondToMessages: next.autoRespondToMessages,
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
      await updateAutomatedMessageRule(rule.id, {
        enabled: rule.enabled,
        messageTemplate: normalizedTemplate,
        hoursOffset: normalizedHoursOffset,
      })
      setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...rule, hoursOffset: normalizedHoursOffset, messageTemplate: normalizedTemplate } : r)))
      toast.success("Template updated")
    } catch {
      toast.error("Failed to update template")
    } finally {
      setSavingRuleId(null)
    }
  }

  const copyNumber = () => {
    if (status?.phoneNumber) {
      navigator.clipboard.writeText(status.phoneNumber)
      toast.success("Number copied")
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
      {templateLoadWarning && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {templateLoadWarning}
        </div>
      )}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            AI agent business number
          </CardTitle>
          <CardDescription>Customer-facing number for calls and SMS.</CardDescription>
        </CardHeader>
        <CardContent>
          {status?.phoneNumber ? (
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-medium">{status.phoneNumber}</span>
              <Button variant="outline" size="icon" onClick={copyNumber}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No business number provisioned yet. Complete onboarding or contact support.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader>
          <CardTitle>Handling hours</CardTitle>
          <CardDescription>When Tracey is allowed to schedule, text, and call.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Scheduling window start</Label>
              <Input type="time" value={settings.workingHoursStart} onChange={(e) => setSettings((s) => (s ? { ...s, workingHoursStart: e.target.value } : s))} />
            </div>
            <div className="space-y-2">
              <Label>Scheduling window end</Label>
              <Input type="time" value={settings.workingHoursEnd} onChange={(e) => setSettings((s) => (s ? { ...s, workingHoursEnd: e.target.value } : s))} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Texting window start</Label>
              <Input type="time" value={settings.textAllowedStart || "08:00"} onChange={(e) => setSettings((s) => (s ? { ...s, textAllowedStart: e.target.value } : s))} />
            </div>
            <div className="space-y-2">
              <Label>Texting window end</Label>
              <Input type="time" value={settings.textAllowedEnd || "20:00"} onChange={(e) => setSettings((s) => (s ? { ...s, textAllowedEnd: e.target.value } : s))} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Calling window start</Label>
              <Input type="time" value={settings.callAllowedStart || "08:00"} onChange={(e) => setSettings((s) => (s ? { ...s, callAllowedStart: e.target.value } : s))} />
            </div>
            <div className="space-y-2">
              <Label>Calling window end</Label>
              <Input type="time" value={settings.callAllowedEnd || "20:00"} onChange={(e) => setSettings((s) => (s ? { ...s, callAllowedEnd: e.target.value } : s))} />
            </div>
          </div>
          <Button size="sm" onClick={() => saveSettings(settings)} disabled={saving}>{saving ? "Saving..." : "Save handling hours"}</Button>
        </CardContent>
      </Card>

      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Emergency routing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Allow urgent calls to bypass AI</Label>
            <Switch
              checked={Boolean(settings.emergencyBypass)}
              onCheckedChange={(checked) => setSettings((s) => (s ? { ...s, emergencyBypass: checked } : s))}
            />
          </div>
          <Button size="sm" onClick={() => saveSettings(settings)} disabled={saving}>{saving ? "Saving..." : "Save emergency routing"}</Button>
        </CardContent>
      </Card>

      <details className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <summary className="list-none cursor-pointer px-4 py-3 flex items-center justify-between">
          <span className="flex items-center gap-2 font-medium"><Mic className="h-4 w-4" /> Transcription settings</span>
          <ChevronDown className="h-4 w-4 text-slate-500 transition-transform group-open:rotate-180" />
        </summary>
        <div className="px-4 pb-4 space-y-4">
          <div className="flex items-center justify-between">
            <Label>Record calls</Label>
            <Switch checked={Boolean(settings.recordCalls)} onCheckedChange={(checked) => setSettings((s) => (s ? { ...s, recordCalls: checked } : s))} />
          </div>
          <Button size="sm" onClick={() => saveSettings(settings)} disabled={saving}>{saving ? "Saving..." : "Save transcription settings"}</Button>
        </div>
      </details>

      <details className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <summary className="list-none cursor-pointer px-4 py-3 flex items-center justify-between">
          <span className="font-medium">Agent behaviour</span>
          <ChevronDown className="h-4 w-4 text-slate-500 transition-transform group-open:rotate-180" />
        </summary>
        <div className="px-4 pb-4 space-y-4">
          <div className="space-y-2">
            <Label>Personality</Label>
            <Select value={settings.agentPersonality || "Professional"} onValueChange={(v) => setSettings((s) => (s ? { ...s, agentPersonality: v as "Professional" | "Friendly" } : s))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Professional">Professional</SelectItem>
                <SelectItem value="Friendly">Friendly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Response length (%)</Label>
            <Input type="number" min={10} max={100} value={settings.agentResponseLength ?? 50} onChange={(e) => setSettings((s) => (s ? { ...s, agentResponseLength: Number(e.target.value) || 50 } : s))} />
          </div>
          <Button size="sm" onClick={() => saveSettings(settings)} disabled={saving}>{saving ? "Saving..." : "Save behaviour"}</Button>
        </div>
      </details>

      <details className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <summary className="list-none cursor-pointer px-4 py-3 flex items-center justify-between">
          <span className="flex items-center gap-2 font-medium"><MessageSquare className="h-4 w-4" /> SMS templates</span>
          <ChevronDown className="h-4 w-4 text-slate-500 transition-transform group-open:rotate-180" />
        </summary>
        <div className="px-4 pb-4 space-y-4">
          {rules.map((rule) => (
            <div key={rule.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{getRuleDisplayName(rule)}</p>
                  <p className="text-xs text-slate-500">{rule.triggerType}</p>
                </div>
                <Switch
                  checked={rule.enabled}
                  onCheckedChange={(checked) =>
                    setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, enabled: checked } : r)))
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
                    onValueChange={(v) => setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, hoursOffset: Number(v) } : r)))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {getRuleTimingOptions(rule).map((option) => (
                        <SelectItem key={`${rule.id}-${option.value}`} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label>Template</Label>
                <Textarea
                  value={rule.messageTemplate}
                  onChange={(e) => setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, messageTemplate: e.target.value } : r)))}
                  rows={3}
                />
                <p className="text-xs text-slate-500">Sign-off is fixed and auto-appended: Kind regards, Tracey (AI assistant for {businessName}).</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => saveRule(rule)} disabled={savingRuleId === rule.id}>
                {savingRuleId === rule.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                Save template
              </Button>
            </div>
          ))}
        </div>
      </details>

      <details className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <summary className="list-none cursor-pointer px-4 py-3 flex items-center justify-between">
          <span className="flex items-center gap-2 font-medium"><Volume2 className="h-4 w-4" /> Voice settings</span>
          <ChevronDown className="h-4 w-4 text-slate-500 transition-transform group-open:rotate-180" />
        </summary>
        <div className="px-4 pb-4 space-y-4">
          <div className="flex items-center justify-between">
            <Label>Enable voice agent</Label>
            <Switch checked={Boolean(settings.voiceEnabled)} onCheckedChange={(checked) => setSettings((s) => (s ? { ...s, voiceEnabled: checked } : s))} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Language</Label>
              <Select value={settings.voiceLanguage || "en-AU"} onValueChange={(v) => setSettings((s) => (s ? { ...s, voiceLanguage: v } : s))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en-AU">English (AU)</SelectItem>
                  <SelectItem value="en-US">English (US)</SelectItem>
                  <SelectItem value="en-GB">English (UK)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Voice</Label>
              <Select value={settings.voiceType || "female"} onValueChange={(v) => setSettings((s) => (s ? { ...s, voiceType: v as "female" | "male" | "neutral" } : s))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Speed</Label>
              <Select value={settings.voiceSpeed || "1.0"} onValueChange={(v) => setSettings((s) => (s ? { ...s, voiceSpeed: v as "0.8" | "1.0" | "1.2" } : s))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.8">Slow</SelectItem>
                  <SelectItem value="1.0">Normal</SelectItem>
                  <SelectItem value="1.2">Fast</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Business-hours greeting</Label>
            <Textarea value={settings.voiceGreeting || ""} onChange={(e) => setSettings((s) => (s ? { ...s, voiceGreeting: e.target.value } : s))} placeholder={`Hi, I'm Tracey, AI assistant for ${businessName}.`} />
            <p className="text-xs text-slate-500">All calls always start with: Hi, I'm Tracey, AI assistant for {businessName}.</p>
          </div>
          <div className="space-y-2">
            <Label>Opening message</Label>
            <Textarea
              value={settings.agentOpeningMessage || ""}
              onChange={(e) => setSettings((s) => (s ? { ...s, agentOpeningMessage: e.target.value } : s))}
              placeholder={`Hi, I'm Tracey, AI assistant for ${businessName}.`}
            />
          </div>
          <div className="space-y-2">
            <Label>Closing message</Label>
            <Textarea
              value={settings.agentClosingMessage || ""}
              onChange={(e) => setSettings((s) => (s ? { ...s, agentClosingMessage: e.target.value } : s))}
              placeholder={`Kind regards, Tracey (AI assistant for ${businessName})`}
            />
          </div>
          <div className="space-y-2">
            <Label>After-hours message</Label>
            <Textarea value={settings.voiceAfterHoursMessage || ""} onChange={(e) => setSettings((s) => (s ? { ...s, voiceAfterHoursMessage: e.target.value } : s))} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Transcribe voicemails</Label>
            <Switch checked={Boolean(settings.transcribeVoicemails)} onCheckedChange={(checked) => setSettings((s) => (s ? { ...s, transcribeVoicemails: checked } : s))} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Auto-respond to messages</Label>
            <Switch checked={Boolean(settings.autoRespondToMessages)} onCheckedChange={(checked) => setSettings((s) => (s ? { ...s, autoRespondToMessages: checked } : s))} />
          </div>
          <Button size="sm" onClick={() => saveSettings(settings)} disabled={saving}>{saving ? "Saving..." : "Save voice settings"}</Button>
        </div>
      </details>
    </div>
  )
}
