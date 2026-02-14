"use client"

import { useState, useEffect } from "react"
import { Mic, MicOff, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useSpeechRecognition } from "@/hooks/use-speech-recognition"
import { logActivity } from "@/actions/activity-actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface VoiceNoteInputProps {
    dealId: string
}

export function VoiceNoteInput({ dealId }: VoiceNoteInputProps) {
    const { isListening, transcript, toggleListening } = useSpeechRecognition()
    const [note, setNote] = useState("")
    const router = useRouter()

    useEffect(() => {
        if (transcript) {
            setNote((prev) => prev ? `${prev} ${transcript}` : transcript)
        }
    }, [transcript])

    const handleSave = async () => {
        if (!note.trim()) return

        try {
            await logActivity({
                type: "NOTE",
                title: "Voice Note",
                description: "Transcribed voice note added to job diary",
                content: note,
                dealId,
            })
            toast.success("Note saved to job diary")
            setNote("")
            router.refresh()
        } catch (error) {
            toast.error("Failed to save note")
        }
    }

    return (
        <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-2 mb-4">
            <div className="flex items-center gap-2 mb-2">
                <Button
                    variant={isListening ? "destructive" : "outline"}
                    size="sm"
                    onClick={toggleListening}
                    className={isListening ? "animate-pulse" : ""}
                >
                    {isListening ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
                    {isListening ? "Stop Recording" : "Dictate Note"}
                </Button>
                <span className="text-xs text-slate-500">
                    {isListening ? "Listening..." : "Tap mic to start"}
                </span>
            </div>
            <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Type or dictate a job diary note..."
                className="min-h-[80px] text-sm resize-none"
            />
            <div className="flex justify-end">
                <Button size="sm" onClick={handleSave} disabled={!note.trim()}>
                    <Send className="h-3 w-3 mr-2" /> Save to Diary
                </Button>
            </div>
        </div>
    )
}
