"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, ClipboardList } from "lucide-react"

export default function AgentPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-slate-50">Agent Kiosk</h1>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    <ClipboardList className="mr-2 h-4 w-4" />
                    New Lead
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm hover:border-emerald-500/50 transition-colors cursor-pointer">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-200">
                            Active Visitors
                        </CardTitle>
                        <Users className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-50">12</div>
                        <p className="text-xs text-slate-400">
                            +4 since last hour
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm hover:border-emerald-500/50 transition-colors cursor-pointer">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-200">
                            Open House Mode
                        </CardTitle>
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-50">Active</div>
                        <p className="text-xs text-slate-400">
                            42 Wallaby Way, Sydney
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-slate-800 bg-slate-900/40 min-h-[400px]">
                    <CardHeader>
                        <CardTitle>Recent Leads</CardTitle>
                        <CardDescription>Real-time check-ins from the kiosk</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[1, 2, 3].map((lead) => (
                                <div key={lead} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-500">
                                            JD
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-200">John Doe</p>
                                            <p className="text-xs text-slate-500">Looking for 3 Bed, 2 Bath</p>
                                        </div>
                                    </div>
                                    <span className="text-xs text-slate-400">2m ago</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
