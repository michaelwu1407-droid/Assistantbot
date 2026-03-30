"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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

const servicePricingTableMinWidthClass = "min-w-[1020px]"
const servicePricingGridClass =
  "grid items-start gap-3 [grid-template-columns:minmax(240px,1.15fr)_110px_110px_minmax(420px,1.7fr)_120px]"

const compactInputClass = "h-12 min-w-0 rounded-[16px] px-3 text-sm"
const compactTextareaClass = "h-[56px] min-h-[56px] resize-none rounded-[16px] px-3 py-2 text-sm"

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
  const [isAddingService, setIsAddingService] = useState(false)
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
        agentMode: currentSettings.agentMode || "EXECUTION",
        workingHoursStart: currentSettings.workingHoursStart || "09:00",
        workingHoursEnd: currentSettings.workingHoursEnd || "17:00",
        agendaNotifyTime: currentSettings.agendaNotifyTime || "09:00",
        wrapupNotifyTime: currentSettings.wrapupNotifyTime || "17:00",
        callOutFee: parseFloat(callOutFee) || 0,
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
    if (!name) {
      toast.error("Add a service name first")
      return
    }

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
    setIsAddingService(false)
    toast.success("Service pricing row added")
  }

  const saveService = async (service: KnowledgeRule, draft: ServiceDraft) => {
    if (!draft.name.trim()) {
      toast.error("Service name is required")
      return
    }

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
          Auto-populates from onboarding website/doc imports. Add or refine rows anytime so Tracey can quote consistently.
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
            Add your common services and fee range. Use comments to explain how Tracey should answer price questions.
          </p>
          <div className="rounded-[18px] border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <div className={servicePricingTableMinWidthClass}>
                <div className={`bg-slate-50 px-3 py-2 dark:bg-slate-900 ${servicePricingGridClass}`}>
                  <span className="app-micro-label">Service</span>
                  <span className="app-micro-label">Min fee</span>
                  <span className="app-micro-label">Max fee</span>
                  <span className="app-micro-label">Comment</span>
                  <span />
                </div>

                <div className="divide-y divide-slate-200 dark:divide-slate-700">
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

                  {isAddingService ? (
                    <div className="bg-slate-50/60 p-3 dark:bg-slate-900/40">
                      <div className={servicePricingGridClass}>
                        <FieldShell label="Service">
                          <Input
                            value={newService.name}
                            onChange={(event) => setNewService((prev) => ({ ...prev, name: event.target.value }))}
                            placeholder="e.g. Drain unblocking"
                            className={compactInputClass}
                          />
                        </FieldShell>
                        <FieldShell label="Min fee">
                          <Input
                            value={newService.minFee}
                            onChange={(event) => setNewService((prev) => ({ ...prev, minFee: event.target.value }))}
                            placeholder="150"
                            type="number"
                            className={compactInputClass}
                          />
                        </FieldShell>
                        <FieldShell label="Max fee">
                          <Input
                            value={newService.maxFee}
                            onChange={(event) => setNewService((prev) => ({ ...prev, maxFee: event.target.value }))}
                            placeholder="320"
                            type="number"
                            className={compactInputClass}
                          />
                        </FieldShell>
                        <FieldShell label="Comment">
                          <Textarea
                            value={newService.comment}
                            onChange={(event) => setNewService((prev) => ({ ...prev, comment: event.target.value }))}
                            placeholder="Includes standard parts only"
                            rows={2}
                            className={compactTextareaClass}
                          />
                        </FieldShell>
                        <div className="flex items-center gap-2 justify-end self-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={addService}
                            className="h-10 justify-center rounded-full px-4"
                            disabled={!newService.name.trim()}
                          >
                            <Plus className="mr-1 h-4 w-4" />
                            Add
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-10 rounded-full px-3"
                            onClick={() => {
                              setIsAddingService(false)
                              setNewService({ name: "", minFee: "", maxFee: "", comment: "" })
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {!loading && services.length === 0 && !isAddingService ? (
                    <div className="px-4 py-6 text-sm text-slate-500">
                      No services added yet. Add your first service so Tracey can quote consistently.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-start">
            {!isAddingService ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddingService(true)}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add service
              </Button>
            ) : (
              <p className="text-xs text-slate-500">
                Add the service details above, then press `Add`.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2 border-t border-slate-200 dark:border-slate-700 pt-4">
          <Label>Refusal rules</Label>
          <p className="text-xs text-slate-500">
            Don&apos;t let Tracey quote these prices and focus on booking times only for these request types.
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
    <div className="p-3">
      <div className={servicePricingGridClass}>
        <FieldShell label="Service">
        <Input
          value={draft.name}
          onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
          className={compactInputClass}
        />
        </FieldShell>
        <FieldShell label="Min fee">
        <Input
          type="number"
          value={draft.minFee}
          onChange={(event) => setDraft((prev) => ({ ...prev, minFee: event.target.value }))}
          className={compactInputClass}
        />
        </FieldShell>
        <FieldShell label="Max fee">
        <Input
          type="number"
          value={draft.maxFee}
          onChange={(event) => setDraft((prev) => ({ ...prev, maxFee: event.target.value }))}
          className={compactInputClass}
        />
        </FieldShell>
        <FieldShell label="Comment">
        <Textarea
          value={draft.comment}
          onChange={(event) => setDraft((prev) => ({ ...prev, comment: event.target.value }))}
          rows={2}
          className={compactTextareaClass}
        />
        </FieldShell>
        <div className="flex items-center gap-2 xl:justify-end xl:self-center">
          <Button
            variant="outline"
            size="sm"
            className="h-10 rounded-full px-4"
            disabled={saving}
            onClick={async () => {
              setSaving(true)
              await onSave(service, draft)
              setSaving(false)
            }}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(service.id)} className="h-10 w-10 rounded-full text-red-500">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function FieldShell({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="sr-only">{label}</Label>
      {children}
    </div>
  )
}
