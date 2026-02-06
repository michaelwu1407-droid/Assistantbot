"use client"

import { Bot, Maximize2, Minimize2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useDashboard } from "@/components/providers/dashboard-provider"
import { cn } from "@/lib/utils"

export function AssistantPane() {
    const { mode, toggleMode } = useDashboard()

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

            <div className="flex-1 p-4 bg-slate-50/50">
                <Card className="h-full border-slate-200 shadow-none bg-white">
                    <CardHeader>
                        <CardTitle className="text-lg">Chat</CardTitle>
                    </CardHeader>
                    <CardContent className="text-slate-500 text-sm">
                        I am ready to help you manage your jobs and leads.
                        <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-xs">
                            Try asking: "Show me deals in negotiation" or "Email John about the invoice".
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="p-4 border-t border-slate-200 bg-white">
                <div className="flex gap-2">
                    <Input placeholder="Type a command..." className="bg-slate-50 border-slate-200 focus-visible:ring-purple-500" />
                    <Button size="icon" variant="default" className="bg-slate-900 hover:bg-slate-800">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-4 w-4"
                        >
                            <path d="M5 12h14" />
                            <path d="m12 5 7 7-7 7" />
                        </svg>
                    </Button>
                </div>
            </div>
        </div>
    )
}
