import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
    <div className="h-full flex flex-col overflow-hidden relative p-2 md:p-3 md:pt-2 gap-1.5">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between shrink-0 h-14 pb-2">
            <div className="space-y-2">
                <Skeleton className="h-6 w-48" /> {/* Greeting */}
                <Skeleton className="h-4 w-32" /> {/* Subtitle */}
            </div>
            <div className="flex gap-2">
                <Skeleton className="h-9 w-9 rounded-full" /> {/* Activity */}
                <Skeleton className="h-9 w-[120px] rounded-full" /> {/* New lead */}
            </div>
        </div>

        {/* Setup Widget Skeleton */}
        <Skeleton className="h-16 w-full rounded-xl mb-6 shadow-sm border border-emerald-200" />

        <div className="flex flex-col flex-1 min-h-0 gap-0">
            {/* Top row: KPI Cards Skeleton */}
            <div className="shrink-0 flex gap-3 h-[60px] mb-8 pb-8 border-b border-border/40">
                {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="flex-1 rounded-xl h-full shadow-sm bg-muted/60" />
                ))}
            </div>

            {/* Kanban Board Skeleton */}
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col pt-1 rounded-t-xl bg-slate-200/40">
                <div className="h-full w-full bg-white/95 rounded-xl border border-slate-200/70 shadow-sm p-4 flex gap-6 overflow-x-hidden">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="w-72 flex-shrink-0 flex flex-col h-full border-l-4 border-slate-200 ml-2 pl-2">
                            <div className="flex items-center justify-between mb-4 mt-2">
                                <Skeleton className="h-5 w-24" />
                                <Skeleton className="h-5 w-8 rounded-full" />
                            </div>
                            <div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 p-3 space-y-3">
                                <Skeleton className="h-32 w-full rounded-xl bg-white shadow-sm" />
                                <Skeleton className="h-24 w-full rounded-xl bg-white shadow-sm" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
}
