"use client"

import { Bot } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function AssistantPane() {
    return (
        <div className="flex h-full flex-col border-l border-slate-800 bg-slate-950/50 backdrop-blur-sm">
            <div className="flex h-14 items-center border-b border-slate-800 px-4">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-purple-400">
                        <Bot className="h-5 w-5" />
                    </div>
                    <span className="font-semibold text-slate-200">Pj Assistant</span>
                </div>
            </div>

            <div className="flex-1 p-4">
                <Card className="h-full border-slate-800 bg-slate-900/50">
                    <CardHeader>
                        <CardTitle className="text-lg">Chat</CardTitle>
                    </CardHeader>
                    <CardContent className="text-slate-400 text-sm">
                        I am ready to help you manage your jobs and leads.
                    </CardContent>
                </Card>
            </div>

            <div className="p-4 border-t border-slate-800">
                <div className="flex gap-2">
                    <Input placeholder="Type a command..." className="bg-slate-900 border-slate-700" />
                    <Button size="icon" variant="default">
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
