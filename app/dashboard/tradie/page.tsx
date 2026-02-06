"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, Navigation } from "lucide-react"

export default function TradiePage() {
    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-slate-50">Tradie View</h1>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Navigation className="mr-2 h-4 w-4" />
                    Start Route
                </Button>
            </div>

            {/* Map Placeholder */}
            <Card className="flex-1 border-slate-800 bg-slate-900/50 backdrop-blur-sm relative overflow-hidden group">
                <div className="absolute inset-0 bg-[url('https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/144.9631, -37.8136,13,0/600x600?access_token=placeholder')] bg-cover opacity-20 transition-opacity group-hover:opacity-30">
                    {/* Fallback pattern if no image */}
                    <div className="w-full h-full bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px]" />
                </div>

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4">
                    <div className="h-24 w-24 rounded-full bg-blue-500/20 flex items-center justify-center animate-pulse">
                        <MapPin className="h-10 w-10 text-blue-500" />
                    </div>
                    <p className="text-slate-400 font-mono text-sm">Waiting for GPS signal...</p>
                </div>

                <div className="absolute bottom-6 left-6 right-6">
                    <div className="flex gap-4 overflow-x-auto pb-2">
                        {[1, 2, 3].map((job) => (
                            <Card key={job} className="min-w-[200px] border-slate-700 bg-slate-800/80 p-4 hover:border-blue-500 cursor-pointer transition-colors">
                                <div className="flex items-start justify-between">
                                    <h4 className="font-semibold text-slate-200">Emergency Fix</h4>
                                    <span className="text-xs text-amber-500">Urgent</span>
                                </div>
                                <p className="text-xs text-slate-400 mt-2">123 Smith St, Collingwood</p>
                            </Card>
                        ))}
                    </div>
                </div>
            </Card>
        </div>
    )
}
