"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { ServiceAreasSection } from "@/components/settings/service-areas-section"
import { PricingForAgentSection } from "@/components/settings/pricing-for-agent-section"
import { AttachmentLibrarySection } from "@/components/settings/attachment-library-section"
import { WorkingHoursForm } from "@/components/settings/working-hours-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Plus, X, Bot } from "lucide-react"
import { toast } from "sonner"
import { getWorkspaceSettings, updateWorkspaceSettings } from "@/actions/settings-actions"

interface BusinessDocument {
  id: string
  name: string
  description: string
  fileUrl: string
  fileType: string | null
}

interface TrainingTabsProps {
  callOutFee: number
  agentMode: string
  aiPreferences: string
  workingHoursStart: string
  workingHoursEnd: string
  documents: BusinessDocument[]
}

const TABS = [
  { id: "services", label: "Services & Pricing" },
  { id: "rules", label: "Rules & Boundaries" },
  { id: "documents", label: "Documents" },
  { id: "preferences", label: "Preferences" },
] as const

type TabId = (typeof TABS)[number]["id"]

export function TrainingTabs({
  callOutFee,
  agentMode: initialAgentMode,
  aiPreferences,
  workingHoursStart,
  workingHoursEnd,
  documents,
}: TrainingTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("services")

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors",
              activeTab === tab.id
                ? "border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {activeTab === "services" && (
        <div className="space-y-8">
          <section>
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Service areas</h4>
            <p className="text-sm text-slate-500 mb-4">
              Tell Tracey where you work and your service radius so she can answer coverage questions accurately.
            </p>
            <ServiceAreasSection />
          </section>
          <Separator />
          <section>
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Services & pricing</h4>
            <p className="text-sm text-slate-500 mb-4">
              Add your services with price ranges so Tracey can give accurate quotes during calls.
            </p>
            <PricingForAgentSection initialCallOutFee={callOutFee} />
          </section>
        </div>
      )}

      {activeTab === "rules" && (
        <RulesTab initialAiPreferences={aiPreferences} />
      )}

      {activeTab === "documents" && (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">AI Attachment Library</h4>
            <p className="text-sm text-slate-500 mb-4">
              Upload PDF guides, price lists, or insurance forms. Tracey will automatically email these to callers when requested.
            </p>
          </div>
          <AttachmentLibrarySection documents={documents} />
        </div>
      )}

      {activeTab === "preferences" && (
        <PreferencesTab
          initialAgentMode={initialAgentMode}
          workingHoursStart={workingHoursStart}
          workingHoursEnd={workingHoursEnd}
        />
      )}
    </div>
  )
}

// ── Rules Tab ─────────────────────────────────────────────────────────────────

