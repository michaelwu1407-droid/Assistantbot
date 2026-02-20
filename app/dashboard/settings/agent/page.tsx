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
import { Bot, Clock, Bell, Brain, DollarSign } from "lucide-react"
import { getWorkspaceSettings, updateWorkspaceSettings } from "@/actions/settings-actions"

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
        autoUpdateGlossary: true
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
                        callOutFee: data.callOutFee || 0,
                        aiPreferences: data.aiPreferences || "",
                        autoUpdateGlossary: data.autoUpdateGlossary ?? true
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
