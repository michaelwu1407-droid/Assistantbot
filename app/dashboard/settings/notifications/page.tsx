"use client"

import { useEffect, useState } from "react"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, MessageSquare, Loader2, Bot, Pencil } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    getNotificationPreferences,
    saveNotificationPreferences,
    type NotificationPreferences,
} from "@/actions/notification-actions"
import {
    getAutomatedMessageRules,
    updateAutomatedMessageRule,
    type AutomatedMessageRuleView,
} from "@/actions/automated-message-actions"
import { toast } from "sonner"

export default function NotificationsSettingsPage() {
    const [prefs, setPrefs] = useState<NotificationPreferences | null>(null)
    const [saving, setSaving] = useState(false)
    const [rules, setRules] = useState<AutomatedMessageRuleView[]>([])
    const [rulesLoading, setRulesLoading] = useState(true)
    const [editingRule, setEditingRule] = useState<AutomatedMessageRuleView | null>(null)
    const [editTemplate, setEditTemplate] = useState("")
    const [editChannel, setEditChannel] = useState("sms")

    useEffect(() => {
        getNotificationPreferences().then(setPrefs).catch(() => {
            setPrefs({
                emailDealUpdates: true,
                emailNewContacts: true,
                emailWeeklySummary: true,
                inAppTaskReminders: true,
                inAppStaleDealAlerts: true,
            })
        })

        getAutomatedMessageRules().then(setRules).finally(() => setRulesLoading(false))
    }, [])

    const updatePref = async (key: keyof NotificationPreferences, value: boolean) => {
        if (!prefs) return
        const updated = { ...prefs, [key]: value }
        setPrefs(updated)
        setSaving(true)
        try {
            await saveNotificationPreferences(updated)
            toast.success("Notification preferences saved")
        } catch {
            toast.error("Failed to save preferences")
            setPrefs(prefs)
        } finally {
            setSaving(false)
        }
    }

    const handleToggleRule = async (rule: AutomatedMessageRuleView) => {
        const updated = !rule.enabled
        setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, enabled: updated } : r))
        try {
            await updateAutomatedMessageRule(rule.id, { enabled: updated })
            toast.success(updated ? "Rule enabled" : "Rule disabled")
        } catch {
            setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, enabled: rule.enabled } : r))
            toast.error("Failed to update rule")
        }
    }

    const handleSaveRuleEdit = async () => {
        if (!editingRule) return
        setSaving(true)
        try {
            await updateAutomatedMessageRule(editingRule.id, {
                messageTemplate: editTemplate,
                channel: editChannel,
            })
            setRules((prev) => prev.map((r) => r.id === editingRule.id ? { ...r, messageTemplate: editTemplate, channel: editChannel } : r))
            toast.success("Message template saved")
            setEditingRule(null)
        } catch {
            toast.error("Failed to save template")
        } finally {
            setSaving(false)
        }
    }

    const getTriggerLabel = (type: string) => {
        switch (type) {
            case "booking_reminder_24h": return "24h Before Booking"
            case "booking_confirmation": return "On Booking Confirmed"
            case "follow_up_after_job": return "24h After Job Complete"
            default: return type
        }
    }

    if (!prefs) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">Notifications</h3>
                    <p className="text-sm text-muted-foreground">
                        Configure how you receive notifications.
                    </p>
                </div>
                {saving && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" /> Saving...
                    </span>
                )}
            </div>
            <Separator />

            <div className="space-y-4">
                {/* Automated Communication Rules */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bot className="h-5 w-5" />
                            Automated Communication
                        </CardTitle>
                        <CardDescription>
                            Set rules for automated text messages and emails sent by the AI agent. The agent will auto-send
                            confirmations and reminders based on these rules.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {rulesLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                        ) : rules.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No automated rules configured yet.
                            </p>
                        ) : (
                            rules.map((rule) => (
                                <div key={rule.id} className="flex items-start justify-between p-4 rounded-xl border bg-slate-50/50">
                                    <div className="space-y-1 flex-1 mr-4">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm">{rule.name}</span>
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                                                {getTriggerLabel(rule.triggerType)}
                                            </span>
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                                                {rule.channel.toUpperCase()}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-2 max-w-lg">
                                            {rule.messageTemplate}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => {
                                                setEditingRule(rule)
                                                setEditTemplate(rule.messageTemplate)
                                                setEditChannel(rule.channel)
                                            }}
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Switch
                                            checked={rule.enabled}
                                            onCheckedChange={() => handleToggleRule(rule)}
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                        <p className="text-xs text-muted-foreground">
                            Available template variables: {"{{clientName}}"}, {"{{jobTitle}}"}, {"{{scheduledTime}}"}, {"{{businessName}}"}
                        </p>
                    </CardContent>
                </Card>

                {/* Email Notifications */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Mail className="h-5 w-5" />
                            Email Notifications
                        </CardTitle>
                        <CardDescription>
                            Choose what emails you want to receive.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Deal Updates</Label>
                                <p className="text-sm text-muted-foreground">Get notified when deals are updated</p>
                            </div>
                            <Switch
                                checked={prefs.emailDealUpdates}
                                onCheckedChange={(v) => updatePref("emailDealUpdates", v)}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>New Contacts</Label>
                                <p className="text-sm text-muted-foreground">Get notified when new contacts are added</p>
                            </div>
                            <Switch
                                checked={prefs.emailNewContacts}
                                onCheckedChange={(v) => updatePref("emailNewContacts", v)}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Weekly Summary</Label>
                                <p className="text-sm text-muted-foreground">Receive a weekly summary of your pipeline</p>
                            </div>
                            <Switch
                                checked={prefs.emailWeeklySummary}
                                onCheckedChange={(v) => updatePref("emailWeeklySummary", v)}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* In-App Notifications */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5" />
                            In-App Notifications
                        </CardTitle>
                        <CardDescription>
                            Control what notifications appear in the app.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Task Reminders</Label>
                                <p className="text-sm text-muted-foreground">Show reminders for upcoming tasks</p>
                            </div>
                            <Switch
                                checked={prefs.inAppTaskReminders}
                                onCheckedChange={(v) => updatePref("inAppTaskReminders", v)}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Stale Deal Alerts</Label>
                                <p className="text-sm text-muted-foreground">Alert when deals need attention</p>
                            </div>
                            <Switch
                                checked={prefs.inAppStaleDealAlerts}
                                onCheckedChange={(v) => updatePref("inAppStaleDealAlerts", v)}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Edit Rule Dialog */}
            <Dialog open={!!editingRule} onOpenChange={(open) => !open && setEditingRule(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit {editingRule?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Channel</Label>
                            <Select value={editChannel} onValueChange={setEditChannel}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="sms">SMS</SelectItem>
                                    <SelectItem value="email">Email</SelectItem>
                                    <SelectItem value="both">Both</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Message Template</Label>
                            <Textarea
                                value={editTemplate}
                                onChange={(e) => setEditTemplate(e.target.value)}
                                rows={5}
                                className="font-mono text-sm"
                            />
                            <p className="text-xs text-muted-foreground">
                                Variables: {"{{clientName}}"}, {"{{jobTitle}}"}, {"{{scheduledTime}}"}, {"{{businessName}}"}
                            </p>
                        </div>
                        <Button onClick={handleSaveRuleEdit} className="w-full" disabled={saving}>
                            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : "Save Changes"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