function RulesTab({ initialAiPreferences }: { initialAiPreferences: string }) {
  const MAX_RULES = 20
  const [saving, setSaving] = useState(false)
  const [rules, setRules] = useState<string[]>(() =>
    (initialAiPreferences || "")
      .split("\n")
      .map((line) => line.replace(/^\s*-\s*/, "").trim())
      .filter(Boolean)
  )
  const [draft, setDraft] = useState("")

  const addRule = () => {
    const next = draft.trim()
    if (!next) return
    if (rules.length >= MAX_RULES) {
      toast.error(`Maximum ${MAX_RULES} rules. Remove one to add another.`)
      return
    }
    setRules((prev) => [...prev, next])
    setDraft("")
  }

  const removeRule = (i: number) => setRules((prev) => prev.filter((_, idx) => idx !== i))

  const save = async () => {
    setSaving(true)
    try {
      const currentSettings = await getWorkspaceSettings()
      if (!currentSettings) {
        toast.error("Failed to load current settings")
        return
      }
      const aiPreferences = rules.map((r) => `- ${r}`).join("\n")
      await updateWorkspaceSettings({
        agentMode: currentSettings.agentMode || "DRAFT",
        workingHoursStart: currentSettings.workingHoursStart || "08:00",
        workingHoursEnd: currentSettings.workingHoursEnd || "17:00",
        agendaNotifyTime: currentSettings.agendaNotifyTime || "07:30",
        wrapupNotifyTime: currentSettings.wrapupNotifyTime || "17:30",
        workspaceTimezone: currentSettings.workspaceTimezone || "Australia/Sydney",
        aiPreferences,
      })
      toast.success("Rules saved")
    } catch {
      toast.error("Failed to save rules")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Behavioural rules</CardTitle>
          <CardDescription>
            Instructions Tracey follows on every call — boundaries, preferences, and how to handle specific situations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="e.g. Never quote over $500 without owner approval."
              disabled={rules.length >= MAX_RULES}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addRule()
                }
              }}
            />
            <Button type="button" variant="outline" onClick={addRule} disabled={rules.length >= MAX_RULES}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
          <div className="text-xs text-muted-foreground text-right">{rules.length}/{MAX_RULES}</div>
          <div className="space-y-2">
            {rules.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center border-2 border-dashed rounded-lg">
                No rules yet. Add a rule above to guide Tracey&apos;s behaviour.
              </p>
            ) : (
              rules.map((rule, i) => (
                <div key={i} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <span className="text-sm flex-1 mr-2">{rule}</span>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeRule(i)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save rules"}
        </Button>
      </div>
    </div>
  )
}

// ── Preferences Tab ───────────────────────────────────────────────────────────

function PreferencesTab({
  initialAgentMode,
  workingHoursStart,
  workingHoursEnd,
}: {
  initialAgentMode: string
  workingHoursStart: string
  workingHoursEnd: string
}) {
  const [agentMode, setAgentMode] = useState(initialAgentMode)
  const [saving, setSaving] = useState(false)

  const saveMode = async () => {
    setSaving(true)
    try {
      const currentSettings = await getWorkspaceSettings()
      if (!currentSettings) {
        toast.error("Failed to load current settings")
        return
      }
      await updateWorkspaceSettings({
        agentMode,
        workingHoursStart: currentSettings.workingHoursStart || "08:00",
        workingHoursEnd: currentSettings.workingHoursEnd || "17:00",
        agendaNotifyTime: currentSettings.agendaNotifyTime || "07:30",
        wrapupNotifyTime: currentSettings.wrapupNotifyTime || "17:30",
        workspaceTimezone: currentSettings.workspaceTimezone || "Australia/Sydney",
        aiPreferences: currentSettings.aiPreferences || undefined,
      })
      toast.success("Autonomy mode saved")
    } catch {
      toast.error("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-indigo-500" />
            <CardTitle className="text-base">Autonomy mode</CardTitle>
          </div>
          <CardDescription>How much Tracey can do without your approval.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={agentMode}
            onValueChange={setAgentMode}
            className="flex flex-col space-y-3"
          >
            <Label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer">
              <RadioGroupItem value="EXECUTION" id="mode-exec" className="mt-0.5" />
              <div>
                <div className="font-medium">Execution</div>
                <p className="text-xs text-muted-foreground">Tracey books jobs, sends quotes, and handles follow-up automatically.</p>
              </div>
            </Label>
            <Label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer">
              <RadioGroupItem value="DRAFT" id="mode-draft" className="mt-0.5" />
              <div>
                <div className="font-medium">Review &amp; approve</div>
                <p className="text-xs text-muted-foreground">Tracey captures everything and creates drafts. You confirm before anything is sent or booked.</p>
              </div>
            </Label>
            <Label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer">
              <RadioGroupItem value="INFO_ONLY" id="mode-info" className="mt-0.5" />
              <div>
                <div className="font-medium">Info only</div>
                <p className="text-xs text-muted-foreground">Tracey answers questions and takes messages only. No bookings or outbound actions.</p>
              </div>
            </Label>
          </RadioGroup>
          <div className="flex justify-end pt-2">
            <Button onClick={saveMode} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <section>
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Working hours</h4>
        <p className="text-sm text-slate-500 mb-4">
          Tracey uses these to know when to book jobs and when to tell callers the team will be in touch the next business day.
        </p>
        <WorkingHoursForm
          initialData={{
            workingHoursStart,
            workingHoursEnd,
            agendaNotifyTime: "07:30",
            wrapupNotifyTime: "17:30",
          }}
        />
      </section>
    </div>
  )
}
