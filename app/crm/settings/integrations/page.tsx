"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Mail, Calendar, Check, Loader2, Zap, X, FileText, CreditCard } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { connectGoogleCalendar, connectXero, disconnectEmailIntegration, disconnectWorkspaceCalendarIntegration, getIntegrationStatus } from "@/actions/integration-actions"
import { EmailLeadCaptureSettings } from "@/components/settings/email-lead-capture-settings"
import { useShellStore } from "@/lib/store"

interface EmailIntegrationView {
    id: string
    provider: string
    emailAddress: string
    isActive: boolean
    lastSyncAt?: string | Date | null
}

interface CalendarIntegrationView {
    connected: boolean
    provider: string
    emailAddress?: string | null
    lastSyncAt?: string | Date | null
    calendarId?: string | null
}

export default function IntegrationsPage() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const userRole = useShellStore((s) => s.userRole)
    const [calendarIntegration, setCalendarIntegration] = useState<CalendarIntegrationView>({
        connected: false,
        provider: "google",
        emailAddress: null,
        lastSyncAt: null,
        calendarId: null,
    })
    const [calendarLoading, setCalendarLoading] = useState(false)
    const [xeroStatus, setXeroStatus] = useState<"idle" | "connecting" | "connected">("idle")
    const [emailIntegrations, setEmailIntegrations] = useState<EmailIntegrationView[]>([])
    const [loadingIntegrations, setLoadingIntegrations] = useState(true)

    // RBAC: Team members cannot access integrations
    useEffect(() => {
        if (userRole === "TEAM_MEMBER") {
            router.replace("/crm/settings")
        }
    }, [userRole, router])

    useEffect(() => {
        refreshIntegrationStatus()
    }, [])

    // Handle OAuth redirects
    useEffect(() => {
        const success = searchParams.get("success")
        const error = searchParams.get("error")
        if (success === "gmail_connected" || success === "outlook_connected" || success === "xero_connected" || success === "google_calendar_connected") {
            toast.success(
                success === "xero_connected"
                    ? "Xero connected successfully!"
                    : success === "google_calendar_connected"
                        ? "Google Calendar connected successfully!"
                    : `${success === "gmail_connected" ? "Gmail" : "Outlook"} connected successfully!`
            )
            refreshIntegrationStatus()
        }
        if (error) {
            toast.error(`Connection failed: ${error.replace(/_/g, " ")}`)
        }
    }, [searchParams])

    const refreshIntegrationStatus = async () => {
        setLoadingIntegrations(true)
        try {
            const status = await getIntegrationStatus()
            setEmailIntegrations(status.emailIntegrations)
            setXeroStatus(status.xeroConnected ? "connected" : "idle")
            setCalendarIntegration(status.calendarIntegration)
        } catch {
            toast.error("Failed to load integration status")
        } finally {
            setLoadingIntegrations(false)
        }
    }

    const handleConnectGoogleCalendar = async () => {
        setCalendarLoading(true)
        try {
            const result = await connectGoogleCalendar()
            if (result.url) {
                window.location.href = result.url
                return
            }
            toast.error("Failed to start Google Calendar connection")
        } catch {
            toast.error("Failed to start Google Calendar connection")
        } finally {
            setCalendarLoading(false)
        }
    }

    const handleDisconnectGoogleCalendar = async () => {
        setCalendarLoading(true)
        try {
            await disconnectWorkspaceCalendarIntegration()
            setCalendarIntegration({
                connected: false,
                provider: "google",
                emailAddress: null,
                lastSyncAt: null,
                calendarId: null,
            })
            toast.success("Google Calendar disconnected")
        } catch {
            toast.error("Failed to disconnect Google Calendar")
        } finally {
            setCalendarLoading(false)
        }
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
            await disconnectEmailIntegration(integrationId)
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
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Integrations</h3>
                <p className="text-sm text-muted-foreground">
                    Connect Earlymark to your external tools.
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
                            This is usually connected during onboarding. If it was skipped, connect Gmail or Outlook here to capture leads automatically from Hipages, Airtasker, ServiceSeeking and more.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-green-50/50 rounded-lg border border-green-100 flex gap-3 text-green-800 text-sm">
                            <Zap className="h-5 w-5 shrink-0 mt-0.5 text-green-600" />
                            <p>
                                <strong>How it works:</strong> Connect your email account once and we&apos;ll automatically create filters to watch for lead notifications from all major platforms. No manual setup required - we handle everything!
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

                        {loadingIntegrations ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading connected accounts...
                            </div>
                        ) : emailIntegrations.length > 0 && (
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
                            Connect Google Calendar so Tracey can read availability and keep scheduled jobs in sync with your real calendar.
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
                                    {calendarIntegration.connected
                                        ? `Connected${calendarIntegration.emailAddress ? ` as ${calendarIntegration.emailAddress}` : ""}. Tracey will use Google Calendar availability and sync scheduled jobs.`
                                        : "Not connected. The scheduler will only see jobs stored inside Earlymark until you connect Google Calendar."}
                                </p>
                                {calendarIntegration.connected && calendarIntegration.lastSyncAt && (
                                    <p className="text-xs text-muted-foreground">
                                        Last sync: {new Date(calendarIntegration.lastSyncAt).toLocaleString()}
                                    </p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="bg-slate-50 border-t flex justify-between items-center px-6 py-4">
                        <div className="text-xs text-slate-500">
                            Permissions: Read/Write Events
                        </div>
                        {calendarIntegration.connected ? (
                            <Button variant="outline" onClick={handleDisconnectGoogleCalendar} disabled={calendarLoading}>
                                {calendarLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                Disconnect
                            </Button>
                        ) : (
                            <Button onClick={handleConnectGoogleCalendar} disabled={calendarLoading}>
                                {calendarLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                Connect Google Calendar
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
                            <Button variant="outline" disabled>
                                Connected
                            </Button>
                        )}
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-indigo-500" />
                            Payment Processors
                        </CardTitle>
                        <CardDescription>
                            Connect payment gateways to securely receive payments from clients online.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-slate-50 border rounded-lg">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white rounded-md shadow-sm border text-indigo-600 font-bold">
                                    Stripe
                                </div>
                                <div>
                                    <h4 className="font-medium text-sm">Stripe</h4>
                                    <p className="text-xs text-muted-foreground">Accept credit cards and Apple/Google Pay</p>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" disabled>
                                Coming soon
                            </Button>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-slate-50 border rounded-lg">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white rounded-md shadow-sm border text-purple-600 font-bold">
                                    MYOB
                                </div>
                                <div>
                                    <h4 className="font-medium text-sm">MYOB PayBy</h4>
                                    <p className="text-xs text-muted-foreground">Receive payments directly to your MYOB account</p>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" disabled>
                                Coming soon
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
