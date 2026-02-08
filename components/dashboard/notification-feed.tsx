"use client"

import { useState } from "react"
import { Bell, Check, X } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface Notification {
    id: string
    title: string
    message: string
    type: "info" | "success" | "warning" | "error"
    timestamp: string
    read: boolean
}

// Mock Data
const MOCK_NOTIFICATIONS: Notification[] = [
    { id: "1", title: "Job Updated", message: "123 Main St changed to Traveling", type: "info", timestamp: "2m ago", read: false },
    { id: "2", title: "Payment Received", message: "$450.00 from Mrs. Jones", type: "success", timestamp: "1h ago", read: false },
    { id: "3", title: "Safety Warning", message: "High wind alert in your area", type: "warning", timestamp: "3h ago", read: true },
]

export function NotificationFeed() {
    const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS)
    const unreadCount = notifications.filter(n => !n.read).length
    const [isOpen, setIsOpen] = useState(false)

    const markAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    }

    const deleteNotification = (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        setNotifications(prev => prev.filter(n => n.id !== id))
    }

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button size="icon" variant="ghost" className="relative rounded-full bg-slate-900/50 hover:bg-slate-800 text-slate-200">
                    <span className="sr-only">Notifications</span>
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-950 animate-pulse" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 bg-slate-900 border-slate-800 text-slate-100" align="end">
                <div className="flex items-center justify-between p-4 border-b border-slate-800">
                    <h4 className="font-semibold text-sm">Notifications</h4>
                    {unreadCount > 0 && (
                        <button onClick={markAllRead} className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
                            Mark all read
                        </button>
                    )}
                </div>
                <ScrollArea className="h-[300px]">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8 text-center">
                            <Bell className="w-8 h-8 mb-2 opacity-20" />
                            <p className="text-sm">No new notifications</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-800">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={cn(
                                        "p-4 hover:bg-slate-800/50 transition-colors relative group",
                                        !notification.read && "bg-slate-800/20"
                                    )}
                                >
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="flex-1">
                                            <p className={cn("text-sm font-medium", !notification.read ? "text-white" : "text-slate-400")}>
                                                {notification.title}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                                {notification.message}
                                            </p>
                                            <p className="text-[10px] text-slate-600 mt-2 font-mono">
                                                {notification.timestamp}
                                            </p>
                                        </div>
                                        {!notification.read && (
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                        )}
                                    </div>
                                    <button
                                        onClick={(e) => deleteNotification(notification.id, e)}
                                        className="absolute top-2 right-2 p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    )
}
