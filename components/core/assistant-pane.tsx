"use client"

import { useState, useEffect, useRef } from "react"
import { Bot, Maximize2, Minimize2, Send, Mic, MicOff } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useShellStore } from "@/lib/store"
import { useIndustry } from "@/components/providers/industry-provider"
import { processChat } from "@/actions/chat-actions"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { cn } from "@/lib/utils"

interface Message {
    id: string
    role: "user" | "assistant"
    content: string
}

export function AssistantPane() {
    const { viewMode, setViewMode } = useShellStore()
    const { industry } = useIndustry()
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isListening, setIsListening] = useState(false)
    const [workspaceId, setWorkspaceId] = useState<string | null>(null)
    const scrollRef = useRef<HTMLDivElement>(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognitionRef = useRef<any>(null)

    useEffect(() => {
        // Initialize workspace
        getOrCreateWorkspace("demo-user").then(ws => setWorkspaceId(ws.id))
    }, [])

    useEffect(() => {
        // Scroll to bottom on new message
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    // Initialize Speech Recognition
    useEffect(() => {
        if (typeof window !== "undefined") {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
            if (SR) {
                const recognition = new SR()
                recognition.continuous = false
                recognition.interimResults = false
                recognition.lang = "en-AU"

                recognition.onstart = () => setIsListening(true)
                recognition.onend = () => setIsListening(false)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                recognition.onresult = (event: any) => {
                    const transcript = event.results[0][0].transcript
                    setInput((prev: string) => prev ? `${prev} ${transcript}` : transcript)
                }

                recognitionRef.current = recognition
            }
        }
    }, [])

    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert("Speech recognition is not supported in this browser.")
            return
        }

        if (isListening) {
            recognitionRef.current.stop()
        } else {
            recognitionRef.current.start()
        }
    }

    const handleSend = async () => {
        if (!input.trim() || !workspaceId || isLoading) return

        const userMsg: Message = {
            id: Date.now().toString(),
            role: "user",
            content: input
        }

        setMessages(prev => [...prev, userMsg])
        setInput("")
        setIsLoading(true)

        try {
            const response = await processChat(userMsg.content, workspaceId)

            const botMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: response.message
            }
            setMessages(prev => [...prev, botMsg])

            // Handle UI Actions triggered by the bot
            if (response.action) {
                switch (response.action) {
                    case "start_day":
                        setViewMode("ADVANCED")
                        // Navigate to tradie map view
                        window.location.href = "/dashboard/tradie/map"
                        break
                    case "start_open_house":
                        // Navigate to kiosk mode
                        window.location.href = "/kiosk/open-house"
                        break
                    case "show_deals":
                        setViewMode("ADVANCED")
                        // Shows kanban already visible in dashboard
                        break
                    case "show_stale":
                        setViewMode("ADVANCED")
                        break
                    case "create_deal":
                        setViewMode("ADVANCED")
                        break
                    case "create_invoice":
                        setViewMode("ADVANCED")
                        break
                }
            }

        } catch (error) {
            console.error("Chat error:", error)
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: "Sorry, I encountered an error processing your request."
            }
            setMessages(prev => [...prev, errorMsg])
        } finally {
            setIsLoading(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <div className="flex h-full flex-col bg-background">
            <div className="flex h-16 items-center justify-between border-b px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Bot className="h-5 w-5" />
                    </div>
                    <span className="font-semibold text-foreground">Pj Assistant</span>
                </div>

                {/* Layout Toggle */}
                <Button
                    id="mode-toggle"
                    variant="ghost"
                    size="icon"
                    onClick={() => setViewMode(viewMode === "BASIC" ? "ADVANCED" : "BASIC")}
                    title={viewMode === "BASIC" ? "Show CRM" : "Focus Chat"}
                >
                    {viewMode === "BASIC" ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
            </div>

            <div className="flex-1 overflow-hidden bg-muted/30">
                <div className="h-full flex flex-col">
                    <div className="flex-1 overflow-y-auto p-4 space-y-6" ref={scrollRef}>
                        {messages.length === 0 && (
                            <div className="text-muted-foreground text-sm space-y-4 max-w-sm mx-auto mt-10 text-center">
                                <Bot className="h-12 w-12 mx-auto text-muted-foreground/50" />
                                <p>
                                    {industry === "TRADES"
                                        ? "G'day! Ready to quote some jobs or chase invoices?"
                                        : industry === "REAL_ESTATE"
                                            ? "Hey! Ready for the open house or need to find a buyer?"
                                            : "Hey! I'm ready to help you manage your jobs and leads."}
                                </p>
                                <div className="grid gap-2">
                                    <Button variant="outline" size="sm" className="justify-start h-auto py-2 px-3 text-left font-normal" onClick={() => setInput(industry === "TRADES" ? "Start my day" : "Who is matching 123 Main St?")}>
                                        "{industry === "TRADES" ? "Start my day" : industry === "REAL_ESTATE" ? "Who is matching 123 Main St?" : "Show me deals in negotiation"}"
                                    </Button>
                                </div>
                            </div>
                        )}

                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={cn(
                                    "flex w-full",
                                    msg.role === "user" ? "justify-end" : "justify-start"
                                )}
                            >
                                <div
                                    className={cn(
                                        "rounded-2xl px-4 py-3 max-w-[85%] text-sm whitespace-pre-wrap shadow-sm",
                                        msg.role === "user"
                                            ? "bg-primary text-primary-foreground rounded-br-none"
                                            : "bg-card text-card-foreground border border-border/50 rounded-bl-none"
                                    )}
                                >
                                    {msg.content}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-muted rounded-lg px-4 py-2 text-sm text-muted-foreground animate-pulse">
                                    Thinking...
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="p-4 border-t bg-background">
                <div className="flex gap-2 relative">
                    <Button
                        id="voice-btn"
                        size="icon"
                        variant={isListening ? "destructive" : "outline"}
                        onClick={toggleListening}
                        className={cn("shrink-0 transition-all", isListening && "animate-pulse ring-2 ring-destructive/50")}
                        title="Voice Input"
                    >
                        {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                    <Input
                        id="chat-input"
                        placeholder="Type a command..."
                        className="bg-muted/50 border-input focus-visible:ring-primary pr-12"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading || !workspaceId}
                    />
                    <Button
                        size="icon"
                        className="absolute right-0 top-0 h-full rounded-l-none"
                        onClick={handleSend}
                        disabled={isLoading || !workspaceId || !input.trim()}
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
