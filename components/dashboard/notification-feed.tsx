"use client"

import { useState, useEffect } from "react"
import { Bell, X } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
// import { getNotifications, markAsRead, markAllAsRead } from "@/actions/notification-actions"

// For now, these imports would likely break on client-side if they use 'use server' inside without being wrapped or called correctly.
// But Next.js handles server actions imported in client components just fine.
import { getNotifications, markAsRead, markAllAsRead, NotificationView } from "@/actions/notification-actions"

export function NotificationFeed() {
    const [notifications, setNotifications] = useState<NotificationView[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isOpen, setIsOpen] = useState(false)

    // TODO: Ideally pass userId or fetch from session context.
    const userId = "demo-user"

    useEffect(() => {
        if (isOpen) {
            loadNotifications()
        }
    }, [isOpen])

    // Initial load on mount to show badge count
    useEffect(() => {
        loadNotifications()
    }, [])

    const loadNotifications = async () => {
        try {
            const data = await getNotifications(userId)
            setNotifications(data)
        } catch (error) {
            console.error("Failed to load notifications", error)
        } finally {
            setIsLoading(false)
        }
    }

    const unreadCount = notifications.filter(n => !n.read).length

    const handleMarkAllRead = async () => {
        await markAllAsRead(userId)
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    }

    const dismissNotification = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        // Optimistic update
        setNotifications(prev => prev.filter(n => n.id !== id))
        await markAsRead(id)
    }

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button size="icon" variant="ghost" className="relative rounded-full hover:bg-muted text-muted-foreground">
                    <span className="sr-only">Notifications</span>
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-destructive rounded-full border-2 border-background animate-pulse" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between p-4 border-b">
                    <h4 className="font-semibold text-sm">Notifications</h4>
                    {unreadCount > 0 && (
                        <button onClick={handleMarkAllRead} className="text-xs text-primary hover:text-primary/80 transition-colors">
                            Mark all read
                        </button>
                    )}
                </div>
                <ScrollArea className="h-[300px]">
                    {isLoading ? (
                        <div className="p-4 space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex gap-3">
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-3 w-full" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </div>
                                    <Skeleton className="h-2 w-2 rounded-full mt-1.5" />
                                </div>
                            ))}
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center">
                            <Bell className="w-8 h-8 mb-2 opacity-20" />
                            <p className="text-sm">No new notifications</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={cn(
                                        "p-4 hover:bg-muted/50 transition-colors relative group",
                                        !notification.read && "bg-muted/30"
                                    )}
                                >
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="flex-1">
                                            <p className={cn("text-sm font-medium", !notification.read ? "text-foreground" : "text-muted-foreground")}>
                                                {notification.title}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                {notification.message}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground/70 mt-2 font-mono">
                                                {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        {!notification.read && (
                                            <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                                        )}
                                    </div>
                                    <button
                                        onClick={(e) => dismissNotification(notification.id, e)}
                                        className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
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
