"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateDeal, updateDealMetadata, updateDealAssignedTo, setDealRecurrence, type RecurrenceRule } from "@/actions/deal-actions"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"

interface TeamMemberOption {
  id: string
  name: string | null
  email: string
  role: string
}

interface DealEditFormProps {
  dealId: string
  initialTitle: string
  initialValue: number
  initialStage: string
  initialNotes: string
  initialAddress: string
  initialScheduledAt: string
  initialAssignedToId: string
  teamMembers: TeamMemberOption[]
  canManageAssignment?: boolean
  stageOptions: { value: string; label: string }[]
  initialRecurrence?: RecurrenceRule | null
}

export function DealEditForm({
  dealId,
  initialTitle,
  initialValue,
  initialStage,
  initialNotes,
  initialAddress,
  initialScheduledAt,
  initialAssignedToId,
  teamMembers,
  canManageAssignment = true,
  stageOptions,
  initialRecurrence,
}: DealEditFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState(initialTitle)
  const [value, setValue] = useState(String(initialValue || ""))
  const [stage, setStage] = useState(initialStage)
  const [notes, setNotes] = useState(initialNotes)
  const [address, setAddress] = useState(initialAddress)
  const [scheduledAt, setScheduledAt] = useState(initialScheduledAt)
  const [assignedToId, setAssignedToId] = useState(initialAssignedToId)
  const [saving, setSaving] = useState(false)
  const [isRecurring, setIsRecurring] = useState(!!initialRecurrence)
  const [recurrenceUnit, setRecurrenceUnit] = useState<RecurrenceRule["unit"]>(initialRecurrence?.unit ?? "week")
  const [recurrenceInterval, setRecurrenceInterval] = useState(String(initialRecurrence?.interval ?? 1))
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(initialRecurrence?.endDate ?? "")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error("Title is required")
      return
    }
    if (stage === "scheduled" && !assignedToId) {
      toast.error("Assign a team member when the job is in Scheduled stage.")
      return
    }
    setSaving(true)
    try {
      const numValue = value === "" ? 0 : Number(value)
      if (Number.isNaN(numValue) || numValue < 0) {
        toast.error("Value must be a positive number")
        setSaving(false)
        return
      }
      const res = await updateDeal(dealId, {
        title: title.trim(),
        value: numValue,
        stage,
        address: address.trim() || null,
        scheduledAt: scheduledAt.trim() ? scheduledAt : null,
      })
      if (!res.success) {
        toast.error(res.error ?? "Failed to update")
        setSaving(false)
        return
      }
      if (canManageAssignment && assignedToId !== initialAssignedToId) {
        await updateDealAssignedTo(dealId, assignedToId || null)
      }
      if (notes !== initialNotes) {
        await updateDealMetadata(dealId, { notes })
      }
      // Save recurrence rule
      const interval = parseInt(recurrenceInterval, 10)
      const recurrenceRule: RecurrenceRule | null = isRecurring
        ? { unit: recurrenceUnit, interval: isNaN(interval) || interval < 1 ? 1 : interval, endDate: recurrenceEndDate || undefined }
        : null
      await setDealRecurrence(dealId, recurrenceRule)
      toast.success("Deal updated")
      router.push(`/crm/deals/${dealId}`)
      router.refresh()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4 border border-slate-200 rounded-xl bg-white shadow-sm">
      <div className="space-y-2">
        <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Deal or job title"
          className="max-w-md"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="value">Value ($)</Label>
        <Input
          id="value"
          type="number"
          min={0}
          step={0.01}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="0"
          className="max-w-[160px]"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Job address"
          className="max-w-md"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="scheduledAt">Scheduled date & time</Label>
        <Input
          id="scheduledAt"
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Recurrence */}
      <div className="space-y-3 rounded-lg border border-slate-200 dark:border-slate-700 p-4 max-w-md">
        <div className="flex items-center justify-between">
          <div>
            <Label className="font-medium">Repeat this job</Label>
            <p className="text-xs text-muted-foreground mt-0.5">Tracey will automatically clone this job on the next cycle.</p>
          </div>
          <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
        </div>
        {isRecurring && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600 dark:text-slate-400 shrink-0">Every</span>
              <Input
                type="number"
                min={1}
                max={52}
                value={recurrenceInterval}
                onChange={(e) => setRecurrenceInterval(e.target.value)}
                className="w-16 h-8 text-sm"
              />
              <Select value={recurrenceUnit} onValueChange={(v) => setRecurrenceUnit(v as RecurrenceRule["unit"])}>
                <SelectTrigger className="w-32 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">day(s)</SelectItem>
                  <SelectItem value="week">week(s)</SelectItem>
                  <SelectItem value="fortnight">fortnight</SelectItem>
                  <SelectItem value="month">month(s)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="recurrence-end" className="text-xs text-slate-600 dark:text-slate-400">End date (optional)</Label>
              <Input
                id="recurrence-end"
                type="date"
                value={recurrenceEndDate}
                onChange={(e) => setRecurrenceEndDate(e.target.value)}
                className="max-w-[160px] h-8 text-sm"
              />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Stage</Label>
        <Select value={stage} onValueChange={setStage}>
          <SelectTrigger className="max-w-md">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {stageOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {canManageAssignment && teamMembers.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="assignedTo">Assigned to {stage === "scheduled" ? <span className="text-red-500">*</span> : ""}</Label>
          <Select value={assignedToId || "__unassigned__"} onValueChange={(v) => setAssignedToId(v === "__unassigned__" ? "" : v)}>
            <SelectTrigger id="assignedTo" className="max-w-md">
              <SelectValue placeholder={stage === "scheduled" ? "Select team member" : "Optional"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__unassigned__">None</SelectItem>
              {teamMembers.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name || m.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes about this deal…"
          className="min-h-[100px] resize-y max-w-md"
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push(`/crm/deals/${dealId}`)}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
