"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { Bot, Brain, Plus, X, MessageSquare, ExternalLink, BellDot } from "lucide-react"
import { getWorkspaceSettings, updateWorkspaceSettings } from "@/actions/settings-actions"
import { updateCurrentWorkspacePipelineSettings } from "@/actions/workspace-actions"

export default function AgentSettingsPage() {
  const MAX_BEHAVIOURAL_RULES = 20
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingBoardAttention, setSavingBoardAttention] = useState(false)
  const [settings, setSettings] = useState({
    agentMode: "DRAFT",
    workingHoursStart: "08:00",
    workingHoursEnd: "17:00",
    agendaNotifyTime: "07:30",
    wrapupNotifyTime: "17:30",
    aiPreferences: "",
    autoUpdateGlossary: true,
  })
  const [boardAttention, setBoardAttention] = useState({
    followUpDays: "7",
    urgentDays: "14",
  })
  const [learningRules, setLearningRules] = useState<string[]>([])
  const [ruleDraft, setRuleDraft] = useState("")

  const whatsappNumber = process.env.NEXT_PUBLIC_TWILIO_WHATSAPP_NUMBER || "+1234567890" // Fallback display
  const waLink = `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=Hi%20Earlymark`

  useEffect(() => {
    getWorkspaceSettings()
      .then((data) => {
        if (!data) return
        const pipelineSettings = data as typeof data & {
          followUpDays?: number
          urgentDays?: number
        }
        setSettings({
          agentMode: data.agentMode || "DRAFT",
          workingHoursStart: data.workingHoursStart || "08:00",
          workingHoursEnd: data.workingHoursEnd || "17:00",
          agendaNotifyTime: data.agendaNotifyTime || "07:30",
          wrapupNotifyTime: data.wrapupNotifyTime || "17:30",
          aiPreferences: data.aiPreferences || "",
          autoUpdateGlossary: data.autoUpdateGlossary ?? true,
        })
        setBoardAttention({
          followUpDays: String(pipelineSettings.followUpDays ?? 7),
          urgentDays: String(pipelineSettings.urgentDays ?? 14),
        })
        const parsedRules = (data.aiPreferences || "")
          .split("\n")
          .map((line) => line.replace(/^\s*-\s*/, "").trim())
          .filter(Boolean)
        setLearningRules(parsedRules)
      })
      .catch(() => toast.error("Failed to load AI Assistant settings"))
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const nextPreferences = learningRules.map((rule) => `- ${rule}`).join("\n")
      await updateWorkspaceSettings({ ...settings, aiPreferences: nextPreferences })
      toast.success("AI Assistant settings saved")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save AI Assistant settings")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading settings...</div>

  const addRule = () => {
    const next = ruleDraft.trim()
    if (!next) return
    if (learningRules.length >= MAX_BEHAVIOURAL_RULES) {
      toast.error(`You can save up to ${MAX_BEHAVIOURAL_RULES} rules. Remove one to add another.`)
      return
    }
    setLearningRules((prev) => [...prev, next])
    setRuleDraft("")
  }

  const removeRule = (index: number) => {
    setLearningRules((prev) => prev.filter((_, i) => i !== index))
  }

  const updateRule = (index: number, value: string) => {
    setLearningRules((prev) => prev.map((rule, i) => (i === index ? value : rule)))
  }

  const saveBoardAttention = async () => {
    const followUpDays = Number.parseInt(boardAttention.followUpDays, 10)
    const urgentDays = Number.parseInt(boardAttention.urgentDays, 10)

    if (!Number.isFinite(followUpDays) || followUpDays < 1) {
      toast.error("Follow up days must be 1 or more")
      return
    }

    if (!Number.isFinite(urgentDays) || urgentDays < followUpDays) {
      toast.error("Urgent days must be the same or more than Follow up days")
      return
    }

    setSavingBoardAttention(true)
    try {
      await updateCurrentWorkspacePipelineSettings({
        followUpDays,
        urgentDays,
      })
      toast.success("Board attention settings saved")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save board attention settings")
    } finally {
      setSavingBoardAttention(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="app-section-title">AI Assistant</h3>
        <p className="app-body-secondary">
          Set how much Tracey can do on her own and the rules she should follow.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-indigo-500" />
            <CardTitle>How much Tracey can do</CardTitle>
          </div>
          <CardDescription>Choose whether Tracey acts on her own or waits for approval.</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={settings.agentMode}
            onValueChange={(v) => setSettings((s) => ({ ...s, agentMode: v }))}
            className="flex flex-col space-y-3"
          >
            <Label className="flex items-center gap-2 rounded-[18px] border p-3 cursor-pointer">
              <RadioGroupItem value="EXECUTION" id="agent-mode-execute" />
              <span>Execution</span>
            </Label>
            <Label className="flex items-center gap-2 rounded-[18px] border p-3 cursor-pointer">
              <RadioGroupItem value="DRAFT" id="agent-mode-organize" />
              <span>Review &amp; approve</span>
            </Label>
            <Label className="flex items-center gap-2 rounded-[18px] border p-3 cursor-pointer">
              <RadioGroupItem value="INFO_ONLY" id="agent-mode-filter" />
              <span>Info only</span>
            </Label>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            <CardTitle>Rules &amp; preferences</CardTitle>
          </div>
          <CardDescription>Tell Tracey what to learn from confirmed jobs and what rules to always follow.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Learn from confirmed jobs</Label>
            <Switch checked={settings.autoUpdateGlossary} onCheckedChange={(v) => setSettings((s) => ({ ...s, autoUpdateGlossary: v }))} />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label>Rules to follow</Label>
              <span className="text-xs text-muted-foreground">{learningRules.length}/{MAX_BEHAVIOURAL_RULES} used</span>
            </div>
            <div className="flex gap-2">
              <Input
                value={ruleDraft}
                onChange={(e) => setRuleDraft(e.target.value)}
                placeholder="e.g. Always leave a 30-minute buffer between jobs."
                disabled={learningRules.length >= MAX_BEHAVIOURAL_RULES}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addRule()
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addRule} disabled={learningRules.length >= MAX_BEHAVIOURAL_RULES}>
                <Plus className="h-4 w-4 mr-1" />
                Add rule
              </Button>
            </div>
            <div className="space-y-2">
              {learningRules.length === 0 ? (
                <p className="text-sm text-muted-foreground">No rules added yet.</p>
              ) : (
                learningRules.map((rule, index) => (
                  <div key={`${rule}-${index}`} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <Input
                      value={rule}
                      onChange={(e) => updateRule(index, e.target.value)}
                      onBlur={() => {
                        setLearningRules((prev) =>
                          prev
                            .map((entry) => entry.trim())
                            .filter((entry) => entry.length > 0)
                        )
                      }}
                      className="h-8 border-none px-0 text-sm shadow-none focus-visible:ring-0"
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeRule(index)} aria-label="Remove rule">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BellDot className="h-5 w-5 text-amber-500" />
            <CardTitle>Board attention</CardTitle>
          </div>
          <CardDescription>Choose when cards should start showing as Follow up or Urgent on the board.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="follow-up-days">Days until Follow up</Label>
              <Input
                id="follow-up-days"
                type="number"
                min={1}
                max={365}
                value={boardAttention.followUpDays}
                onChange={(event) =>
                  setBoardAttention((current) => ({
                    ...current,
                    followUpDays: event.target.value,
                  }))
                }
              />
              <p className="app-body-secondary">After this many days without activity, the card shows as Follow up.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="urgent-days">Days until Urgent</Label>
              <Input
                id="urgent-days"
                type="number"
                min={1}
                max={365}
                value={boardAttention.urgentDays}
                onChange={(event) =>
                  setBoardAttention((current) => ({
                    ...current,
                    urgentDays: event.target.value,
                  }))
                }
              />
              <p className="app-body-secondary">After this many days without activity, the card shows as Urgent.</p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="button" onClick={saveBoardAttention} disabled={savingBoardAttention}>
              {savingBoardAttention ? "Saving..." : "Save board attention"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-500" />
            <CardTitle>WhatsApp Assistant</CardTitle>
          </div>
          <CardDescription>Work in progress.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100">
            This feature is still being built, so it is not ready for day-to-day use yet.
          </div>
          <div className="relative overflow-hidden rounded-[18px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
            <div className="pointer-events-none absolute inset-0 bg-white/58 backdrop-blur-[1px] dark:bg-slate-950/48" />
            <div className="pointer-events-none absolute right-4 top-4 rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-900 dark:border-amber-800 dark:bg-amber-950/70 dark:text-amber-100">
              WIP
            </div>
            <div className="relative flex items-center justify-between rounded-[16px] border border-slate-200 p-4 dark:border-slate-700">
            <div>
              <p className="font-medium text-sm">Assistant Number</p>
              <p className="text-lg font-mono text-slate-700 dark:text-slate-300 select-all">
                {whatsappNumber}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-sm font-medium text-amber-600 dark:text-amber-400">
              Beta
            </div>
          </div>
          <div className="relative flex justify-end pt-2">
            <Button asChild variant="default" className="bg-green-600 hover:bg-green-700 text-white gap-2 opacity-70">
              <a href={waLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" /> Connect via WhatsApp
              </a>
            </Button>
          </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save AI Assistant settings"}</Button>
      </div>
    </div>
  )
}
