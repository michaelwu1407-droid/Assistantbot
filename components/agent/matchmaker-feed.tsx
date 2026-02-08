"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getMatchFeed, MatchFeedItem } from "@/actions/agent-actions"
import { Users, ArrowRight, Loader2 } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

export function MatchmakerFeed({ workspaceId }: { workspaceId: string }) {
    const [feed, setFeed] = useState<MatchFeedItem[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function load() {
            try {
                const data = await getMatchFeed(workspaceId)
                setFeed(data)
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [workspaceId])

    if (loading) {
        return (
            <Card className="h-full border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Matchmaker Feed
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="h-full border-slate-200 shadow-sm flex flex-col">
            <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-medium text-slate-900 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        Matchmaker
                    </div>
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                        {feed.reduce((acc, item) => acc + item.matchCount, 0)} Matches
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0">
                {feed.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs">
                        No matches found. Add more contacts with preferences.
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {feed.map((item) => (
                            <Link 
                                key={item.dealId} 
                                href={`/dashboard/deals/${item.dealId}`}
                                className="block p-4 hover:bg-slate-50 transition-colors group"
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-medium text-slate-900 text-sm line-clamp-1">{item.dealTitle}</span>
                                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 shadow-none text-[10px] h-5 px-1.5">
                                        {item.matchCount}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between text-xs text-slate-500">
                                    <span>
                                        {item.topMatchName ? `Top match: ${item.topMatchName}` : 'View matches'}
                                    </span>
                                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
