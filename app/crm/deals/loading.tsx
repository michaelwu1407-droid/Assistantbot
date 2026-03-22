import { Loader2 } from "lucide-react"

export default function LoadingPipeline() {
    return (
        <div className="h-full flex flex-col p-4 md:p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-4 shrink-0">
                <div>
                    <div className="h-8 w-32 bg-slate-200 rounded animate-pulse mb-2"></div>
                    <div className="h-4 w-48 bg-slate-100 rounded animate-pulse"></div>
                </div>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden flex items-center justify-center">
                <div className="flex flex-col items-center text-slate-400">
                    <Loader2 className="h-10 w-10 animate-spin mb-4" />
                    <p>Loading your pipeline...</p>
                </div>
            </div>
        </div>
    )
}
