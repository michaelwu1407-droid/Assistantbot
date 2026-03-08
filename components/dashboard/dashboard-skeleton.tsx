import { Skeleton } from "@/components/ui/skeleton"

export function DashboardSkeleton() {
    return (
        <div className="space-y-6 p-4">
            {/* KPI row skeleton */}
            <div className="flex gap-3 overflow-hidden">
                {[...Array(4)].map((_, i) => (
                    <Skeleton key={`kpi-${i}`} className="h-[60px] flex-1 rounded-2xl" />
                ))}
            </div>

            {/* Kanban columns skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {[...Array(5)].map((_, i) => (
                    <div key={`col-${i}`} className="space-y-3">
                        <Skeleton className="h-6 w-24 rounded-md" />
                        <div className="space-y-2">
                            {[...Array(i === 0 ? 3 : i === 1 ? 2 : 1)].map((_, j) => (
                                <Skeleton key={`card-${i}-${j}`} className="h-20 w-full rounded-xl" />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
