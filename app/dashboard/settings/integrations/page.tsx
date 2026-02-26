"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Mail, Calendar, Check, Loader2, RefreshCcw, ExternalLink, Copy, Zap, X, FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { getOrAllocateInboundEmail } from "@/actions/settings-actions"
import { connectXero } from "@/actions/integration-actions"
import { EmailLeadCaptureSettings } from "@/components/settings/email-lead-capture-settings"

export default function IntegrationsPage() {
    const searchParams = useSearchParams()
    const [status, setStatus] = useState<"idle" | "connecting" | "connected">("idle")
    const [xeroStatus, setXeroStatus] = useState<"idle" | "connecting" | "connected">("idle")
    const [email, setEmail] = useState<string>("")
    const [emailIntegrations, setEmailIntegrations] = useState<any[]>([])

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
        if (success === "gmail_connected" || success === "outlook_connected") {
            toast.success(`${success === "gmail_connected" ? "Gmail" : "Outlook"} connected successfully!`)
            // Refresh email integrations
            fetchEmailIntegrations()
        }
        if (error) {
            toast.error(`Connection failed: ${error.replace(/_/g, " ")}`)
        }
    }, [searchParams])

    const fetchEmailIntegrations = async () => {
        // This would fetch from your API
        // For now, using mock data
        setEmailIntegrations([])
    }

    const handleConnectEmail = async (provider: "gmail" | "outlook") => {
        try {
            const response = await fetch(`/api/auth/email-provider?provider=${provider}`)
            const data = await response.json()
            if (data.authUrl) {
                window.location.href = data.authUrl
            } else {
                toast.error("Failed to generate authorization URL")
            }
        } catch {
            toast.error("Failed to start email connection")
        }
    }

    const handleDisconnectEmail = async (integrationId: string) => {
        try {
            // This would call your API to disconnect
            toast.success("Email integration disconnected")
            setEmailIntegrations(prev => prev.filter(i => i.id !== integrationId))
        } catch {
            toast.error("Failed to disconnect email")
        }
    }

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
                {/* Email Provider Integration */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Mail className="h-5 w-5 text-blue-500" />
                            <CardTitle>Instant Lead Capture</CardTitle>
                        </div>
                        <CardDescription>
                            Connect your Gmail or Outlook account to automatically capture leads from Hipages, Airtasker, ServiceSeeking and more. Our AI will instantly parse leads and send intro SMS to win the speed-to-lead race.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-green-50/50 rounded-lg border border-green-100 flex gap-3 text-green-800 text-sm">
                            <Zap className="h-5 w-5 shrink-0 mt-0.5 text-green-600" />
                            <p>
                                <strong>How it works:</strong> Connect your email account once and we'll automatically create filters to watch for lead notifications from all major platforms. No manual setup required - we handle everything!
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Button
                                variant="outline"
                                className="h-auto py-4 px-6 flex flex-col items-center gap-2 hover:border-red-500/50 hover:bg-red-50/50 transition-all"
                                onClick={() => handleConnectEmail("gmail")}
                            >
                                <Mail className="h-8 w-8 text-red-500" />
                                <div className="text-center">
                                    <div className="font-medium">Connect Gmail</div>
                                    <div className="text-xs text-muted-foreground">Auto-capture from all platforms</div>
                                </div>
                            </Button>
                            
                            <Button
                                variant="outline"
                                className="h-auto py-4 px-6 flex flex-col items-center gap-2 hover:border-blue-500/50 hover:bg-blue-50/50 transition-all"
                                onClick={() => handleConnectEmail("outlook")}
                            >
                                <Mail className="h-8 w-8 text-blue-500" />
                                <div className="text-center">
                                    <div className="font-medium">Connect Outlook</div>
                                    <div className="text-xs text-muted-foreground">Auto-capture from all platforms</div>
                                </div>
                            </Button>
                        </div>

                        {emailIntegrations.length > 0 && (
                            <div className="space-y-2 pt-2">
                                <label className="text-sm font-medium">Connected Accounts</label>
                                <div className="space-y-2">
                                    {emailIntegrations.map((integration) => (
                                        <div key={integration.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${integration.isActive ? "bg-green-500" : "bg-gray-400"}`} />
                                                <span className="text-sm font-medium">{integration.emailAddress}</span>
                                                <Badge variant="outline" className="text-xs">
                                                    {integration.provider}
                                                </Badge>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDisconnectEmail(integration.id)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <EmailLeadCaptureSettings />

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-blue-500" />
                            Google Calendar
                        </CardTitle>
                        <CardDescription>
                            Two-way sync so jobs appear in your Google Calendar. [To be built]
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-200 mb-4">
                            Calendar sync is coming soon. You will be able to connect Google Calendar and see last sync time here.
                        </div>
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
