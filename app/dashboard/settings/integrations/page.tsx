"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Calendar, Check, Loader2, RefreshCcw } from "lucide-react"
import { toast } from "sonner"

export default function IntegrationsPage() {
    const [status, setStatus] = useState<"idle" | "connecting" | "connected">("idle")

    const handleConnect = () => {
        setStatus("connecting")

        // Mock connection delay
        setTimeout(() => {
            setStatus("connected")
            toast.success("Google Calendar connected successfully")
        }, 2000)
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Integrations</h3>
                <p className="text-sm text-muted-foreground">
                    Connect Pj Buddy to your external tools.
                </p>
            </div>
            <Separator />

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-blue-500" />
                            Google Calendar
                        </CardTitle>
                        <CardDescription>
                            Sync your schedule to view external appointments alongside your jobs.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4">
                            <div className="bg-slate-100 p-4 rounded-full">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" alt="Google Calendar" className="h-8 w-8" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="font-medium">Calendar Sync</h4>
                                <p className="text-sm text-slate-500">
                                    {status === "connected"
                                        ? "Sync is active. External events will appear in Scheduler."
                                        : "Two-way sync with your primary Google Calendar."}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="bg-slate-50 border-t flex justify-between items-center px-6 py-4">
                        {status === "connected" ? (
                            <div className="flex items-center text-sm text-emerald-600 font-medium">
                                <Check className="h-4 w-4 mr-2" />
                                Connected as user@example.com
                            </div>
                        ) : (
                            <div className="text-xs text-slate-500">
                                Permissions: Read/Write Events
                            </div>
                        )}

                        {status === "idle" && (
                            <Button onClick={handleConnect}>Connect Calendar</Button>
                        )}
                        {status === "connecting" && (
                            <Button disabled>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Connecting...
                            </Button>
                        )}
                        {status === "connected" && (
                            <Button variant="outline" onClick={() => setStatus("idle")}>
                                Disconnect
                            </Button>
                        )}
                    </CardFooter>
                </Card>

                <Card className="opacity-60 grayscale cursor-not-allowed relative">
                    <div className="absolute inset-0 bg-white/40 z-10" />
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <RefreshCcw className="h-5 w-5 text-slate-500" />
                            Xero / QuickBooks
                        </CardTitle>
                        <CardDescription>
                            Sync invoices and payments automatically.
                        </CardDescription>
                    </CardHeader>
                    <CardFooter className="border-t px-6 py-4">
                        <Button variant="secondary" disabled>Coming Soon</Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    )
}
