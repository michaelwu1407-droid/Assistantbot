"use client"

import { useState, useEffect, useRef } from "react"
import { Bot, Maximize2, Minimize2, Send } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useDashboard } from "@/components/providers/dashboard-provider"
import { processChat } from "@/actions/chat-actions"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { cn } from "@/lib/utils"

interface Message {
    id: string
    role: "user" | "assistant"
    content: string
}

export function AssistantPane() {
    const { mode, toggleMode } = useDashboard()
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [workspaceId, setWorkspaceId] = useState<string | null>(null)
    const scrollRef = useRef<HTMLDivElement>(null)

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
        <div className="flex h-full flex-col h-full">
            <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4 bg-white">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-purple-600 border border-purple-100">
                        <Bot className="h-5 w-5" />
                    </div>
                    <span className="font-semibold text-slate-900">Pj Assistant</span>
                </div>

                {/* Layout Toggle */}
                <Button variant="ghost" size="icon" onClick={toggleMode} title={mode === "chat" ? "Show CRM" : "Focus Chat"}>
                    {mode === "chat" ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
            </div>

            <div className="flex-1 p-4 bg-slate-50/50 overflow-hidden">
                <Card className="h-full border-slate-200 shadow-none bg-white flex flex-col">
                    <CardHeader className="shrink-0">
                        <CardTitle className="text-lg">Chat</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                        {messages.length === 0 && (
                            <div className="text-slate-500 text-sm">
                                I am ready to help you manage your jobs and leads.
                                <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-xs">
                                    Try asking: "Show me deals in negotiation" or "Email John about the invoice".
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
                                        "rounded-lg px-4 py-2 max-w-[85%] text-sm whitespace-pre-wrap",
                                        msg.role === "user"
                                            ? "bg-slate-900 text-white"
                                            : "bg-slate-100 text-slate-900"
                                    )}
                                >
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-slate-100 rounded-lg px-4 py-2 text-sm text-slate-500">
                                    Thinking...
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="p-4 border-t border-slate-200 bg-white">
                <div className="flex gap-2">
                    <Input 
                        placeholder="Type a command..." 
                        className="bg-slate-50 border-slate-200 focus-visible:ring-purple-500"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading || !workspaceId}
                    />
                    <Button 
                        size="icon" 
                        variant="default" 
                        className="bg-slate-900 hover:bg-slate-800"
                        onClick={handleSend}
                        disabled={isLoading || !workspaceId}
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
