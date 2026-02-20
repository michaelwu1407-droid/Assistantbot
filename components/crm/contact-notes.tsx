"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { updateContactMetadata } from "@/actions/contact-actions"
import { toast } from "sonner"

interface ContactNotesProps {
  contactId: string
  initialNotes: string
}

export function ContactNotes({ contactId, initialNotes }: ContactNotesProps) {
  const [notes, setNotes] = useState(initialNotes)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setNotes(initialNotes)
  }, [initialNotes])

  const handleSave = async () => {
    setSaving(true)
    try {
      const result = await updateContactMetadata(contactId, { notes })
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
        placeholder="Log notes about this customer…"
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
