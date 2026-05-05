"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Mail, Calendar, Check, Loader2, Zap, X, FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { connectGoogleCalendar, connectXero, disconnectEmailIntegration, disconnectWorkspaceCalendarIntegration, getIntegrationConnectionReadiness, getIntegrationStatus } from "@/actions/integration-actions"
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

interface IntegrationReadinessView {
    gmail: { ready: boolean; reason?: string }
    outlook: { ready: boolean; reason?: string }
    googleCalendar: { ready: boolean; reason?: string }
    xero: { ready: boolean; reason?: string }
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
    const [readiness, setReadiness] = useState<IntegrationReadinessView>({
        gmail: { ready: false, reason: "Checking Gmail setup..." },
        outlook: { ready: false, reason: "Checking Outlook setup..." },
        googleCalendar: { ready: false, reason: "Checking Google Calendar setup..." },
        xero: { ready: false, reason: "Checking Xero setup..." },
    })

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
        if (!success && !error) return

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
        router.replace("/crm/settings/integrations")
    }, [searchParams, router])

    const refreshIntegrationStatus = async () => {
        setLoadingIntegrations(true)
        try {
            const [status, nextReadiness] = await Promise.all([
                getIntegrationStatus(),
                getIntegrationConnectionReadiness(),
            ])
            setEmailIntegrations(status.emailIntegrations)
            setXeroStatus(status.xeroConnected ? "connected" : "idle")
            setCalendarIntegration(status.calendarIntegration)
            setReadiness(nextReadiness)
        } catch {
            toast.error("Failed to load integration status")
        } finally {
            setLoadingIntegrations(false)
        }
    }

    const handleConnectGoogleCalendar = async () => {
        if (!readiness.googleCalendar.ready) {
            toast.error(readiness.googleCalendar.reason || "Google Calendar is not configured yet.")
            return
        }
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
            const providerReadiness = readiness[provider]
            if (!providerReadiness.ready) {
                toast.error(providerReadiness.reason || "This integration is not configured yet.")
                return
            }
            const response = await fetch(`/api/auth/email-provider?provider=${provider}`)
            const data = await response.json()
            if (data.authUrl) {
                window.location.href = data.authUrl
            } else {
                toast.error(data.error || "Failed to generate authorization URL")
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
        if (!readiness.xero.ready) {
            toast.error(readiness.xero.reason || "Xero is not configured yet.")
            return
        }
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
                <h3 className="app-section-title">Integrations</h3>
                <p className="app-body-secondary">
                    Connect the tools Earlymark uses for lead capture, calendar sync, and invoicing.
                </p>
            </div>
            <Separator />

            <div className="grid gap-6">
                {/* Email Provider Integration */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Mail className="h-5 w-5 text-blue-500" />
                            <CardTitle>Lead capture</CardTitle>
                        </div>
                        <CardDescription>
                            Connect Gmail or Outlook so Earlymark can pick up lead emails automatically.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-green-50/50 rounded-lg border border-green-100 flex gap-3 text-green-800 text-sm">
                            <Zap className="h-5 w-5 shrink-0 mt-0.5 text-green-600" />
                            <p>
                                <strong>How it works:</strong> Connect once and Earlymark will sort incoming lead emails for you automatically.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Button
                                variant="outline"
                                className="h-auto py-4 px-6 flex flex-col items-center gap-2 hover:border-red-500/50 hover:bg-red-50/50 transition-all"
                                onClick={() => handleConnectEmail("gmail")}
                                disabled={!readiness.gmail.ready}
                                title={readiness.gmail.ready ? "Connect Gmail for lead capture" : readiness.gmail.reason}
                                aria-label={readiness.gmail.ready ? "Connect Gmail" : `Gmail unavailable: ${readiness.gmail.reason ?? "not configured"}`}
                            >
                                <Mail className="h-8 w-8 text-red-500" />
                                <div className="text-center">
                                    <div className="font-medium">Connect Gmail</div>
                                    <div className="text-xs text-muted-foreground">Use Gmail for lead emails</div>
                                </div>
                            </Button>

                            <Button
                                variant="outline"
                                className="h-auto py-4 px-6 flex flex-col items-center gap-2 hover:border-blue-500/50 hover:bg-blue-50/50 transition-all"
                                onClick={() => handleConnectEmail("outlook")}
                                disabled={!readiness.outlook.ready}
                                title={readiness.outlook.ready ? "Connect Outlook for lead capture" : readiness.outlook.reason}
                                aria-label={readiness.outlook.ready ? "Connect Outlook" : `Outlook unavailable: ${readiness.outlook.reason ?? "not configured"}`}
                            >
                                <Mail className="h-8 w-8 text-blue-500" />
                                <div className="text-center">
                                    <div className="font-medium">Connect Outlook</div>
                                    <div className="text-xs text-muted-foreground">Use Outlook for lead emails</div>
                                </div>
                            </Button>
                        </div>
                        {(!readiness.gmail.ready || !readiness.outlook.ready) && (
                            <div className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                                {!readiness.gmail.ready && (
                                    <p>Gmail: {readiness.gmail.reason}</p>
                                )}
                                {!readiness.outlook.ready && (
                                    <p>Outlook: {readiness.outlook.reason}</p>
                                )}
                            </div>
                        )}

                        {loadingIntegrations ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading connected email accounts...
                            </div>
                        ) : emailIntegrations.length > 0 && (
                            <div className="space-y-2 pt-2">
                                <label className="text-sm font-medium">Connected email accounts</label>
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
                            Connect Google Calendar so Tracey can see availability and keep scheduled jobs in sync.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4">
                            <div className="bg-slate-100 p-4 rounded-full">
                                <Calendar className="h-8 w-8 text-blue-500" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="font-medium">Calendar Sync</h4>
                                <p className="text-sm text-slate-500">
                                    {calendarIntegration.connected
                                        ? `Connected${calendarIntegration.emailAddress ? ` as ${calendarIntegration.emailAddress}` : ""}. Tracey will use Google Calendar availability and sync scheduled jobs.`
                                        : "Not connected. Until you connect Google Calendar, Earlymark will only see jobs stored inside the app."}
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
                            Keep your calendar and scheduled jobs in sync.
                        </div>
                        {calendarIntegration.connected ? (
                            <Button variant="outline" onClick={handleDisconnectGoogleCalendar} disabled={calendarLoading}>
                                {calendarLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                Disconnect
                            </Button>
                        ) : (
                            <Button
                                onClick={handleConnectGoogleCalendar}
                                disabled={calendarLoading || !readiness.googleCalendar.ready}
                                title={readiness.googleCalendar.ready ? "Start Google Calendar connection" : readiness.googleCalendar.reason}
                                aria-label={
                                    readiness.googleCalendar.ready
                                        ? "Connect Google Calendar"
                                        : `Google Calendar unavailable: ${readiness.googleCalendar.reason ?? "not configured"}`
                                }
                            >
                                {calendarLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                Connect Google Calendar
                            </Button>
                        )}
                    </CardFooter>
                    {!calendarIntegration.connected && !readiness.googleCalendar.ready && (
                        <div className="px-6 pb-4 text-xs text-amber-700">
                            {readiness.googleCalendar.reason}
                        </div>
                    )}
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-[#13B5EA]" />
                            Xero Accounting
                        </CardTitle>
                        <CardDescription>
                            Create draft invoices in Xero automatically when jobs are ready to invoice.
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
                                        : "Connect Xero to create draft invoices automatically."}
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
                                Draft invoices will be created in Xero for you to review.
                            </div>
                        )}

                        {xeroStatus === "idle" && (
                            <Button
                                onClick={handleConnectXero}
                                disabled={!readiness.xero.ready}
                                title={readiness.xero.ready ? "Start Xero connection" : readiness.xero.reason}
                                aria-label={
                                    readiness.xero.ready ? "Connect Xero" : `Xero unavailable: ${readiness.xero.reason ?? "not configured"}`
                                }
                            >
                                Connect Xero
                            </Button>
                        )}
                        {xeroStatus === "connecting" && (
                            <Button disabled>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Connecting...
                            </Button>
                        )}
                        {xeroStatus === "connected" ? (
                            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                                Connected
                            </Badge>
                        ) : null}
                    </CardFooter>
                    {xeroStatus !== "connected" && !readiness.xero.ready && (
                        <div className="px-6 pb-4 text-xs text-amber-700">
                            {readiness.xero.reason}
                        </div>
                    )}
                </Card>

            </div>
        </div>
    )
}
