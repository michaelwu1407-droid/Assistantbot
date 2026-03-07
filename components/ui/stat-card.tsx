import { cn } from "@/lib/utils"

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  action?: React.ReactNode
  accent?: boolean
}

export function StatCard({ label, value, sub, action, accent }: StatCardProps) {
  return (
    <div className={cn(
      'bg-card rounded-lg border border-neutral-200 shadow-sm px-4 py-3 flex flex-col gap-0.5',
    )}>
      <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
        {label}
      </span>
      <span className="text-2xl font-bold text-neutral-900 tracking-tight">
        {value}
      </span>
      {sub && (
        <span className="text-xs text-neutral-500">{sub}</span>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
