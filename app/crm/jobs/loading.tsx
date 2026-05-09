import { Loader2 } from "lucide-react"

export default function LoadingJobs() {
    return (
        <div className="h-full flex flex-col p-4 md:p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-6 shrink-0">
                <div>
                    <div className="h-8 w-40 bg-muted rounded animate-pulse mb-2"></div>
                    <div className="h-4 w-56 bg-muted rounded animate-pulse"></div>
                </div>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden flex items-center justify-center border rounded-xl bg-card">
                <div className="flex flex-col items-center text-muted-foreground">
                    <Loader2 className="h-10 w-10 animate-spin mb-4" />
                    <p>Loading your jobs...</p>
                </div>
            </div>
        </div>
    )
}
