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
      'bg-card rounded-lg border border-neutral-200 shadow-sm p-6 flex flex-col gap-1',
      accent && 'border-l-4 border-l-primary'
    )}>
      <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
        {label}
      </span>
      <span className="text-3xl font-bold text-neutral-900 tracking-tight">
        {value}
      </span>
      {sub && (
        <span className="text-sm text-neutral-500">{sub}</span>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
