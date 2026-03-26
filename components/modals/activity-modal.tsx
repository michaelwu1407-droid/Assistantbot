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
            <DialogContent className="h-[min(84vh,48rem)] w-[min(calc(100vw-1.5rem),46rem)] flex flex-col p-0">
                <DialogHeader className="border-b border-emerald-100/80 bg-[linear-gradient(180deg,rgba(16,185,129,0.08),rgba(255,255,255,0.4))] px-6 pb-4 pt-6 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(16,185,129,0.12),rgba(255,255,255,0.03))]">
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-700/80 dark:text-emerald-300/80">
                        Dashboard Activity
                    </p>
                    <DialogTitle className="mt-1">Recent activity</DialogTitle>
                    <p className="text-[13px] leading-6 text-slate-500 dark:text-slate-400">
                        Calls, messages, automations, and workflow updates across the workspace.
                    </p>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.06),transparent_28%),linear-gradient(180deg,rgba(248,250,249,0.96),rgba(241,245,243,0.98))] p-4 dark:bg-[linear-gradient(180deg,rgba(12,22,18,0.4),rgba(10,18,15,0.75))]">
                    <ActivityFeed workspaceId={workspaceId} limit={50} compact={false} className="border-none shadow-none bg-transparent" />
                </div>
            </DialogContent>
        </Dialog>
    )
}
