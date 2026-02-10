import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
    return (
        <div className="h-full flex flex-col space-y-6 p-8">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between shrink-0 pb-2">
                <div className="space-y-2">
                    <Skeleton className="h-10 w-64" /> {/* Greeting */}
                    <Skeleton className="h-5 w-48" /> {/* Subtitle */}
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-10 rounded-full" /> {/* Notifications */}
                    <Skeleton className="h-10 w-32" /> {/* New Deal Button */}
                </div>
            </div>

            {/* Top Row: Health Widget & Activity */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-[400px] shrink-0">
                {/* Health Widget Skeleton */}
                <div className="xl:col-span-2 h-full grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-8 w-16" />
                            </div>
                            <Skeleton className="h-3 w-32" />
                        </div>
                    ))}
                </div>

                {/* Activity Feed Skeleton */}
                <div className="h-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <Skeleton className="h-6 w-32 mb-6" />
                    <div className="space-y-6">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex gap-4">
                                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Kanban Board Skeleton */}
            <div className="flex-1 w-full overflow-hidden min-h-0 flex gap-6">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="w-80 flex-shrink-0 flex flex-col h-full">
                        <div className="flex items-center justify-between px-2 pb-4">
                            <Skeleton className="h-5 w-24" />
                            <Skeleton className="h-5 w-8" />
                        </div>
                        <div className="flex-1 bg-slate-50/50 rounded-xl border border-slate-200/60 p-2 space-y-3">
                            <Skeleton className="h-32 w-full rounded-xl" />
                            <Skeleton className="h-24 w-full rounded-xl" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
