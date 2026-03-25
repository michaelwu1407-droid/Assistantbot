"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { toast } from "sonner"

type SpeechRecognitionErrorCode =
    | "no-speech"
    | "aborted"
    | "audio-capture"
    | "network"
    | "not-allowed"
    | "service-not-allowed"
    | "bad-grammar"
    | "language-not-supported"

interface SpeechRecognitionAlternative {
    transcript: string
    confidence?: number
}

interface SpeechRecognitionResultLike {
    0: SpeechRecognitionAlternative
    isFinal: boolean
    length: number
}

interface SpeechRecognitionEventLike {
    results: ArrayLike<SpeechRecognitionResultLike>
}

interface SpeechRecognitionErrorEventLike {
    error: SpeechRecognitionErrorCode | string
}

interface SpeechRecognitionLike {
    continuous: boolean
    interimResults: boolean
    lang: string
    onstart: (() => void) | null
    onend: (() => void) | null
    onresult: ((event: SpeechRecognitionEventLike) => void) | null
    onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
    start: () => void
    stop: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

export function useSpeechRecognition() {
    const [isListening, setIsListening] = useState(false)
    const [transcript, setTranscript] = useState("")
    const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

    useEffect(() => {
        if (typeof window === "undefined") return
        const w = window as typeof window & {
            SpeechRecognition?: SpeechRecognitionConstructor
            webkitSpeechRecognition?: SpeechRecognitionConstructor
        }
        const SpeechRecognition = w.SpeechRecognition ?? w.webkitSpeechRecognition
        if (!SpeechRecognition) return

        const recognition = new SpeechRecognition()
        recognition.continuous = false
        recognition.interimResults = false
        recognition.lang = "en-AU"

        recognition.onstart = () => setIsListening(true)
        recognition.onend = () => setIsListening(false)
        recognition.onresult = (event) => {
            const first = event.results[0]
            const text = first?.[0]?.transcript ?? ""
            setTranscript(text)
        }
        recognition.onerror = (event) => {
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
