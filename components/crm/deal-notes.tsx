"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { updateDealMetadata } from "@/actions/deal-actions"
import { toast } from "sonner"

interface DealNotesProps {
  dealId: string
  initialNotes: string
}

export function DealNotes({ dealId, initialNotes }: DealNotesProps) {
  const [notes, setNotes] = useState(initialNotes)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setNotes(initialNotes)
  }, [initialNotes])

  const handleSave = async () => {
    setSaving(true)
    try {
      const result = await updateDealMetadata(dealId, { notes })
      if (result.success) {
        toast.success("Notes saved")
      } else {
        toast.error(result.error ?? "Failed to save")
      }
    } catch {
      toast.error("Failed to save notes")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Log notes about this customer or job…"
        className="min-h-[120px] resize-y text-sm"
      />
      <Button
        size="sm"
        className="mt-2 self-end"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? "Saving…" : "Save notes"}
      </Button>
    </div>
  )
}
