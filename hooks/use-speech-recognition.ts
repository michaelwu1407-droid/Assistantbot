"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { toast } from "sonner"

export function useSpeechRecognition() {
    const [isListening, setIsListening] = useState(false)
    const [transcript, setTranscript] = useState("")
    const recognitionRef = useRef<any>(null)

    useEffect(() => {
        if (typeof window === "undefined") return
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        if (!SpeechRecognition) return

        const recognition = new SpeechRecognition()
        recognition.continuous = false
        recognition.interimResults = false
        recognition.lang = "en-AU"

        recognition.onstart = () => setIsListening(true)
        recognition.onend = () => setIsListening(false)
        recognition.onresult = (event: any) => {
            const text = event.results[0][0].transcript
            setTranscript(text)
        }
        recognition.onerror = (event: any) => {
            setIsListening(false)
            if (event.error === "not-allowed") {
                toast.error("Microphone access denied. Check browser permissions.")
            }
        }

        recognitionRef.current = recognition
    }, [])

    const toggleListening = useCallback(() => {
        const recognition = recognitionRef.current
        if (!recognition) {
            toast.error("Speech recognition not supported in this browser.")
            return
        }
        if (isListening) {
            recognition.stop()
        } else {
            setTranscript("")
            recognition.start()
        }
    }, [isListening])

    return { isListening, transcript, toggleListening }
}
