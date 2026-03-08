"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Star,
  CheckCircle,
  Calendar,
  LayoutList,
  Printer
} from "lucide-react"
import { useShellStore } from "@/lib/store"
import { useRouter } from "next/navigation"
import { getReportsData, type ReportsData } from "@/actions/analytics-actions"
import { Button } from "@/components/ui/button"

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("30d")
  const [data, setData] = useState<ReportsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [revenueExpanded, setRevenueExpanded] = useState(false)
  const workspaceId = useShellStore((s) => s.workspaceId)
  const userRole = useShellStore((s) => s.userRole)
  const router = useRouter()

  // RBAC: Team members cannot access reports
  useEffect(() => {
    if (userRole === "TEAM_MEMBER") {
      router.replace("/dashboard")
    }
  }, [userRole, router])

  useEffect(() => {
    if (!workspaceId || userRole === "TEAM_MEMBER") {
      setLoading(false)
      return
    }
    setLoading(true)
    const months = timeRange === "7d" ? 1 : timeRange === "30d" ? 3 : timeRange === "90d" ? 4 : 12
    getReportsData(workspaceId, months)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [workspaceId, timeRange])

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-secondary rounded-lg w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-28 bg-secondary rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!loading && !data) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <p className="text-muted-foreground">No workspace or unable to load reports.</p>
      </div>
    )
  }
  if (!data) return null

  // Pipeline count: new requests + quote sent (not yet scheduled)
  const pipelineCount = data.deals.byStage
    .filter(s => ["New request", "Quote sent"].includes(s.stage))
    .reduce((sum, s) => sum + s.count, 0)

  const scheduledCount = data.deals.byStage
    .find(s => s.stage === "Scheduled")?.count ?? 0

  const hasRating = data.customers.satisfaction > 0

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
          .print-hide { display: none !important; }
        }
      `}} />
      <div className="print-area p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Analytics & Reporting</h1>
            <p className="text-muted-foreground text-sm mt-1">Monitor your business performance and team productivity.</p>
          </div>
          <div className="flex items-center gap-2 print-hide">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => window.print()} title="Export Report PDF">
              <Printer className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 3 Key Cards: Revenue | Customers | Jobs won with Tracey */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Card 1: Revenue — click to expand trend */}
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setRevenueExpanded(!revenueExpanded)}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-neutral-500">Revenue</p>
                <DollarSign className="h-5 w-5 text-muted-foreground/40" />
              </div>
              <p className="text-3xl font-bold text-neutral-900">${data.revenue.total.toLocaleString("en-AU")}</p>
              <div className="flex items-center gap-1 mt-2">
                {data.revenue.growth > 0 ? (
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                )}
                <span className={`text-xs font-medium ${data.revenue.growth > 0 ? 'text-primary' : 'text-destructive'}`}>
                  {Math.abs(Math.round(data.revenue.growth))}% vs last month
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground/60 mt-2">{revenueExpanded ? "Click to collapse" : "Click to see trend"}</p>
            </CardContent>
          </Card>

          {/* Card 2: Customers */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-neutral-500">Customers</p>
                <Users className="h-5 w-5 text-muted-foreground/40" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-2xl font-bold text-neutral-900">{data.customers.new}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">New this month</p>
                </div>
                <div>
                  {hasRating ? (
                    <>
                      <div className="flex items-baseline gap-1">
                        <p className="text-2xl font-bold text-neutral-900">{data.customers.satisfaction}</p>
                        <Star className="h-4 w-4 text-amber-500 mb-0.5" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Avg rating</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-muted-foreground mt-1">No ratings yet</p>
                      <p className="text-xs text-muted-foreground/60 mt-0.5">Ratings will appear here</p>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Jobs won with Tracey */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-neutral-500">Jobs won with Tracey</p>
                <LayoutList className="h-5 w-5 text-muted-foreground/40" />
              </div>
              <p className="text-3xl font-bold text-neutral-900">{data.jobs.wonWithTracey}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Jobs sourced and won through Tracey
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Revenue trend (expandable) */}
        {revenueExpanded && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4" />
                Revenue Trend
              </CardTitle>
              <CardDescription>Monthly revenue over time</CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const months = data.revenue.monthly;
                const allZero = months.every(m => m.revenue === 0);
                if (allZero) return <p className="text-center text-sm text-muted-foreground py-8">No revenue data yet</p>;
                const W = 600, H = 200, PAD_TOP = 20, PAD_BOTTOM = 30, PAD_LEFT = 50, PAD_RIGHT = 20;
                const maxRev = Math.max(...months.map(m => m.revenue));
                const chartW = W - PAD_LEFT - PAD_RIGHT;
                const chartH = H - PAD_TOP - PAD_BOTTOM;
                const points = months.map((m, i) => {
                  const x = PAD_LEFT + (months.length > 1 ? (i / (months.length - 1)) * chartW : chartW / 2);
                  const y = PAD_TOP + chartH - (maxRev > 0 ? (m.revenue / maxRev) * chartH : 0);
                  return { x, y, month: m.month, revenue: m.revenue };
                });
                const gridCount = 4;
                const gridLines = Array.from({ length: gridCount }, (_, i) => {
                  const val = (maxRev / (gridCount - 1)) * i;
                  const y = PAD_TOP + chartH - (maxRev > 0 ? (val / maxRev) * chartH : 0);
                  return { y, val };
                });
                return (
                  <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-48">
                    {gridLines.map((g, i) => (
                      <g key={i}>
                        <line x1={PAD_LEFT} y1={g.y} x2={W - PAD_RIGHT} y2={g.y} stroke="#e2e8f0" strokeWidth={1} />
                        <text x={PAD_LEFT - 6} y={g.y + 4} textAnchor="end" className="fill-slate-400" fontSize={10}>${Math.round(g.val).toLocaleString("en-AU")}</text>
                      </g>
                    ))}
                    <polyline points={points.map(p => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#00D28B" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
                    {points.map((p, i) => (
                      <circle key={i} cx={p.x} cy={p.y} r={4} fill="#00D28B" stroke="white" strokeWidth={2} />
                    ))}
                    {points.map((p, i) => (
                      <text key={`lbl-${i}`} x={p.x} y={H - 6} textAnchor="middle" className="fill-slate-500" fontSize={10}>{p.month}</text>
                    ))}
                  </svg>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* Status: Completed, Scheduled, New requests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle className="h-4 w-4" />
              Status
            </CardTitle>
            <CardDescription>Job counts by stage for the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-neutral-900">{data.jobs.completed}</p>
                <p className="text-xs text-slate-600 mt-1">Completed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900">{scheduledCount}</p>
                <p className="text-xs text-slate-600 mt-1">Scheduled</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900">{pipelineCount}</p>
                <p className="text-xs text-slate-600 mt-1">New requests</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Performance - only when data exists */}
        {data.team.performance.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Team Performance
              </CardTitle>
              <CardDescription>Individual team member metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.team.performance.map((member, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                    <div>
                      <p className="font-medium text-neutral-900">{member.name}</p>
                      <p className="text-sm text-muted-foreground">{member.jobs} jobs completed</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-primary">${member.revenue.toLocaleString("en-AU")}</p>
                      <p className="text-xs text-muted-foreground">revenue</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}
