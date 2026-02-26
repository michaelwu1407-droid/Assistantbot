"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateDeal, updateDealMetadata, updateDealAssignedTo } from "@/actions/deal-actions"
import { toast } from "sonner"

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
  stageOptions: { value: string; label: string }[]
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
  stageOptions,
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
      await updateDealAssignedTo(dealId, assignedToId || null)
      if (notes !== initialNotes) {
        await updateDealMetadata(dealId, { notes })
      }
      toast.success("Deal updated")
      router.push(`/dashboard/deals/${dealId}`)
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
        <Label htmlFor="title">Title</Label>
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
      {teamMembers.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="assignedTo">Assigned to {stage === "scheduled" ? "(required)" : ""}</Label>
          <Select value={assignedToId} onValueChange={setAssignedToId}>
            <SelectTrigger id="assignedTo" className="max-w-md">
              <SelectValue placeholder={stage === "scheduled" ? "Select team member" : "Optional"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
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
        <Button type="button" variant="outline" onClick={() => router.push(`/dashboard/deals/${dealId}`)}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
