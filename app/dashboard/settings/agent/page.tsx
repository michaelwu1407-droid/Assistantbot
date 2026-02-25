"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { Bot, Clock, Bell, Brain, DollarSign, MessageSquare, Phone, Send, FileText } from "lucide-react"
import { getWorkspaceSettings, updateWorkspaceSettings } from "@/actions/settings-actions"

const defaultSoftChase = { message: "Hi, just following up on our recent conversation. Let me know if you'd like to move forward.", triggerDays: 3, channel: "sms" as "sms" | "email" }
const defaultInvoiceFollowUp = { message: "This is a friendly reminder that your invoice is still outstanding. Please let us know if you have any questions.", triggerDays: 7, channel: "email" as "sms" | "email" }

export default function AgentSettingsPage() {
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [settings, setSettings] = useState({
        agentMode: "ORGANIZE",
        workingHoursStart: "08:00",
        workingHoursEnd: "17:00",
        agendaNotifyTime: "07:30",
        wrapupNotifyTime: "17:30",
        callOutFee: 0,
        aiPreferences: "",
        autoUpdateGlossary: true,
        agentScriptStyle: "opening" as "opening" | "closing",
        agentBusinessName: "",
        textAllowedStart: "08:00",
        textAllowedEnd: "20:00",
        callAllowedStart: "08:00",
        callAllowedEnd: "20:00",
        softChase: defaultSoftChase,
        invoiceFollowUp: defaultInvoiceFollowUp,
    })

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await getWorkspaceSettings()
                if (data) {
                    setSettings({
                        agentMode: data.agentMode || "ORGANIZE",
                        workingHoursStart: data.workingHoursStart || "08:00",
                        workingHoursEnd: data.workingHoursEnd || "17:00",
                        agendaNotifyTime: data.agendaNotifyTime || "07:30",
                        wrapupNotifyTime: data.wrapupNotifyTime || "17:30",
                        callOutFee: data.callOutFee ?? 0,
                        aiPreferences: data.aiPreferences || "",
                        autoUpdateGlossary: data.autoUpdateGlossary ?? true,
                        agentScriptStyle: (data.agentScriptStyle === "closing" ? "closing" : "opening") as "opening" | "closing",
                        agentBusinessName: data.agentBusinessName ?? "",
                        textAllowedStart: data.textAllowedStart ?? "08:00",
                        textAllowedEnd: data.textAllowedEnd ?? "20:00",
                        callAllowedStart: data.callAllowedStart ?? "08:00",
                        callAllowedEnd: data.callAllowedEnd ?? "20:00",
                        softChase: {
                            message: data.softChase?.message ?? defaultSoftChase.message,
                            triggerDays: data.softChase?.triggerDays ?? defaultSoftChase.triggerDays,
                            channel: (data.softChase?.channel as "sms" | "email") ?? defaultSoftChase.channel,
                        },
                        invoiceFollowUp: {
                            message: data.invoiceFollowUp?.message ?? defaultInvoiceFollowUp.message,
                            triggerDays: data.invoiceFollowUp?.triggerDays ?? defaultInvoiceFollowUp.triggerDays,
                            channel: (data.invoiceFollowUp?.channel as "sms" | "email") ?? defaultInvoiceFollowUp.channel,
                        },
                    })
                }
            } catch (error) {
                console.error("Failed to fetch settings", error)
            } finally {
                setIsLoading(false)
            }
        }
        fetchSettings()
    }, [])

    const handleSave = async () => {
        setIsSaving(true)
        try {
            await updateWorkspaceSettings(settings)
            toast.success("Agent settings saved successfully.")
        } catch (error) {
            toast.error("Failed to save agent settings.")
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading settings...</div>
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Agent Capabilities</h3>
                <p className="text-sm text-muted-foreground">
                    Configure how much autonomy your AI assistant has, and its active hours.
                </p>
            </div>

            {/* Agent Autonomy Mode */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Bot className="h-5 w-5 text-indigo-500" />
                        <CardTitle>Autonomy Mode</CardTitle>
                    </div>
                    <CardDescription>
                        Determine how the AI handles inbound requests from clients.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <RadioGroup
                        value={settings.agentMode}
                        onValueChange={(val) => setSettings({ ...settings, agentMode: val })}
                        className="flex flex-col space-y-3"
                    >
                        <Label htmlFor="mode-execute" className="flex flex-col gap-1.5 cursor-pointer rounded-lg border p-4 hover:bg-slate-50 transition-colors [&:has([data-state=checked])]:bg-indigo-50 [&:has([data-state=checked])]:border-indigo-200">
                            <div className="flex items-center gap-2">
                                <RadioGroupItem value="EXECUTE" id="mode-execute" />
                                <span className="font-semibold text-slate-900">Execute (Full Autonomy)</span>
                            </div>
                            <span className="text-sm text-slate-500 ml-6">
                                Agent quotes and books returning clients directly, slotting them into your calendar automatically based on smart routing.
                            </span>
                        </Label>

                        <Label htmlFor="mode-organize" className="flex flex-col gap-1.5 cursor-pointer rounded-lg border p-4 hover:bg-slate-50 transition-colors [&:has([data-state=checked])]:bg-indigo-50 [&:has([data-state=checked])]:border-indigo-200">
                            <div className="flex items-center gap-2">
                                <RadioGroupItem value="ORGANIZE" id="mode-organize" />
                                <span className="font-semibold text-slate-900">Organize (Liaise & Draft)</span>
                            </div>
                            <span className="text-sm text-slate-500 ml-6">
                                Agent will propose times to the customer and create a "Draft" job card for you. It requires your manual confirmation before finalizing.
                            </span>
                        </Label>

                        <Label htmlFor="mode-filter" className="flex flex-col gap-1.5 cursor-pointer rounded-lg border p-4 hover:bg-slate-50 transition-colors [&:has([data-state=checked])]:bg-indigo-50 [&:has([data-state=checked])]:border-indigo-200">
                            <div className="flex items-center gap-2">
                                <RadioGroupItem value="FILTER" id="mode-filter" />
                                <span className="font-semibold text-slate-900">Filter (Info-Only)</span>
                            </div>
                            <span className="text-sm text-slate-500 ml-6">
                                Agent acts as a reception desk. It extracts details from the message, answers questions, but makes no scheduling decisions.
                            </span>
                        </Label>
                    </RadioGroup>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Working Hours */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-emerald-500" />
                            <CardTitle>Working Hours</CardTitle>
                        </div>
                        <CardDescription>
                            The AI will only schedule jobs within this window.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="start">Start Time</Label>
                            <Input
                                id="start"
                                type="time"
                                value={settings.workingHoursStart}
                                onChange={(e) => setSettings({ ...settings, workingHoursStart: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="end">End Time</Label>
                            <Input
                                id="end"
                                type="time"
                                value={settings.workingHoursEnd}
                                onChange={(e) => setSettings({ ...settings, workingHoursEnd: e.target.value })}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Notifications */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Bell className="h-5 w-5 text-amber-500" />
                            <CardTitle>Daily Agenda Notify</CardTitle>
                        </div>
                        <CardDescription>
                            When the AI should notify you with your daily summary.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="agenda">Morning Agenda Outline</Label>
                            <Input
                                id="agenda"
                                type="time"
                                value={settings.agendaNotifyTime}
                                onChange={(e) => setSettings({ ...settings, agendaNotifyTime: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="wrapup">Evening Wrap-Up & Overdue</Label>
                            <Input
                                id="wrapup"
                                type="time"
                                value={settings.wrapupNotifyTime}
                                onChange={(e) => setSettings({ ...settings, wrapupNotifyTime: e.target.value })}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Agent script: opening vs closing + business name */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-blue-500" />
                        <CardTitle>Agent Introduction</CardTitle>
                    </div>
                    <CardDescription>
                        How Travis introduces itself in messages and calls. Use either an opening line or a sign-off, not both.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Business name (for &quot;AI assistant for [x]&quot;)</Label>
                        <Input
                            placeholder="e.g. Acme Plumbing"
                            value={settings.agentBusinessName}
                            onChange={(e) => setSettings({ ...settings, agentBusinessName: e.target.value })}
                        />
                    </div>
                    <RadioGroup
                        value={settings.agentScriptStyle}
                        onValueChange={(val: "opening" | "closing") => setSettings({ ...settings, agentScriptStyle: val })}
                        className="flex flex-col space-y-2"
                    >
                        <Label className="flex items-center gap-2 cursor-pointer rounded-lg border p-3 hover:bg-slate-50 [&:has([data-state=checked])]:bg-blue-50 [&:has([data-state=checked])]:border-blue-200">
                            <RadioGroupItem value="opening" />
                            <span>Start with: &quot;Hi I&apos;m Travis, the AI assistant for [business]&quot;</span>
                        </Label>
                        <Label className="flex items-center gap-2 cursor-pointer rounded-lg border p-3 hover:bg-slate-50 [&:has([data-state=checked])]:bg-blue-50 [&:has([data-state=checked])]:border-blue-200">
                            <RadioGroupItem value="closing" />
                            <span>End with: &quot;Kind regards, Travis (AI assistant for [business])&quot;</span>
                        </Label>
                    </RadioGroup>
                </CardContent>
            </Card>

            {/* Allowed times: text and call */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Phone className="h-5 w-5 text-emerald-500" />
                        <CardTitle>When Travis Can Text & Call</CardTitle>
                    </div>
                    <CardDescription>
                        Set the time windows when the agent is allowed to send texts and place calls. Outside these times it will not initiate messages or calls.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Text allowed (from – to)
                        </Label>
                        <div className="flex items-center gap-2">
                            <Input
                                type="time"
                                value={settings.textAllowedStart}
                                onChange={(e) => setSettings({ ...settings, textAllowedStart: e.target.value })}
                            />
                            <span className="text-muted-foreground">to</span>
                            <Input
                                type="time"
                                value={settings.textAllowedEnd}
                                onChange={(e) => setSettings({ ...settings, textAllowedEnd: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            Call allowed (from – to)
                        </Label>
                        <div className="flex items-center gap-2">
                            <Input
                                type="time"
                                value={settings.callAllowedStart}
                                onChange={(e) => setSettings({ ...settings, callAllowedStart: e.target.value })}
                            />
                            <span className="text-muted-foreground">to</span>
                            <Input
                                type="time"
                                value={settings.callAllowedEnd}
                                onChange={(e) => setSettings({ ...settings, callAllowedEnd: e.target.value })}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Soft Chase */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Send className="h-5 w-5 text-amber-500" />
                        <CardTitle>Soft Chase (Lead Follow-up)</CardTitle>
                    </div>
                    <CardDescription>
                        Default follow-up for new leads not yet converted. Travis sends this by email or text after the chosen delay.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Follow-up message</Label>
                        <Textarea
                            rows={3}
                            placeholder="e.g. Hi, just following up..."
                            value={settings.softChase.message}
                            onChange={(e) => setSettings({ ...settings, softChase: { ...settings.softChase, message: e.target.value } })}
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="space-y-2">
                            <Label>Send after (days)</Label>
                            <Input
                                type="number"
                                min={1}
                                value={settings.softChase.triggerDays}
                                onChange={(e) => setSettings({ ...settings, softChase: { ...settings.softChase, triggerDays: parseInt(e.target.value, 10) || 3 } })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Channel</Label>
                            <select
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                                value={settings.softChase.channel}
                                onChange={(e) => setSettings({ ...settings, softChase: { ...settings.softChase, channel: e.target.value as "email" | "sms" } })}
                            >
                                <option value="sms">Text (SMS)</option>
                                <option value="email">Email</option>
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Unpaid Invoice Follow-up */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-slate-600" />
                        <CardTitle>Unpaid Invoice Follow-up</CardTitle>
                    </div>
                    <CardDescription>
                        Automatic follow-up for unpaid invoices. Set the message and how many days after the invoice to send it.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Follow-up message</Label>
                        <Textarea
                            rows={3}
                            placeholder="e.g. Friendly reminder that your invoice is outstanding..."
                            value={settings.invoiceFollowUp.message}
                            onChange={(e) => setSettings({ ...settings, invoiceFollowUp: { ...settings.invoiceFollowUp, message: e.target.value } })}
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="space-y-2">
                            <Label>Send after (days)</Label>
                            <Input
                                type="number"
                                min={1}
                                value={settings.invoiceFollowUp.triggerDays}
                                onChange={(e) => setSettings({ ...settings, invoiceFollowUp: { ...settings.invoiceFollowUp, triggerDays: parseInt(e.target.value, 10) || 7 } })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Channel</Label>
                            <select
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                                value={settings.invoiceFollowUp.channel}
                                onChange={(e) => setSettings({ ...settings, invoiceFollowUp: { ...settings.invoiceFollowUp, channel: e.target.value as "email" | "sms" } })}
                            >
                                <option value="email">Email</option>
                                <option value="sms">Text (SMS)</option>
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* AI Preferences & Memory */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Brain className="h-5 w-5 text-purple-500" />
                            <CardTitle>AI Behavioral Logic</CardTitle>
                        </div>
                        <CardDescription>
                            Custom rules the AI has learned from your conversations. You can edit these directly.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="preferences">Learned Rules</Label>
                            <Textarea
                                id="preferences"
                                rows={6}
                                placeholder="e.g. Always schedule 30min gap between jobs..."
                                value={settings.aiPreferences}
                                onChange={(e) => setSettings({ ...settings, aiPreferences: e.target.value })}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Pricing & Billing Settings */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-emerald-600" />
                            <CardTitle>Pricing Strategy</CardTitle>
                        </div>
                        <CardDescription>
                            Configure standard call-out fees and machine-learning pricing.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="callout">Standard Call-Out Fee</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="callout"
                                    type="number"
                                    className="pl-8"
                                    value={settings.callOutFee}
                                    onChange={(e) => setSettings({ ...settings, callOutFee: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                The AI will quote this price for generic jobs before scheduling.
                            </p>
                        </div>
                        <div className="flex items-center justify-between space-x-2">
                            <div>
                                <Label className="text-sm font-medium">Auto-Optimize Glossary</Label>
                                <p className="text-xs text-muted-foreground mt-1">
                                    When you finalize an invoice, the AI automatically learns that confirmed price and updates its estimation engine for future jobs.
                                </p>
                            </div>
                            <Switch
                                checked={settings.autoUpdateGlossary}
                                onCheckedChange={(checked) => setSettings({ ...settings, autoUpdateGlossary: checked })}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-end pt-4">
                <Button onClick={handleSave} disabled={isSaving} className="w-full md:w-auto min-w-[150px]">
                    {isSaving ? "Saving..." : "Save Configuration"}
                </Button>
            </div>
        </div>
    )
}
