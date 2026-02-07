"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Phone, MessageSquare, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { AgentLead } from "@/actions/agent-actions"

interface SpeedToLeadProps {
    leads: AgentLead[]
}

export function SpeedToLead({ leads }: SpeedToLeadProps) {
    // Auto-scroll or simulate live updates
    const [activeLeads, setActiveLeads] = useState(leads)

    // Remove lead when actioned
    const handleAction = (id: string) => {
        setActiveLeads(prev => prev.filter(l => l.id !== id))
    }

    if (activeLeads.length === 0) return null;

    return (
        <div className="w-full overflow-x-auto pb-4 scrollbar-hide">
            <div className="flex gap-4 px-4 min-w-max">
                {activeLeads.map((lead) => (
                    <Card key={lead.id} className="w-[280px] bg-indigo-950 border-indigo-800 text-white shadow-xl relative overflow-hidden group">
                        {/* Glow effect for "New" */}
                        <div className="absolute top-0 right-0 h-16 w-16 bg-blue-500 blur-3xl opacity-20 rounded-full -mr-8 -mt-8 pointer-events-none" />

                        <CardContent className="p-4 flex flex-col h-full">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10 border-2 border-white/20">
                                        <AvatarImage src={lead.avatar} />
                                        <AvatarFallback className="bg-indigo-800 text-indigo-200">
                                            {lead.name.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h4 className="font-bold text-sm">{lead.name}</h4>
                                        <p className="text-xs text-indigo-300 flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            Just now
                                            {/* {formatDistanceToNow(lead.createdAt)} ago */}
                                        </p>
                                    </div>
                                </div>
                                <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_10px_#4ade80]" />
                            </div>

                            <div className="space-y-2 mb-4 flex-1">
                                <p className="text-xs text-indigo-200 bg-indigo-900/50 p-2 rounded line-clamp-2">
                                    New inquiry from {lead.source}. Interested in property...
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mt-auto">
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    className="bg-green-500 hover:bg-green-600 text-white border-0"
                                    onClick={() => handleAction(lead.id)}
                                >
                                    <Phone className="h-4 w-4 mr-1" />
                                    Call
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="bg-transparent border-indigo-700 hover:bg-indigo-900 text-indigo-100"
                                    onClick={() => handleAction(lead.id)}
                                >
                                    <MessageSquare className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
