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
} from "lucide-react"
import { useShellStore } from "@/lib/store"
import { getReportsData, type ReportsData } from "@/actions/analytics-actions"

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("30d")
  const [data, setData] = useState<ReportsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [revenueExpanded, setRevenueExpanded] = useState(false)
  const workspaceId = useShellStore((s) => s.workspaceId)

  useEffect(() => {
    if (!workspaceId) {
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
          <div className="h-8 bg-secondary rounded-xl w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-28 bg-secondary rounded-[24px]"></div>
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
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-midnight">Analytics & Reporting</h1>
          <p className="text-muted-foreground text-sm mt-1">Monitor your business performance and team productivity.</p>
        </div>
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
      </div>

      {/* 3 Key Cards: Revenue | Customers | Jobs won with Travis */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Card 1: Revenue — click to expand trend */}
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setRevenueExpanded(!revenueExpanded)}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Revenue</p>
              <DollarSign className="h-5 w-5 text-muted-foreground/40" />
            </div>
            <p className="text-3xl font-bold text-midnight">${data.revenue.total.toLocaleString()}</p>
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
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Customers</p>
              <Users className="h-5 w-5 text-muted-foreground/40" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-2xl font-bold text-midnight">{data.customers.new}</p>
                <p className="text-xs text-muted-foreground mt-0.5">New this month</p>
              </div>
              <div>
                {hasRating ? (
                  <>
                    <div className="flex items-baseline gap-1">
                      <p className="text-2xl font-bold text-midnight">{data.customers.satisfaction}</p>
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

        {/* Card 3: Jobs won with Travis */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Jobs won with Travis</p>
              <LayoutList className="h-5 w-5 text-muted-foreground/40" />
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-bold text-midnight">{data.jobs.completed}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Completed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{scheduledCount}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Scheduled</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{pipelineCount}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Pipeline</p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground/60 mt-3 text-center">Pipeline = new requests + quotes sent</p>
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
            <div className="space-y-3">
              {data.revenue.monthly.map((month, index) => {
                const maxRev = Math.max(...data.revenue.monthly.map(m => m.revenue))
                const pct = maxRev > 0 ? (month.revenue / maxRev) * 100 : 0
                return (
                  <div key={index} className="flex items-center gap-3">
                    <span className="text-sm text-slate-600 w-10 shrink-0">{month.month}</span>
                    <div className="flex-1 bg-secondary rounded-full h-5 relative overflow-hidden">
                      <div
                        className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-900 w-20 text-right shrink-0">
                      ${month.revenue.toLocaleString()}
                    </span>
                  </div>
                )
              })}
            </div>
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
              <p className="text-2xl font-bold text-midnight">{data.jobs.completed}</p>
              <p className="text-xs text-slate-600 mt-1">Completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-midnight">{scheduledCount}</p>
              <p className="text-xs text-slate-600 mt-1">Scheduled</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-midnight">{pipelineCount}</p>
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
                <div key={index} className="flex items-center justify-between p-3 bg-secondary/50 rounded-2xl">
                  <div>
                    <p className="font-medium text-midnight">{member.name}</p>
                    <p className="text-sm text-muted-foreground">{member.jobs} jobs completed</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-primary">${member.revenue.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">revenue</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
