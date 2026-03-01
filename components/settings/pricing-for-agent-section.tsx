"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { DollarSign, Plus, Trash2 } from "lucide-react"
import { updateWorkspaceSettings, getWorkspaceSettings } from "@/actions/settings-actions"
import {
  addKnowledgeRule,
  deleteKnowledgeRule,
  getKnowledgeRules,
  updateKnowledgeRule,
  type KnowledgeRule,
} from "@/actions/knowledge-actions"
import { toast } from "sonner"

interface PricingForAgentSectionProps {
  initialCallOutFee: number
}

type ServiceDraft = {
  name: string
  minFee: string
  maxFee: string
  comment: string
}

function toServiceDraft(rule: KnowledgeRule): ServiceDraft {
  const metadata = (rule.metadata || {}) as Record<string, unknown>
  return {
    name: rule.ruleContent,
    minFee: metadata.minFee ? String(metadata.minFee) : "",
    maxFee: metadata.maxFee ? String(metadata.maxFee) : "",
    comment: typeof metadata.comment === "string" ? metadata.comment : "",
  }
}

export function PricingForAgentSection({ initialCallOutFee }: PricingForAgentSectionProps) {
  const [callOutFee, setCallOutFee] = useState(initialCallOutFee > 0 ? String(initialCallOutFee) : "")
  const [services, setServices] = useState<KnowledgeRule[]>([])
  const [refusalRules, setRefusalRules] = useState<KnowledgeRule[]>([])
  const [newService, setNewService] = useState<ServiceDraft>({ name: "", minFee: "", maxFee: "", comment: "" })
  const [newRefusalRule, setNewRefusalRule] = useState("")
  const [savingCallOutFee, setSavingCallOutFee] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getKnowledgeRules("SERVICE"), getKnowledgeRules("NEGATIVE_SCOPE")])
      .then(([serviceRules, negativeScopeRules]) => {
        setServices(serviceRules)
        setRefusalRules(negativeScopeRules)
      })
      .catch(() => toast.error("Failed to load pricing information"))
      .finally(() => setLoading(false))
  }, [])

  const saveCallOutFee = async () => {
    setSavingCallOutFee(true)
    try {
      const currentSettings = await getWorkspaceSettings()
      if (!currentSettings) {
        toast.error("Failed to get current settings")
        return
      }

      await updateWorkspaceSettings({
        agentMode: currentSettings.agentMode || "EXECUTE",
        workingHoursStart: currentSettings.workingHoursStart || "09:00",
        workingHoursEnd: currentSettings.workingHoursEnd || "17:00",
        agendaNotifyTime: currentSettings.agendaNotifyTime || "09:00",
        wrapupNotifyTime: currentSettings.wrapupNotifyTime || "17:00",
        aiPreferences: currentSettings.aiPreferences || undefined,
        autoUpdateGlossary: currentSettings.autoUpdateGlossary,
        callOutFee: parseFloat(callOutFee) || 0,
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

      toast.success("Call-out fee saved")
    } catch {
      toast.error("Failed to save call-out fee")
    } finally {
      setSavingCallOutFee(false)
    }
  }

  const addService = async () => {
    const name = newService.name.trim()
    if (!name) return

    const metadata: Record<string, unknown> = {}
    if (newService.minFee.trim()) metadata.minFee = Number(newService.minFee)
    if (newService.maxFee.trim()) metadata.maxFee = Number(newService.maxFee)
    if (newService.comment.trim()) metadata.comment = newService.comment.trim()

    const result = await addKnowledgeRule("SERVICE", name, metadata)
    if (!result.success) {
      toast.error(result.error || "Failed to add service")
      return
    }

    const updated = await getKnowledgeRules("SERVICE")
    setServices(updated)
    setNewService({ name: "", minFee: "", maxFee: "", comment: "" })
    toast.success("Service pricing row added")
  }

  const saveService = async (service: KnowledgeRule, draft: ServiceDraft) => {
    const metadata: Record<string, unknown> = {}
    if (draft.minFee.trim()) metadata.minFee = Number(draft.minFee)
    if (draft.maxFee.trim()) metadata.maxFee = Number(draft.maxFee)
    if (draft.comment.trim()) metadata.comment = draft.comment.trim()

    const result = await updateKnowledgeRule(service.id, draft.name.trim(), metadata)
    if (!result.success) {
      toast.error(result.error || "Failed to update service")
      return
    }
    const updated = await getKnowledgeRules("SERVICE")
    setServices(updated)
    toast.success("Service row saved")
  }

  const removeService = async (id: string) => {
    const result = await deleteKnowledgeRule(id)
    if (!result.success) {
      toast.error(result.error || "Failed to remove service")
      return
    }
    setServices((prev) => prev.filter((rule) => rule.id !== id))
    toast.success("Service row removed")
  }

  const addRefusalRule = async () => {
    const text = newRefusalRule.trim()
    if (!text) return
    const result = await addKnowledgeRule("NEGATIVE_SCOPE", text)
    if (!result.success) {
      toast.error(result.error || "Failed to add refusal rule")
      return
    }
    const updated = await getKnowledgeRules("NEGATIVE_SCOPE")
    setRefusalRules(updated)
    setNewRefusalRule("")
    toast.success("Refusal rule added")
  }

  const removeRefusalRule = async (id: string) => {
    const result = await deleteKnowledgeRule(id)
    if (!result.success) {
      toast.error(result.error || "Failed to remove refusal rule")
      return
    }
    setRefusalRules((prev) => prev.filter((rule) => rule.id !== id))
    toast.success("Refusal rule removed")
  }

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Pricing and service response rules
        </CardTitle>
        <CardDescription>
          Auto-populates from onboarding website/doc imports. Add or refine rows anytime so Travis can quote consistently.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>Call-out fee</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              step={5}
              placeholder="Leave blank if not used"
              value={callOutFee}
              onChange={(event) => setCallOutFee(event.target.value)}
              className="max-w-[220px]"
            />
            <Button onClick={saveCallOutFee} disabled={savingCallOutFee}>
              {savingCallOutFee ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Service pricing table</Label>
          <p className="text-xs text-slate-500">
            Add your common services and fee range. Use comments to explain how Travis should answer price questions.
          </p>
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Service</th>
                  <th className="px-3 py-2 text-left font-medium">Min fee</th>
                  <th className="px-3 py-2 text-left font-medium">Max fee</th>
                  <th className="px-3 py-2 text-left font-medium">Comment</th>
                  <th className="px-3 py-2 w-36" />
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="px-3 py-2">
                    <Input
                      value={newService.name}
                      onChange={(event) => setNewService((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder="e.g. Drain unblocking"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={newService.minFee}
                      onChange={(event) => setNewService((prev) => ({ ...prev, minFee: event.target.value }))}
                      placeholder="150"
                      type="number"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={newService.maxFee}
                      onChange={(event) => setNewService((prev) => ({ ...prev, maxFee: event.target.value }))}
                      placeholder="320"
                      type="number"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={newService.comment}
                      onChange={(event) => setNewService((prev) => ({ ...prev, comment: event.target.value }))}
                      placeholder="Includes standard parts only"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Button variant="outline" size="sm" onClick={addService}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add row
                    </Button>
                  </td>
                </tr>

                {services.map((service) => {
                  const row = toServiceDraft(service)
                  return (
                    <ServiceRow
                      key={service.id}
                      service={service}
                      initialDraft={row}
                      onSave={saveService}
                      onDelete={removeService}
                    />
                  )
                })}
              </tbody>
            </table>
          </div>
          {!loading && services.length === 0 && (
            <p className="text-sm text-slate-500">
              No services added yet. If onboarding scraped your website/docs, imported items will appear here.
            </p>
          )}
        </div>

        <div className="space-y-2 border-t border-slate-200 dark:border-slate-700 pt-4">
          <Label>Refusal rules</Label>
          <p className="text-xs text-slate-500">
            Don&apos;t let Travis quote these prices and focus on booking times only for these request types.
          </p>
          <div className="flex gap-2">
            <Input
              value={newRefusalRule}
              onChange={(event) => setNewRefusalRule(event.target.value)}
              placeholder='e.g. "No roof leak emergency jobs"'
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  addRefusalRule()
                }
              }}
            />
            <Button variant="outline" onClick={addRefusalRule}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
          <div className="space-y-2">
            {refusalRules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-3 py-2">
                <span className="text-sm text-red-700">{rule.ruleContent}</span>
                <Button variant="ghost" size="icon" onClick={() => removeRefusalRule(rule.id)} className="h-7 w-7 text-red-500">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            {!loading && refusalRules.length === 0 && (
              <p className="text-sm text-slate-500">No refusal rules configured.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ServiceRow({
  service,
  initialDraft,
  onSave,
  onDelete,
}: {
  service: KnowledgeRule
  initialDraft: ServiceDraft
  onSave: (service: KnowledgeRule, draft: ServiceDraft) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [draft, setDraft] = useState(initialDraft)
  const [saving, setSaving] = useState(false)

  return (
    <tr className="border-t">
      <td className="px-3 py-2">
        <Input value={draft.name} onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))} />
      </td>
      <td className="px-3 py-2">
        <Input
          type="number"
          value={draft.minFee}
          onChange={(event) => setDraft((prev) => ({ ...prev, minFee: event.target.value }))}
        />
      </td>
      <td className="px-3 py-2">
        <Input
          type="number"
          value={draft.maxFee}
          onChange={(event) => setDraft((prev) => ({ ...prev, maxFee: event.target.value }))}
        />
      </td>
      <td className="px-3 py-2">
        <Input value={draft.comment} onChange={(event) => setDraft((prev) => ({ ...prev, comment: event.target.value }))} />
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={async () => {
              setSaving(true)
              await onSave(service, draft)
              setSaving(false)
            }}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(service.id)} className="h-8 w-8 text-red-500">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  )
}
