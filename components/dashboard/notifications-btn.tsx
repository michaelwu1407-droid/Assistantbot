"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, Check, Sparkles, Phone, FileText, CheckCircle2, ClipboardCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getNotifications, markAsRead, markAllAsRead, type NotificationView } from "@/actions/notification-actions"
import { approveCompletion, approveDraft } from "@/actions/deal-actions"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const ACTION_LABELS: Record<string, { label: string; icon: React.ElementType; className: string }> = {
    CONFIRM_JOB: { label: "Confirm", icon: CheckCircle2, className: "bg-green-600 hover:bg-green-700 text-white" },
    CALL_CLIENT: { label: "Call", icon: Phone, className: "bg-primary hover:bg-primary/90 text-white" },
    SEND_INVOICE: { label: "Invoice", icon: FileText, className: "bg-emerald-600 hover:bg-emerald-700 text-white" },
    APPROVE_COMPLETION: { label: "Approve", icon: ClipboardCheck, className: "bg-amber-600 hover:bg-amber-700 text-white" },
}

interface NotificationsBtnProps {
    userId: string
    /** Light icon on dark green dashboard header */
    tone?: "default" | "onDark"
}

export function NotificationsBtn({ userId, tone = "default" }: NotificationsBtnProps) {
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false)
    const [notifications, setNotifications] = useState<NotificationView[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [loading, setLoading] = useState(false)

    const handleAction = async (n: NotificationView) => {
        await handleMarkRead(n.id)
        setIsOpen(false)

        const payload = (n.actionPayload ?? {}) as Record<string, string>
        const dealId = payload.dealId

        if (n.actionType === "CONFIRM_JOB" && dealId) {
            // Confirm a draft booking
            const result = await approveDraft(dealId)
            if (result.success) {
                toast.success("Job confirmed")
            } else {
                toast.error(result.error ?? "Could not confirm job")
                if (n.link) router.push(n.link)
            }
            return
        }

        if (n.actionType === "APPROVE_COMPLETION" && dealId) {
            // Approve a job completion
            const result = await approveCompletion(dealId)
            if (result.success) {
                toast.success("Job completion approved")
            } else {
                toast.error(result.error ?? "Could not approve completion")
                if (n.link) router.push(n.link)
            }
            return
        }

        if (n.actionType === "CALL_CLIENT") {
            // Open native phone dialler — payload may have a phone number
            const phone = payload.phone
            if (phone) {
                window.location.href = `tel:${phone}`
            } else if (n.link) {
                router.push(n.link)
            }
            return
        }

        // SEND_INVOICE and anything else: navigate to the linked page
        if (n.link) {
            router.push(n.link)
        }
    }

    const fetchNotifications = useCallback(async () => {
        setLoading(true)
        try {
            const data = await getNotifications(userId)
            setNotifications(data)
            setUnreadCount(data.filter(n => !n.read).length)
        } catch (error) {
            console.error("Failed to fetch notifications", error)
        } finally {
            setLoading(false)
        }
    }, [userId])

    // Poll for notifications every 60s
    useEffect(() => {
        fetchNotifications()
        const interval = setInterval(fetchNotifications, 60000)
        return () => clearInterval(interval)
    }, [fetchNotifications])

    const handleMarkRead = async (id: string) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
        setUnreadCount(prev => Math.max(0, prev - 1))

        await markAsRead(id)
    }

    const handleMarkAllRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        setUnreadCount(0)
        await markAllAsRead(userId)
        toast.success("All cleared!")
    }

    return (
        <div id="notifications-btn" className="relative">
            {tone === "onDark" ? (
                /* Plain button: avoids ghost `border-primary` + global *:focus-visible green glow on Button */
                <button
                    type="button"
                    aria-label="Notifications"
                    aria-haspopup="dialog"
                    aria-expanded={isOpen}
                    aria-controls="notifications-panel"
                    className={cn(
                        "relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-white/90 transition-colors",
                        "border-0 bg-transparent p-0 shadow-none outline-none",
                        /* globals: * { outline-ring/50 } and *:focus-visible { box-shadow: green } */
                        "!outline-none hover:bg-white/10 hover:text-white",
                        "focus-visible:!outline-none focus-visible:!shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    )}
                    onClick={() => {
                        setIsOpen(!isOpen)
                        if (!isOpen) fetchNotifications()
                    }}
                >
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500" aria-hidden />
                    )}
                </button>
            ) : (
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "relative h-9 w-9",
                        "text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
                    )}
                    onClick={() => {
                        setIsOpen(!isOpen)
                        if (!isOpen) fetchNotifications()
                    }}
                    aria-haspopup="dialog"
                    aria-expanded={isOpen}
                    aria-controls="notifications-panel"
                >
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500" aria-hidden />
                    )}
                </Button>
            )}

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div
                        id="notifications-panel"
                        role="dialog"
                        aria-label="Notifications"
                        className="absolute right-0 mt-2 w-80 z-50 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right"
                    >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="font-semibold text-sm text-slate-900">Notifications</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllRead}
                                    className="text-xs text-primary hover:text-primary/80 font-medium"
                                >
                                    Mark all read
                                </button>
                            )}
                        </div>

                        <div className="max-h-[300px] overflow-y-auto">
                            {loading && notifications.length === 0 ? (
                                <div className="p-4 text-center text-xs text-slate-400">Loading...</div>
                            ) : notifications.length === 0 ? (
                                <div className="p-8 text-center text-slate-500 text-sm">
                                    <Bell className="h-8 w-8 mx-auto mb-2 text-slate-200" />
                                    No new notifications
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {notifications.map(n => (
                                        <div
                                            key={n.id}
                                            className={cn(
                                                "p-3 flex gap-3 hover:bg-slate-50 transition-colors cursor-pointer",
                                                !n.read && "bg-primary/10"
                                            )}
                                            onClick={() => {
                                                if (n.link) {
                                                    router.push(n.link);
                                                }
                                                if (!n.read) {
                                                    void handleMarkRead(n.id);
                                                }
                                                setIsOpen(false);
                                            }}
                                        >
                                            <div className={cn("mt-1 shrink-0", n.read && "opacity-50")}>
                                                {n.type === 'AI' || n.type === 'SYSTEM' ? (
                                                    <div className="flex items-center justify-center p-1 rounded-full bg-primary/20 text-primary">
                                                        <Sparkles className="h-3 w-3" />
                                                    </div>
                                                ) : (
                                                    <div className={cn(
                                                        "h-2 w-2 rounded-full",
                                                        n.type === 'ERROR' ? "bg-red-500" :
                                                            n.type === 'WARNING' ? "bg-amber-500" :
                                                            n.type === 'SUCCESS' ? "bg-emerald-500" : "bg-primary",
                                                        n.read && "bg-slate-300"
                                                    )} />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={cn("text-sm font-medium text-slate-900", n.read && "text-slate-600")}>
                                                    {n.title}
                                                </p>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    {n.message}
                                                </p>
                                                {n.actionType && ACTION_LABELS[n.actionType] && !n.read && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleAction(n); }}
                                                        className={cn(
                                                            "mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors",
                                                            ACTION_LABELS[n.actionType].className
                                                        )}
                                                    >
                                                        {(() => { const Icon = ACTION_LABELS[n.actionType!].icon; return <Icon className="h-3 w-3" />; })()}
                                                        {ACTION_LABELS[n.actionType].label}
                                                    </button>
                                                )}
                                                <p className="text-[10px] text-slate-400 mt-1.5">
                                                    {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                            {!n.read && !n.actionType && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        void handleMarkRead(n.id);
                                                    }}
                                                    className="self-start text-slate-300 hover:text-primary transition-colors"
                                                    title="Mark as read"
                                                >
                                                    <Check className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
            <span className="sr-only" role="status" aria-live="polite">
                {unreadCount > 0 ? `${unreadCount} unread notifications` : "No unread notifications"}
            </span>
        </div>
    )
}
