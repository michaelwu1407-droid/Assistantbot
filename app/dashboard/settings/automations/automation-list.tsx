"use client"

import { useState } from "react"
import { AutomationView, toggleAutomation, createAutomation } from "@/actions/automation-actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Plus, Zap, ArrowRight, Bell, CheckSquare, Mail } from "lucide-react"
import { toast } from "sonner"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

interface AutomationListProps {
    initialAutomations: AutomationView[]
    workspaceId: string
}

export function AutomationList({ initialAutomations, workspaceId }: AutomationListProps) {
    const [automations, setAutomations] = useState(initialAutomations)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    // Form State
    const [name, setName] = useState("")
    const [triggerEvent, setTriggerEvent] = useState<string>("new_lead")
    const [actionType, setActionType] = useState<string>("notify")
    const [message, setMessage] = useState("")

    const handleToggle = async (id: string, current: boolean) => {
        // Optimistic update
        setAutomations(prev => prev.map(a => a.id === id ? { ...a, enabled: !current } : a))

        try {
            await toggleAutomation(id)
            toast.success(current ? "Automation paused" : "Automation enabled")
        } catch {
            setAutomations(prev => prev.map(a => a.id === id ? { ...a, enabled: current } : a)) // Revert
            toast.error("Failed to update status")
        }
    }

    const handleCreate = async () => {
        if (!name || !triggerEvent || !actionType) return

        setIsLoading(true)
        try {
            // Map simple form to complex JSON structure
            const trigger: any = { event: triggerEvent }
            if (triggerEvent === "deal_stale") trigger.threshold_days = 7
            if (triggerEvent === "task_overdue") trigger.threshold_days = 2

            const action: any = { type: actionType, message: message || "Automated Action" }

            const res = await createAutomation({
                name,
                workspaceId,
                trigger,
                action
            })

            if (res.success) {
                toast.success("Automation created")
                setIsCreateOpen(false)
                // In a real app we'd re-fetch, but for now we'll reload or just wait for next visit
                window.location.reload()
            } else {
                toast.error(res.error || "Failed to create")
            }
        } catch (e) {
            console.error(e)
            toast.error("Something went wrong")
        } finally {
            setIsLoading(false)
        }
    }

    const getTriggerIcon = (event: string) => {
        switch (event) {
            case "new_lead": return <Zap className="h-4 w-4 text-emerald-500" />
            case "deal_stale": return <Zap className="h-4 w-4 text-amber-500" />
            default: return <Zap className="h-4 w-4 text-blue-500" />
        }
    }

    const getActionIcon = (type: string) => {
        switch (type) {
            case "notify": return <Bell className="h-4 w-4 text-slate-500" />
            case "create_task": return <CheckSquare className="h-4 w-4 text-blue-500" />
            case "email": return <Mail className="h-4 w-4 text-purple-500" />
            default: return <ArrowRight className="h-4 w-4" />
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                    {automations.filter(a => a.enabled).length} Active Rules
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            New Rule
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Create Automation</DialogTitle>
                            <DialogDescription>
                                Set up a trigger and an action.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Rule Name</Label>
                                <Input
                                    placeholder="e.g. New Lead Alert"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>If (Trigger)</Label>
                                    <Select value={triggerEvent} onValueChange={setTriggerEvent}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="new_lead">New Lead Created</SelectItem>
                                            <SelectItem value="deal_stale">Deal is Stale (7 days)</SelectItem>
                                            <SelectItem value="task_overdue">Task Overdue</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Then (Action)</Label>
                                    <Select value={actionType} onValueChange={setActionType}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="notify">Send Browser Notification</SelectItem>
                                            <SelectItem value="create_task">Create Follow-up Task</SelectItem>
                                            {/* <SelectItem value="email">Send Email (Stub)</SelectItem> */}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label>Action Details</Label>
                                <Input
                                    placeholder="Notification or Task message..."
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreate} disabled={isLoading}>
                                {isLoading ? "Creating..." : "Create Rule"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4">
                {automations.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                        <Zap className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                        <h3 className="font-medium text-slate-900">No automations yet</h3>
                        <p className="text-sm text-slate-500">Create your first rule to save time.</p>
                    </div>
                ) : (
                    automations.map(automation => (
                        <Card key={automation.id} className="flex flex-row items-center p-4 gap-4">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center bg-slate-100 ${automation.enabled ? 'opacity-100' : 'opacity-50 grayscale'}`}>
                                {getTriggerIcon(automation.trigger.event)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h4 className={`font-medium truncate ${automation.enabled ? 'text-slate-900' : 'text-slate-500'}`}>
                                        {automation.name}
                                    </h4>
                                    {automation.lastFiredAt && (
                                        <Badge variant="outline" className="text-[10px] h-5">
                                            Fired {new Date(automation.lastFiredAt).toLocaleDateString()}
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex items-center text-xs text-slate-500 gap-2 mt-0.5">
                                    <span className="flex items-center gap-1">
                                        If {automation.trigger.event.replace('_', ' ')}
                                    </span>
                                    <ArrowRight className="h-3 w-3" />
                                    <span className="flex items-center gap-1">
                                        {getActionIcon(automation.action.type)}
                                        {automation.action.type.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>
                            <Switch
                                checked={automation.enabled}
                                onCheckedChange={(checked) => handleToggle(automation.id, checked)}
                            />
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
