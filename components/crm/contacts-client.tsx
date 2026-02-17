"use client"

import { useState, useMemo } from "react"
import { ContactView } from "@/actions/contact-actions"
import { sendBulkSMS } from "@/actions/messaging-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Send, Filter, X, Clock, AlertTriangle, Undo2 } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface ContactsClientProps {
    contacts: ContactView[]
}

type FilterPreset = "all" | "service_due" | "stale_30" | "win_back"

const FILTER_LABELS: Record<FilterPreset, { label: string; icon: React.ReactNode; description: string }> = {
    all: { label: "All", icon: null, description: "All contacts" },
    service_due: { label: "Service Due", icon: <Clock className="w-3.5 h-3.5" />, description: "Last activity 10-14 months ago" },
    stale_30: { label: "Stale > 30d", icon: <AlertTriangle className="w-3.5 h-3.5" />, description: "No activity in 30+ days" },
    win_back: { label: "Win-Back", icon: <Undo2 className="w-3.5 h-3.5" />, description: "No activity in 24+ months" },
}

export function ContactsClient({ contacts }: ContactsClientProps) {
    const [search, setSearch] = useState("")
    const [filter, setFilter] = useState<FilterPreset>("all")
    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [bulkMessage, setBulkMessage] = useState("")
    const [showBulkModal, setShowBulkModal] = useState(false)
    const [sending, setSending] = useState(false)

    const now = Date.now()

    const filtered = useMemo(() => {
        let result = contacts

        // Search
        if (search) {
            const q = search.toLowerCase()
            result = result.filter(c =>
                c.name.toLowerCase().includes(q) ||
                c.email?.toLowerCase().includes(q) ||
                c.phone?.includes(q) ||
                c.company?.toLowerCase().includes(q)
            )
        }

        // Preset filters
        if (filter === "service_due") {
            result = result.filter(c => {
                if (!c.lastActivityDate) return false
                const months = (now - new Date(c.lastActivityDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
                return months >= 10 && months <= 14
            })
        } else if (filter === "stale_30") {
            result = result.filter(c => {
                if (!c.lastActivityDate) return true
                const days = (now - new Date(c.lastActivityDate).getTime()) / (1000 * 60 * 60 * 24)
                return days > 30
            })
        } else if (filter === "win_back") {
            result = result.filter(c => {
                if (!c.lastActivityDate) return true
                const months = (now - new Date(c.lastActivityDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
                return months >= 24
            })
        }

        return result
    }, [contacts, search, filter, now])

    const toggleSelect = (id: string) => {
        const next = new Set(selected)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        setSelected(next)
    }

    const selectAll = () => {
        if (selected.size === filtered.length) {
            setSelected(new Set())
        } else {
            setSelected(new Set(filtered.map(c => c.id)))
        }
    }

    const handleBulkSMS = async () => {
        if (!bulkMessage.trim() || selected.size === 0) return
        setSending(true)
        try {
            const result = await sendBulkSMS(Array.from(selected), bulkMessage)
            toast.success(`Sent ${result.sent} SMS. ${result.failed} failed.`)
            if (result.errors.length > 0) {
                toast.error(result.errors.slice(0, 3).join(", "))
            }
            setShowBulkModal(false)
            setBulkMessage("")
            setSelected(new Set())
        } catch {
            toast.error("Failed to send bulk SMS")
        } finally {
            setSending(false)
        }
    }

    const getDaysAgo = (date: Date | null) => {
        if (!date) return "Never"
        const days = Math.floor((now - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
        if (days === 0) return "Today"
        if (days === 1) return "Yesterday"
        if (days < 30) return `${days}d ago`
        if (days < 365) return `${Math.floor(days / 30)}mo ago`
        return `${Math.floor(days / 365)}yr ago`
    }

    return (
        <div className="p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
                {selected.size > 0 && (
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-500">{selected.size} selected</span>
                        <Button
                            size="sm"
                            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => setShowBulkModal(true)}
                        >
                            <Send className="w-3.5 h-3.5" />
                            Send SMS
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelected(new Set())}
                        >
                            <X className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                )}
            </div>

            {/* Filter Bar */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search contacts..."
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-1.5">
                    <Filter className="w-4 h-4 text-slate-400" />
                    {(Object.keys(FILTER_LABELS) as FilterPreset[]).map(key => (
                        <Button
                            key={key}
                            variant={filter === key ? "default" : "outline"}
                            size="sm"
                            className="gap-1.5 text-xs"
                            onClick={() => setFilter(key)}
                        >
                            {FILTER_LABELS[key].icon}
                            {FILTER_LABELS[key].label}
                        </Button>
                    ))}
                </div>
                {filtered.length > 0 && (
                    <Button variant="ghost" size="sm" className="text-xs ml-auto" onClick={selectAll}>
                        {selected.size === filtered.length ? "Deselect All" : "Select All"}
                    </Button>
                )}
            </div>

            {/* Results count */}
            <p className="text-xs text-slate-400">
                {filtered.length} contact{filtered.length !== 1 ? "s" : ""}
                {filter !== "all" && ` matching "${FILTER_LABELS[filter].description}"`}
            </p>

            {/* Contact Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filtered.map(contact => (
                    <Card
                        key={contact.id}
                        className={`transition-all cursor-pointer ${selected.has(contact.id) ? "ring-2 ring-blue-500 bg-blue-50/30" : "hover:shadow-md"}`}
                    >
                        <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    checked={selected.has(contact.id)}
                                    onCheckedChange={() => toggleSelect(contact.id)}
                                    className="data-[state=checked]:bg-blue-600"
                                />
                                <Avatar>
                                    <AvatarImage src={contact.avatarUrl || undefined} />
                                    <AvatarFallback>{contact.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                            </div>
                            <div className="flex flex-col flex-1 min-w-0">
                                <Link href={`/dashboard/contacts/${contact.id}`}>
                                    <CardTitle className="text-base font-medium leading-none hover:text-blue-600 transition-colors truncate">
                                        {contact.name}
                                    </CardTitle>
                                </Link>
                                <span className="text-sm text-muted-foreground">{contact.company || "Individual"}</span>
                            </div>
                            <Badge variant="secondary" className="text-[10px] shrink-0">
                                {getDaysAgo(contact.lastActivityDate)}
                            </Badge>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm text-muted-foreground space-y-1 mt-2">
                                {contact.email && <div className="flex items-center gap-2 truncate">{contact.email}</div>}
                                {contact.phone && <div className="flex items-center gap-2">{contact.phone}</div>}
                                {contact.dealCount > 0 && (
                                    <Badge variant="outline" className="text-[10px] mt-1">
                                        {contact.dealCount} deal{contact.dealCount !== 1 ? "s" : ""}
                                    </Badge>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Bulk SMS Modal */}
            {showBulkModal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-lg">Send Bulk SMS</h3>
                            <Button variant="ghost" size="sm" onClick={() => setShowBulkModal(false)}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                        <p className="text-sm text-slate-500">
                            Sending to <strong>{selected.size}</strong> contact{selected.size !== 1 ? "s" : ""}.
                            Use {"{{contactName}}"} for personalization.
                        </p>
                        <textarea
                            className="w-full border border-slate-200 rounded-lg p-3 text-sm min-h-[120px] resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Hi {{contactName}}, just checking in..."
                            value={bulkMessage}
                            onChange={(e) => setBulkMessage(e.target.value)}
                        />
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => setShowBulkModal(false)}>
                                Cancel
                            </Button>
                            <Button
                                className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
                                disabled={!bulkMessage.trim() || sending}
                                onClick={handleBulkSMS}
                            >
                                <Send className="w-3.5 h-3.5" />
                                {sending ? "Sending..." : `Send to ${selected.size}`}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
