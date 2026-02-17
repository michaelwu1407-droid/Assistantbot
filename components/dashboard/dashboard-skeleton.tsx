import { Skeleton } from "@/components/ui/skeleton"

export function DashboardSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            <div className="grid grid-cols-5 gap-4">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="bg-white rounded-[24px] border border-[#E2E8F0] p-4 min-h-[400px]">
                        <div className="h-6 bg-gray-200 rounded mb-4 w-20" />
                        <div className="space-y-2">
                            {[...Array(3)].map((_, j) => (
                                <div key={j} className="bg-gray-100 rounded-lg h-20" />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
