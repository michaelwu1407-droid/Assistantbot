"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { Bot, Brain, Plus, X, MessageSquare, ExternalLink, CheckCircle2 } from "lucide-react"
import { getWorkspaceSettings, updateWorkspaceSettings } from "@/actions/settings-actions"

export default function AgentSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    agentMode: "ORGANIZE",
    workingHoursStart: "08:00",
    workingHoursEnd: "17:00",
    agendaNotifyTime: "07:30",
    wrapupNotifyTime: "17:30",
    aiPreferences: "",
    autoUpdateGlossary: true,
  })
  const [learningRules, setLearningRules] = useState<string[]>([])
  const [ruleDraft, setRuleDraft] = useState("")

  const whatsappNumber = process.env.NEXT_PUBLIC_TWILIO_WHATSAPP_NUMBER || "+1234567890" // Fallback display
  const waLink = `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=Hi%20Earlymark`

  useEffect(() => {
    getWorkspaceSettings()
      .then((data) => {
        if (!data) return
        setSettings({
          agentMode: data.agentMode || "ORGANIZE",
          workingHoursStart: data.workingHoursStart || "08:00",
          workingHoursEnd: data.workingHoursEnd || "17:00",
          agendaNotifyTime: data.agendaNotifyTime || "07:30",
          wrapupNotifyTime: data.wrapupNotifyTime || "17:30",
          aiPreferences: data.aiPreferences || "",
          autoUpdateGlossary: data.autoUpdateGlossary ?? true,
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
    } catch {
      toast.error("Failed to save AI Assistant settings")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading settings...</div>

  const addRule = () => {
    const next = ruleDraft.trim()
    if (!next) return
    setLearningRules((prev) => [...prev, next])
    setRuleDraft("")
  }

  const removeRule = (index: number) => {
    setLearningRules((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">AI Assistant</h3>
        <p className="text-sm text-muted-foreground">
          Configure how Tracey thinks and behaves as an assistant. Call and text handling is in Automated calling and texting.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-indigo-500" />
            <CardTitle>Autonomy mode</CardTitle>
          </div>
          <CardDescription>How much Tracey can do automatically.</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={settings.agentMode}
            onValueChange={(v) => setSettings((s) => ({ ...s, agentMode: v }))}
            className="flex flex-col space-y-3"
          >
            <Label className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer">
              <RadioGroupItem value="EXECUTE" id="agent-mode-execute" />
              <span>Execute (full autonomy)</span>
            </Label>
            <Label className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer">
              <RadioGroupItem value="ORGANIZE" id="agent-mode-organize" />
              <span>Organize (propose, you confirm)</span>
            </Label>
            <Label className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer">
              <RadioGroupItem value="FILTER" id="agent-mode-filter" />
              <span>Filter (reception only)</span>
            </Label>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            <CardTitle>Learning</CardTitle>
          </div>
          <CardDescription>Assistant memory and pricing-learning behavior.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Auto-create pricing suggestions from confirmed jobs</Label>
            <Switch checked={settings.autoUpdateGlossary} onCheckedChange={(v) => setSettings((s) => ({ ...s, autoUpdateGlossary: v }))} />
          </div>
          <div className="space-y-3">
            <Label>Behavioral rules and preferences</Label>
            <div className="flex gap-2">
              <Input
                value={ruleDraft}
                onChange={(e) => setRuleDraft(e.target.value)}
                placeholder="e.g. Always leave a 30-minute buffer between jobs."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addRule()
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addRule}>
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
                    <span className="text-sm">{rule}</span>
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
            <MessageSquare className="h-5 w-5 text-green-500" />
            <CardTitle>WhatsApp Assistant</CardTitle>
          </div>
          <CardDescription>Chat to Tracey via WhatsApp to manage your business on the road.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4 bg-slate-50 dark:bg-slate-900">
            <div>
              <p className="font-medium text-sm">Assistant Number</p>
              <p className="text-lg font-mono text-slate-700 dark:text-slate-300 select-all">
                {whatsappNumber}
              </p>
            </div>
            {/* Status could be dynamic based on whether the user has a phone set, but assuming active if reached here for now */}
            <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Active
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button asChild variant="default" className="bg-green-600 hover:bg-green-700 text-white gap-2">
              <a href={waLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" /> Connect via WhatsApp
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save AI Assistant settings"}</Button>
      </div>
    </div>
  )
}
