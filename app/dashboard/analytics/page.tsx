"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Calendar, 
  Star,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Clock,
  CheckCircle
} from "lucide-react"
import { useShellStore } from "@/lib/store"
import { getReportsData, type ReportsData } from "@/actions/analytics-actions"

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("30d")
  const [data, setData] = useState<ReportsData | null>(null)
  const [loading, setLoading] = useState(true)
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-secondary rounded-[24px]"></div>
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

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-midnight">${data.revenue.total.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-1">
                  {data.revenue.growth > 0 ? (
                    <TrendingUp className="h-3 w-3 text-primary" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-destructive" />
                  )}
                  <span className={`text-xs ${data.revenue.growth > 0 ? 'text-primary' : 'text-destructive'}`}>
                    {Math.abs(data.revenue.growth)}%
                  </span>
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground/40" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Deals</p>
                <p className="text-2xl font-bold text-midnight">{data.deals.total}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Target className="h-3 w-3 text-blue-600" />
                  <span className="text-xs text-blue-600">{data.deals.conversion}% conversion</span>
                </div>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground/40" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Customers</p>
                <p className="text-2xl font-bold text-midnight">{data.customers.total}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Users className="h-3 w-3 text-purple-600" />
                  <span className="text-xs text-purple-600">{data.customers.new} new this month</span>
                </div>
              </div>
              <Users className="h-8 w-8 text-muted-foreground/40" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Satisfaction</p>
                <p className="text-2xl font-bold text-midnight">{data.customers.satisfaction}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="h-3 w-3 text-amber-500" />
                  <span className="text-xs text-amber-600">Average rating</span>
                </div>
              </div>
              <Star className="h-8 w-8 text-muted-foreground/40" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Revenue Trend
            </CardTitle>
            <CardDescription>Monthly revenue over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.revenue.monthly.map((month, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-sm text-slate-600 w-12">{month.month}</span>
                  <div className="flex-1 bg-secondary rounded-full h-6 relative overflow-hidden">
                    <div 
                      className="absolute left-0 top-0 h-full bg-primary rounded-full"
                      style={{ width: `${(Math.max(...data.revenue.monthly.map(m => m.revenue)) > 0 ? (month.revenue / Math.max(...data.revenue.monthly.map(m => m.revenue))) * 100 : 0)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-slate-900 w-20 text-right">
                    ${month.revenue.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Deal Pipeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Deal Pipeline
            </CardTitle>
            <CardDescription>Deals by stage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.deals.byStage.map((stage, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-sm text-slate-600 w-24">{stage.stage}</span>
                  <div className="flex-1 bg-secondary rounded-full h-6 relative overflow-hidden">
                    <div 
                      className="absolute left-0 top-0 h-full rounded-full bg-primary/80"
                      style={{ width: `${(data.deals.byStage.length && Math.max(...data.deals.byStage.map(s => s.count)) > 0 ? (stage.count / Math.max(...data.deals.byStage.map(s => s.count))) * 100 : 0)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-slate-900 w-12 text-right">
                    {stage.count}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Job Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Job Performance
            </CardTitle>
            <CardDescription>Job completion metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-mint-50 rounded-full mx-auto mb-2">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
                <p className="text-2xl font-bold text-midnight">{data.jobs.completed}</p>
                <p className="text-xs text-slate-600">Completed</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-50 rounded-full mx-auto mb-2">
                  <Clock className="h-6 w-6 text-blue-500" />
                </div>
                <p className="text-2xl font-bold text-midnight">{data.jobs.inProgress}</p>
                <p className="text-xs text-slate-600">In Progress</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-secondary rounded-full mx-auto mb-2">
                  <Calendar className="h-6 w-6 text-midnight" />
                </div>
                <p className="text-2xl font-bold text-midnight">{data.jobs.avgCompletionTime}</p>
                <p className="text-xs text-slate-600">Avg Days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Performance - shown when we have team data */}
        {data.team.performance.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
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

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle>Export Reports</CardTitle>
          <CardDescription>Download detailed reports for offline analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              Export as CSV
            </Button>
            <Button variant="outline">
              <PieChart className="h-4 w-4 mr-2" />
              Export as PDF
            </Button>
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
