"use client"

import { useState, useEffect, useRef } from "react"
import { Bot, Maximize2, Minimize2, Send, Mic, MicOff, Settings, Check, X, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useShellStore } from "@/lib/store"
import { useIndustry } from "@/components/providers/industry-provider"
import { processChat, getChatHistory } from "@/actions/chat-actions"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { format, isSameDay, isToday, isYesterday } from "date-fns"
import { toast } from "sonner"
import { useSpeechRecognition } from "@/hooks/use-speech-recognition"

interface Message {
    id: string
    role: "user" | "assistant"
    content: string
    timestamp: number
    action?: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any
}

interface DraftDealData {
    title: string
    company?: string
    value?: string
}

export function AssistantPane() {
    const { viewMode, setViewMode, workspaceId } = useShellStore()
    const { industry } = useIndustry()
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const { isListening, transcript, toggleListening } = useSpeechRecognition()
    const scrollRef = useRef<HTMLDivElement>(null)
    const router = useRouter()

    // Load chat history on component mount
    useEffect(() => {
        if (workspaceId) {
            loadChatHistory(workspaceId).then(history => {
                if (history && history.length > 0) {
                    setMessages(history)
                }
            }).catch(error => {
                    console.error("Failed to load chat history:", error)
                })
        }
    }, [workspaceId])

    // Scroll to bottom on new message
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    // Append transcript to input
    useEffect(() => {
        if (transcript) {
            setInput((prev: string) => prev ? `${prev} ${transcript}` : transcript)
        }
    }, [transcript])

    const handleSend = async (overrideMsg?: string, overrideParams?: any) => {
        const msgText = overrideMsg || input
        if (!msgText.trim() && !overrideParams) return
        if (!workspaceId || isLoading) return

        const userMsg: Message = {
            id: Date.now().toString(),
            role: "user",
            content: msgText,
            timestamp: Date.now()
        }

        // Only add user message if it's not a background confirmation
        if (!overrideParams?.confirmed) {
            setMessages(prev => [...prev, userMsg])
        }

        setInput("")
        setIsLoading(true)

        try {
            const response = await processChat(msgText, workspaceId, overrideParams)

            const botMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: response.message,
                timestamp: Date.now(),
                action: response.action,
                data: response.data
            }
            setMessages(prev => [...prev, botMsg])

            // Handle UI Actions triggered by the bot
            if (response.action) {
                switch (response.action) {
                    case "start_day":
                        setViewMode("ADVANCED")
                        window.location.href = "/dashboard/tradie/map"
                        break
                    case "start_open_house":
                        window.location.href = "/kiosk/open-house"
                        break
                    case "show_deals":
                    case "show_stale":
                    case "create_deal": // Success case
                    case "create_invoice":
                        if (viewMode === "BASIC") {
                            // Optional: Switch to advanced if looking at heavy data
                            // setViewMode("ADVANCED")
                        }
                        break
                    case "draft_deal":
                        // Stay in chat to confirm
                        break
                }
            }

        } catch (error) {
            console.error("Chat error:", error)
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: "Sorry, I encountered an error processing your request.",
                timestamp: Date.now()
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

    const handleConfirmDraft = async (draft: DraftDealData) => {
        // Trigger creation with confirmed flag
        await handleSend(`Create ${draft.title}`, {
            intent: "create_deal",
            confirmed: "true",
            title: draft.title,
            company: draft.company,
            value: draft.value
        })
    }

    const handleConfirmJobNatural = async (jobData: any) => {
        // Trigger creation with confirmed flag
        await handleSend(`Create job for ${jobData.clientName}`, {
            intent: "create_job_natural",
            confirmed: "true",
            ...jobData
        })
    }

    // Helper to render date dividers
    const renderDateDivider = (timestamp: number, index: number) => {
        if (index === 0) return renderDividerContent(timestamp)

        const prevMsg = messages[index - 1]
        if (!isSameDay(timestamp, prevMsg.timestamp)) {
            return renderDividerContent(timestamp)
        }
        return null
    }

    const renderDividerContent = (timestamp: number) => {
        let label = format(timestamp, "MMMM d, yyyy")
        if (isToday(timestamp)) label = "Today"
        if (isYesterday(timestamp)) label = "Yesterday"

        return (
            <div className="flex items-center gap-4 my-4">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    {label}
                </span>
                <Separator className="flex-1" />
            </div>
        )
    }

    return (
        <div
            id="assistant-pane"
            className={cn(
                "flex h-full flex-col bg-background transition-all duration-500 ease-in-out relative overflow-hidden",
                // In Basic view, we want a centered, floating card look if in premium mode
                viewMode === "BASIC" && "md:max-w-3xl md:mx-auto md:h-[85vh] md:rounded-2xl md:shadow-2xl md:border",
                // Glass effect for premium basic mode
                viewMode === "BASIC" && "supports-[backdrop-filter]:bg-background/80 backdrop-blur-xl"
            )}
        >
            {/* Background Pattern for Basic Mode */}
            {viewMode === "BASIC" && (
                <>
                    <div className="absolute inset-0 z-0 bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/30 pointer-events-none" />
                    <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
                        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }}
                    />
                </>
            )}

            {/* Header */}
            <div className="flex h-16 items-center justify-between border-b px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 rounded-t-2xl z-10">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Bot className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-semibold text-foreground leading-none">Pj Assistant</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium mt-0.5">
                            {industry || "General"} AI
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push("/dashboard/settings")}
                        title="Settings"
                    >
                        <Settings className="h-4 w-4 text-muted-foreground" />
                    </Button>

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
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-hidden bg-muted/30 relative z-10">
                <div className="h-full flex flex-col">
                    <div className="flex-1 overflow-y-auto p-4 space-y-6" ref={scrollRef}>
                        {messages.length === 0 && (
                            <div className="text-muted-foreground text-sm space-y-6 max-w-sm mx-auto mt-20 text-center">
                                <div className="bg-primary/5 p-6 rounded-full w-24 h-24 mx-auto flex items-center justify-center mb-6">
                                    <Bot className="h-12 w-12 text-primary/80" />
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-lg font-semibold text-foreground">
                                        {industry === "TRADES" ? "G'day! Ready to work?" : industry === "REAL_ESTATE" ? "Welcome back, Agent." : "How can I help?"}
                                    </h3>
                                    <p className="text-muted-foreground/80">
                                        {industry === "TRADES"
                                            ? "I can help you quote jobs, chase invoices, or plan your route."
                                            : industry === "REAL_ESTATE"
                                                ? "I can help you match buyers, schedule opens, or write listings."
                                                : "I'm ready to help you manage your jobs and leads."}
                                    </p>
                                </div>

                                <div className="grid gap-2 pt-4">
                                    <Button variant="outline" size="sm" className="justify-start h-auto py-3 px-4 text-left font-normal" onClick={() => setInput(industry === "TRADES" ? "Start my day" : "Who is matching 123 Main St?")}>
                                        "{industry === "TRADES" ? "Start my day" : industry === "REAL_ESTATE" ? "Who is matching 123 Main St?" : "Show me deals in negotiation"}"
                                    </Button>
                                    <Button variant="outline" size="sm" className="justify-start h-auto py-3 px-4 text-left font-normal" onClick={() => setInput("Show stale deals")}>
                                        "Show stale deals"
                                    </Button>
                                </div>
                            </div>
                        )}

                        {messages.map((msg, index) => (
                            <div key={msg.id}>
                                {renderDateDivider(msg.timestamp, index)}

                                <div className={cn(
                                    "flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300",
                                    msg.role === "user" ? "justify-end" : "justify-start"
                                )}>
                                    <div className={cn(
                                        "rounded-2xl px-4 py-3 max-w-[85%] text-sm shadow-sm",
                                        msg.role === "user"
                                            ? "bg-primary text-primary-foreground rounded-br-none"
                                            : "bg-card text-card-foreground border border-border/50 rounded-bl-none"
                                    )}>
                                        <div className="whitespace-pre-wrap">{msg.content}</div>

                                        {/* Generative UI: Draft Deal Card */}
                                        {msg.action === "draft_deal" && msg.data && (
                                            <Card className="mt-3 border-primary/20 bg-muted/30 overflow-hidden">
                                                <CardHeader className="pb-2 bg-muted/50">
                                                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                                                        <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                                                        Draft Deal
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="pt-3 text-xs space-y-2">
                                                    <div className="grid grid-cols-3 gap-1">
                                                        <span className="text-muted-foreground">Title:</span>
                                                        <span className="col-span-2 font-medium">{msg.data.title}</span>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-1">
                                                        <span className="text-muted-foreground">Client:</span>
                                                        <span className="col-span-2 font-medium">{msg.data.company || "New Client"}</span>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-1">
                                                        <span className="text-muted-foreground">Value:</span>
                                                        <span className="col-span-2 font-medium text-emerald-600">
                                                            ${Number(msg.data.value).toLocaleString()}
                                                        </span>
                                                    </div>
                                                </CardContent>
                                                <CardFooter className="p-2 bg-muted/50 flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="flex-1 h-8 text-xs hover:bg-destructive/10 hover:text-destructive"
                                                        onClick={() => {
                                                            setMessages(prev => [...prev, {
                                                                id: Date.now().toString(),
                                                                role: "assistant",
                                                                content: "Cancelled draft.",
                                                                timestamp: Date.now()
                                                            }])
                                                        }}
                                                    >
                                                        <X className="h-3 w-3 mr-1" /> Cancel
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        className="flex-1 h-8 text-xs"
                                                        onClick={() => handleConfirmDraft(msg.data)}
                                                    >
                                                        <Check className="h-3 w-3 mr-1" /> Confirm
                                                    </Button>
                                                </CardFooter>
                                            </Card>
                                        )}

                                        {/* Generative UI: Natural Language Job Confirmation */}
                                        {msg.action === "draft_job_natural" && msg.data && (
                                            <Card className="mt-3 border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/20 overflow-hidden">
                                                <CardHeader className="pb-2 bg-emerald-100/50 dark:bg-emerald-900/20">
                                                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                                                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"/>
                                                        New Job Entry
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="pt-3 text-xs space-y-2">
                                                    <div className="grid grid-cols-3 gap-1">
                                                        <span className="text-muted-foreground">Client:</span>
                                                        <span className="col-span-2 font-medium">{msg.data.clientName}</span>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-1">
                                                        <span className="text-muted-foreground">Address:</span>
                                                        <span className="col-span-2 font-medium text-xs">{msg.data.address}</span>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-1">
                                                        <span className="text-muted-foreground">Work:</span>
                                                        <span className="col-span-2 font-medium">{msg.data.workDescription}</span>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-1">
                                                        <span className="text-muted-foreground">Quoted:</span>
                                                        <span className="col-span-2 font-medium text-emerald-600">
                                                            ${Number(msg.data.price).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-1">
                                                        <span className="text-muted-foreground">Schedule:</span>
                                                        <span className="col-span-2 font-medium">{msg.data.schedule}</span>
                                                    </div>
                                                </CardContent>
                                                <CardFooter className="p-2 bg-emerald-100/50 dark:bg-emerald-900/20 flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="flex-1 h-8 text-xs hover:bg-destructive/10 hover:text-destructive"
                                                        onClick={() => {
                                                            setMessages(prev => [...prev, {
                                                                id: Date.now().toString(),
                                                                role: "assistant",
                                                                content: "Job entry cancelled. Try again with corrections if needed.",
                                                                timestamp: Date.now()
                                                            }])
                                                        }}
                                                    >
                                                        <X className="h-3 w-3 mr-1"/> Cancel
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        className="flex-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                                                        onClick={() => handleConfirmJobNatural(msg.data)}
                                                    >
                                                        <Check className="h-3 w-3 mr-1"/> Create Job
                                                    </Button>
                                                </CardFooter>
                                            </Card>
                                        )}

                                        <div className={cn(
                                            "text-[10px] mt-1 text-right opacity-50",
                                            msg.role === "user" ? "text-primary-foreground" : "text-muted-foreground"
                                        )}>
                                            {format(msg.timestamp, "h:mm a")}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-muted rounded-lg px-4 py-2 text-sm text-muted-foreground flex items-center gap-2">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Thinking...
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Input Area */}
            <div className="p-4 border-t bg-background rounded-b-2xl z-10">
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
                        onClick={() => handleSend()}
                        disabled={isLoading || !workspaceId || !input.trim()}
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
