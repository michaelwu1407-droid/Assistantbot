import { getAuthUserId } from "@/lib/auth"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { getTodaySchedule } from "@/actions/tradie-actions"
import { CalendarGrid } from "@/components/scheduler/calendar-grid"
import { Header } from "@/components/dashboard/header"
import { Button } from "@/components/ui/button"
import { MessageSquare, CheckCircle, Clock } from "lucide-react"
import { sendConfirmationSMS, resendConfirmationSMS } from "@/actions/messaging-actions"
import { toast } from "sonner"
import { Suspense } from "react"

export const dynamic = "force-dynamic"

export default async function CalendarPage() {
    const userId = (await getAuthUserId()) as string;
    const workspace = await getOrCreateWorkspace(userId)
    const todayJobs = await getTodaySchedule(workspace.id)

    // Convert today's jobs to SchedulerJob format for CalendarGrid
    const scheduledJobs: Record<string, any[]> = {}
    const today = new Date()
    
    todayJobs.forEach(job => {
        const dateKey = today.toISOString().split('T')[0]
        const hour = parseInt(job.time.split(':')[0]) || 9
        
        if (!scheduledJobs[`${dateKey}-${hour}`]) {
            scheduledJobs[`${dateKey}-${hour}`] = []
        }
        
        scheduledJobs[`${dateKey}-${hour}`].push({
            id: job.id,
            title: job.title,
            clientName: job.client,
            duration: 60, // Default 1 hour
            color: job.status === 'SCHEDULED' ? '#3b82f6' : '#10b981',
            time: job.time,
            address: job.address,
            status: job.status
        })
    })

    const visibleDates = [today]

    return (
        <div className="h-full flex flex-col overflow-hidden relative bg-background">
            {/* ATMOSPHERIC GLOW - MINT RADIAL */}
            <div className="absolute top-0 left-0 right-0 h-[500px] ott-glow pointer-events-none z-0" />

            <div className="relative z-10 flex flex-col h-full p-2 md:p-3 md:pt-2 gap-2">
                <Header
                    userName={userId}
                    userId={userId}
                    workspaceId={workspace.id}
                    onNewDeal={() => {}}
                />

                {/* Calendar View */}
                <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                    <div className="bg-white rounded-[24px] border border-[#E2E8F0] p-4 h-full overflow-hidden">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h1 className="text-2xl font-bold text-[#0F172A]">Schedule</h1>
                                <p className="text-sm text-muted-foreground">
                                    Manage your job schedule and confirmations
                                </p>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                                    <span>Confirmed</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 bg-amber-500 rounded-full" />
                                    <span>Pending</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 bg-gray-400 rounded-full" />
                                    <span>No Confirmation</span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Calendar Grid */}
                        <div className="h-full overflow-auto">
                            <Suspense fallback={<div className="h-full bg-background animate-pulse" />}>
                                <CalendarGrid 
                                    scheduledJobs={scheduledJobs}
                                    visibleDates={visibleDates}
                                />
                            </Suspense>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

