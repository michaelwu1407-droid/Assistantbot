"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ActivityFeed } from "@/components/crm/activity-feed"

interface ActivityModalProps {
    isOpen: boolean
    onClose: () => void
    workspaceId: string
}

export function ActivityModal({ isOpen, onClose, workspaceId }: ActivityModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0 overflow-hidden bg-background">
                <DialogHeader className="p-6 pb-2 border-b border-border/10">
                    <DialogTitle className="text-xl font-bold">Recent Activity</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 dark:bg-slate-900/20">
                    <ActivityFeed workspaceId={workspaceId} limit={50} compact={false} className="border-none shadow-none bg-transparent" />
                </div>
            </DialogContent>
        </Dialog>
    )
}
