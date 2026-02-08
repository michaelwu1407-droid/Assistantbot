"use client"

import { useState, useEffect } from "react"
import { Bell, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getNotifications, markAsRead, markAllAsRead, type NotificationView } from "@/actions/notification-actions"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface NotificationsBtnProps {
    userId: string
}

export function NotificationsBtn({ userId }: NotificationsBtnProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [notifications, setNotifications] = useState<NotificationView[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [loading, setLoading] = useState(false)

    const fetchNotifications = async () => {
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
    }

    // Poll for notifications every 60s
    useEffect(() => {
        fetchNotifications()
        const interval = setInterval(fetchNotifications, 60000)
        return () => clearInterval(interval)
    }, [userId])

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
        <div className="relative">
            <Button 
                variant="ghost" 
                size="icon" 
                className="relative text-slate-500 hover:text-slate-900"
                onClick={() => {
                    setIsOpen(!isOpen)
                    if (!isOpen) fetchNotifications()
                }}
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                )}
            </Button>

            {isOpen && (
                <>
                    <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsOpen(false)} 
                    />
                    <div className="absolute right-0 mt-2 w-80 z-50 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="font-semibold text-sm text-slate-900">Notifications</h3>
                            {unreadCount > 0 && (
                                <button 
                                    onClick={handleMarkAllRead}
                                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
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
                                                "p-3 flex gap-3 hover:bg-slate-50 transition-colors",
                                                !n.read && "bg-blue-50/30"
                                            )}
                                        >
                                            <div className={cn(
                                                "mt-1 h-2 w-2 rounded-full shrink-0",
                                                n.type === 'ERROR' ? "bg-red-500" :
                                                n.type === 'WARNING' ? "bg-amber-500" :
                                                n.type === 'SUCCESS' ? "bg-emerald-500" :
                                                "bg-blue-500",
                                                n.read && "bg-slate-300"
                                            )} />
                                            <div className="flex-1 min-w-0">
                                                <p className={cn("text-sm font-medium text-slate-900", n.read && "text-slate-600")}>
                                                    {n.title}
                                                </p>
                                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                                                    {n.message}
                                                </p>
                                                <p className="text-[10px] text-slate-400 mt-1.5">
                                                    {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                            {!n.read && (
                                                <button 
                                                    onClick={() => handleMarkRead(n.id)}
                                                    className="self-start text-slate-300 hover:text-blue-600 transition-colors"
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
        </div>
    )
}
