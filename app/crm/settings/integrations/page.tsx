"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Mail, Calendar, Check, Loader2, Zap, X, FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { connectGoogleCalendar, connectXero, disconnectEmailIntegration, disconnectWorkspaceCalendarIntegration, getIntegrationConnectionReadiness, getIntegrationStatus } from "@/actions/integration-actions"
import { EmailLeadCaptureSettings } from "@/components/settings/email-lead-capture-settings"
import { LeadChannelsPanel } from "@/components/settings/lead-channels-panel"
import { WebformEmbedSection } from "@/components/settings/webform-embed-section"
import { useShellStore } from "@/lib/store"
import { formatDateTime } from "@/lib/format"

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
    const [workspaceId, setWorkspaceId] = useState<string | null>(null)
    const [showLeadChannelPrompt, setShowLeadChannelPrompt] = useState(false)
    const [loadingIntegrations, setLoadingIntegrations] = useState(true)
    const leadChannelsRef = useRef<HTMLDivElement | null>(null)
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
        const warning = searchParams.get("warning")
        if (!success && !error && !warning) return

        if (success === "gmail_connected" || success === "outlook_connected" || success === "xero_connected" || success === "google_calendar_connected") {
            toast.success(
                success === "xero_connected"
                    ? "Xero connected successfully!"
                    : success === "google_calendar_connected"
                        ? "Google Calendar connected successfully!"
                    : `${success === "gmail_connected" ? "Gmail" : "Outlook"} connected successfully!`
            )
            refreshIntegrationStatus()
            if ((success === "gmail_connected" || success === "outlook_connected") && searchParams.get("focus") === "lead_channels") {
                setShowLeadChannelPrompt(true)
                window.setTimeout(() => {
                    leadChannelsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                }, 200)
            }
        }
        if (warning) {
            toast.warning(`Connected, but background automation still needs attention: ${warning.replace(/_/g, " ")}`)
        }
        if (error) {
            toast.error(`Couldn't connect — ${error.replace(/_/g, " ")}. Please try again.`)
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
            setWorkspaceId(status.workspaceId)
            setEmailIntegrations(status.emailIntegrations)
            setXeroStatus(status.xeroConnected ? "connected" : "idle")
            setCalendarIntegration(status.calendarIntegration)
            setReadiness(nextReadiness)
        } catch {
            toast.error("Couldn't load integration status — please refresh.")
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
            toast.error("Couldn't start Google Calendar connection — please try again.")
        } catch {
            toast.error("Couldn't start Google Calendar connection — please try again.")
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
            toast.error("Couldn't disconnect Google Calendar — please try again.")
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
                toast.error(data.error || "Couldn't start the connection — please try again.")
            }
        } catch {
            toast.error("Couldn't start the email connection — please try again.")
        }
    }

    const handleDisconnectEmail = async (integrationId: string) => {
        try {
            await disconnectEmailIntegration(integrationId)
            toast.success("Email integration disconnected")
            setEmailIntegrations(prev => prev.filter(i => i.id !== integrationId))
        } catch {
            toast.error("Couldn't disconnect that email — please try again.")
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
                toast.error("Couldn't generate Xero authorization URL — please try again.")
                setXeroStatus("idle")
            }
        } catch {
            toast.error("Couldn't start Xero connection — please try again.")
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
                            <CardTitle>Lead capture — fastest setup (recommended)</CardTitle>
                        </div>
                        <CardDescription>
                            Connect Gmail or Outlook once and Earlymark picks up leads from hipages, Airtasker, Oneflare, Service Seeking and your website form automatically — no filters to set up.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-green-50/50 rounded-lg border border-green-100 flex gap-3 text-green-800 text-sm">
                            <Zap className="h-5 w-5 shrink-0 mt-0.5 text-green-600" />
                            <p>
                                <strong>Privacy:</strong> Earlymark only <strong>acts on</strong> emails from known lead senders (hipages, Airtasker, Oneflare, Google LSA, Meta Lead Ads, your website form). Personal email, billing and anything else is ignored and never stored. Want even tighter control? Use the forwarding alias in the <strong>Lead email forwarding</strong> section below — we then only ever see what you choose to forward.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Button
                                variant="outline"
                                className="h-auto py-4 px-6 flex flex-col items-center gap-2 hover:border-destructive/50 hover:bg-destructive/10 transition-all"
                                onClick={() => handleConnectEmail("gmail")}
                                disabled={!readiness.gmail.ready}
                                title={readiness.gmail.ready ? "Connect Gmail for lead capture" : readiness.gmail.reason}
                                aria-label={readiness.gmail.ready ? "Connect Gmail" : `Gmail unavailable: ${readiness.gmail.reason ?? "not configured"}`}
                            >
                                <Mail className="h-8 w-8 text-destructive" />
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

                        {emailIntegrations.length > 0 && (
                            <div className="rounded-md border p-4 text-sm" style={{ borderColor: "#E6E2D7", background: "#F6F4EE", color: "var(--color-ink)" }}>
                                <p className="font-medium">Inbox connected.</p>
                                <p className="mt-1">
                                    Next, scroll down to <span className="font-medium">Where your leads come from</span> to see what is live now and what still needs one more step on Google LSA, Meta, or your website.
                                </p>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="mt-3 hover:opacity-80" style={{ borderColor: "#E6E2D7" }}
                                    onClick={() => leadChannelsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                                >
                                    Show Lead Channels
                                </Button>
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
                                        <div key={integration.id} className="flex items-center justify-between gap-2 p-3 rounded-md border" style={{ borderColor: "#E6E2D7" }}>
                                            <div className="flex min-w-0 items-center gap-2">
                                                <div className={`w-2 h-2 shrink-0 rounded-full ${integration.isActive ? "bg-green-500" : "bg-muted-foreground"}`} />
                                                <span className="truncate text-sm font-medium">{integration.emailAddress}</span>
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

                <div id="lead-channels" ref={leadChannelsRef} className="space-y-3">
                    {showLeadChannelPrompt && (
                        <div className="rounded-md border p-4 text-sm" style={{ borderColor: "rgba(0,210,139,0.3)", background: "#E0FAF2", color: "var(--color-ink)" }}>
                            <p className="font-medium">Your inbox connection is live.</p>
                            <p className="mt-1">
                                This panel shows what Tracey can capture right now, where a platform still needs one more setup step, and where a lead path looks suspiciously quiet.
                            </p>
                        </div>
                    )}
                    <LeadChannelsPanel />
                </div>

                {workspaceId ? <WebformEmbedSection workspaceId={workspaceId} /> : null}

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
                            <div className="bg-muted p-4 rounded-full">
                                <Calendar className="h-8 w-8 text-blue-500" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="font-medium">Calendar Sync</h4>
                                <p className="text-sm text-muted-foreground">
                                    {calendarIntegration.connected
                                        ? `Connected${calendarIntegration.emailAddress ? ` as ${calendarIntegration.emailAddress}` : ""}. Tracey will use Google Calendar availability and sync scheduled jobs.`
                                        : "Not connected. Until you connect Google Calendar, Earlymark will only see jobs stored inside the app."}
                                </p>
                                {calendarIntegration.connected && calendarIntegration.lastSyncAt && (
                                    <p className="text-xs text-muted-foreground">
                                        Last sync: {formatDateTime(calendarIntegration.lastSyncAt)}
                                    </p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="border-t flex justify-between items-center px-6 py-4" style={{ background: "var(--color-paper)", borderColor: "#E6E2D7" }}>
                        <div className="text-xs text-muted-foreground">
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
                            Create draft invoices in Xero from the job-completion workflow so they are ready for review.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4">
                            <div className="bg-muted p-4 rounded-full">
                                <FileText className="h-8 w-8 text-[#13B5EA]" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="font-medium">Invoice Sync</h4>
                                <p className="text-sm text-muted-foreground">
                                    {xeroStatus === "connected"
                                        ? "Connected. The job-completion flow can create Xero draft invoices for review."
                                        : "Connect Xero to create draft invoices from the completion workflow."}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="border-t flex justify-between items-center px-6 py-4" style={{ background: "var(--color-paper)", borderColor: "#E6E2D7" }}>
                        {xeroStatus === "connected" ? (
                            <div className="flex items-center text-sm font-medium" style={{ color: "#00D28B" }}>
                                <Check className="h-4 w-4 mr-2" />
                                Xero Connected
                            </div>
                        ) : (
                            <div className="text-xs text-muted-foreground">
                                Xero draft invoices can be created from completed jobs for review.
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
                            <Badge className="border hover:opacity-80" style={{ borderColor: "rgba(0,210,139,0.3)", background: "#E0FAF2", color: "#00D28B" }}>
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
