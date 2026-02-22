"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Calendar, Check, Loader2, RefreshCcw, Mail, ExternalLink, Copy, FileText } from "lucide-react"
import { toast } from "sonner"
import { getOrAllocateInboundEmail } from "@/actions/settings-actions"
import { connectXero } from "@/actions/integration-actions"

export default function IntegrationsPage() {
    const searchParams = useSearchParams()
    const [status, setStatus] = useState<"idle" | "connecting" | "connected">("idle")
    const [xeroStatus, setXeroStatus] = useState<"idle" | "connecting" | "connected">("idle")
    const [email, setEmail] = useState<string>("")

    useEffect(() => {
        const fetchEmail = async () => {
            try {
                const addr = await getOrAllocateInboundEmail()
                if (addr) setEmail(addr)
            } catch (e) {
                // ignore
            }
        }
        fetchEmail()
    }, [])

    // Handle OAuth redirects
    useEffect(() => {
        const success = searchParams.get("success")
        const error = searchParams.get("error")
        if (success === "xero_connected") {
            setXeroStatus("connected")
            toast.success("Xero connected successfully!")
        }
        if (error) {
            toast.error(`Connection failed: ${error.replace(/_/g, " ")}`)
        }
    }, [searchParams])

    const handleConnectXero = async () => {
        setXeroStatus("connecting")
        try {
            const result = await connectXero()
            if (result.url) {
                window.location.href = result.url
            } else {
                toast.error("Failed to generate Xero authorization URL")
                setXeroStatus("idle")
            }
        } catch {
            toast.error("Failed to start Xero connection")
            setXeroStatus("idle")
        }
    }

    const handleConnect = () => {
        setStatus("connecting")

        // Mock connection delay
        setTimeout(() => {
            setStatus("connected")
            toast.success("Google Calendar connected successfully")
        }, 2000)
    }

    const handleCopy = () => {
        navigator.clipboard.writeText(email)
        toast.success("Copied to clipboard")
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
                {/* Email Forwarding / Hipages */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Mail className="h-5 w-5 text-blue-500" />
                            <CardTitle>Hipages & Email Forwarding</CardTitle>
                        </div>
                        <CardDescription>
                            Automatically ingest new leads from Hipages, ServiceSeeking, or any email source directly into your Kanban board.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100 flex gap-3 text-blue-800 text-sm">
                            <ExternalLink className="h-5 w-5 shrink-0 mt-0.5 text-blue-600" />
                            <p>
                                <strong>How to use:</strong> Set up an auto-forwarding rule in your Gmail or Outlook account to forward emails from <code>leads@hipages.com.au</code> to the unique address below. Our AI will instantly parse the client name and address, and create a Draft Deal for you.
                            </p>
                        </div>

                        <div className="space-y-2 pt-2">
                            <label className="text-sm font-medium">Your Unique Forwarding Address</label>
                            <div className="flex gap-2">
                                <input
                                    readOnly
                                    value={email || "Generating..."}
                                    className="flex h-10 w-full rounded-md border border-input bg-slate-50 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono text-slate-600 cursor-copy"
                                    onClick={handleCopy}
                                />
                                <Button variant="outline" onClick={handleCopy} className="shrink-0" disabled={!email}>
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copy
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

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

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-[#13B5EA]" />
                            Xero Accounting
                        </CardTitle>
                        <CardDescription>
                            Automatically create draft invoices in Xero when jobs are completed. Your AI agent can invoice on your behalf.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4">
                            <div className="bg-slate-100 p-4 rounded-full">
                                <FileText className="h-8 w-8 text-[#13B5EA]" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="font-medium">Invoice Sync</h4>
                                <p className="text-sm text-slate-500">
                                    {xeroStatus === "connected"
                                        ? "Connected. Draft invoices will be created automatically when jobs move to the invoicing stage."
                                        : "Connect your Xero account to enable automatic draft invoicing from job quotes."}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="bg-slate-50 border-t flex justify-between items-center px-6 py-4">
                        {xeroStatus === "connected" ? (
                            <div className="flex items-center text-sm text-emerald-600 font-medium">
                                <Check className="h-4 w-4 mr-2" />
                                Xero Connected
                            </div>
                        ) : (
                            <div className="text-xs text-slate-500">
                                Permissions: Invoices, Contacts (read/write)
                            </div>
                        )}

                        {xeroStatus === "idle" && (
                            <Button onClick={handleConnectXero}>Connect Xero</Button>
                        )}
                        {xeroStatus === "connecting" && (
                            <Button disabled>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Connecting...
                            </Button>
                        )}
                        {xeroStatus === "connected" && (
                            <Button variant="outline" onClick={() => setXeroStatus("idle")}>
                                Disconnect
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            </div>
        </div>
    )
}
