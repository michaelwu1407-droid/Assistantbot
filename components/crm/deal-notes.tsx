"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { updateDealMetadata } from "@/actions/deal-actions"
import { toast } from "sonner"
import { format } from "date-fns"
import { Edit2, Save, X, Send } from "lucide-react"

interface DealNotesProps {
  dealId: string
  initialNotes: string
}

type Note = {
  id: string
  date: string
  text: string
}

export function DealNotes({ dealId, initialNotes }: DealNotesProps) {
  const [notesList, setNotesList] = useState<Note[]>(() => {
    try {
      const parsed = JSON.parse(initialNotes)
      if (Array.isArray(parsed)) return parsed
    } catch {
      // Fallback for legacy raw string notes
    }
    return initialNotes.trim() ? [{ id: "legacy-1", date: new Date().toISOString(), text: initialNotes }] : []
  })

  const [currentText, setCurrentText] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [notesList])

  const saveToDb = async (updatedList: Note[]) => {
    setSaving(true)
    try {
      const result = await updateDealMetadata(dealId, { notes: JSON.stringify(updatedList) })
      if (result.success) {
        setNotesList(updatedList)
        setCurrentText("")
        setEditingId(null)
      } else {
        toast.error(result.error ?? "Failed to save")
      }
    } catch {
      toast.error("Failed to save notes")
    } finally {
      setSaving(false)
    }
  }

  const handleAddNote = () => {
    if (!currentText.trim()) return

    if (editingId) {
      const updated = notesList.map(n => n.id === editingId ? { ...n, text: currentText } : n)
      saveToDb(updated)
    } else {
      const newNote: Note = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        text: currentText.trim()
      }
      saveToDb([...notesList, newNote])
    }
  }

  const startEdit = (note: Note) => {
    setEditingId(note.id)
    setCurrentText(note.text)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setCurrentText("")
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/50 rounded-lg border border-slate-100 overflow-hidden relative">
      {/* Scrollable History inside the bubble area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar min-h-[60px] pb-16"
      >
        {notesList.length === 0 ? (
          <p className="text-slate-400 text-xs italic text-center mt-4">No notes yet. Add one below.</p>
        ) : (
          notesList.map((note) => (
            <div key={note.id} className="group relative bg-white border border-slate-100 p-2.5 rounded-md shadow-sm">
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-wider">
                  *{format(new Date(note.date), "MMM d, h:mm a")}*
                </span>
                <button
                  onClick={() => startEdit(note)}
                  className="text-slate-400 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {note.text}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Floating Bottom RHS Input Bubble */}
      <div className="absolute bottom-2 right-2 left-2 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col transition-all">
        {editingId && (
          <div className="bg-amber-50 px-3 py-1.5 flex justify-between items-center border-b border-amber-100">
            <span className="text-[10px] font-bold text-amber-700 uppercase">Editing Note</span>
            <button onClick={cancelEdit} className="text-amber-700 hover:text-amber-900"><X className="w-3 h-3" /></button>
          </div>
        )}
        <div className="relative">
          <Textarea
            value={currentText}
            onChange={(e) => setCurrentText(e.target.value)}
            placeholder={editingId ? "Update note..." : "Add a quick note..."}
            className="min-h-[32px] max-h-[80px] resize-none text-xs border-0 focus-visible:ring-0 px-3 py-2 bg-transparent scrollbar-hide pr-12 rounded-none shadow-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleAddNote()
              }
            }}
          />
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-1 bottom-1 h-7 w-7 rounded-md text-primary hover:bg-primary/10 hover:text-primary"
            onClick={handleAddNote}
            disabled={saving || !currentText.trim()}
          >
            {saving ? <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
