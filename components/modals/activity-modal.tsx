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
            <DialogContent className="ott-dialog h-[min(84vh,48rem)] w-[min(calc(100vw-1.5rem),46rem)] flex flex-col p-0">
                <DialogHeader className="border-b border-border px-6 pb-4 pt-6">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#00D28B]">
                        Dashboard Activity
                    </p>
                    <DialogTitle className="mt-1">Recent activity</DialogTitle>
                    <p className="text-[13px] leading-6 text-muted-foreground">
                        Calls, messages, automations, and workflow updates across the workspace.
                    </p>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto bg-muted/20 p-4">
                    <ActivityFeed workspaceId={workspaceId} limit={50} compact={false} className="border-none shadow-none bg-transparent" />
                </div>
            </DialogContent>
        </Dialog>
    )
}
