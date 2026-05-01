"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { TrendingUp, TrendingDown, DollarSign, Users, Star, CheckCircle, LayoutList, Printer } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useShellStore } from "@/lib/store"
import {
  getReportsData,
  getMonthlyRevenueBreakdown,
  type ReportsData,
  type ReportRange,
  type MonthlyRevenueBreakdown,
} from "@/actions/analytics-actions"

const RANGE_LABELS: Record<ReportRange, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "1y": "LTM",
}

const COMPARISON_LABELS: Record<ReportRange, string> = {
  "7d": "vs prior 7 days",
  "30d": "vs prior 30 days",
  "90d": "vs prior 90 days",
  "1y": "vs prior 12 months",
}

function formatCurrency(value: number) {
  return `$${value.toLocaleString("en-AU")}`
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("en-AU", { day: "numeric", month: "short" })
}

function formatLongDate(value: string) {
  return new Date(value).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<ReportRange>("30d")
  const [data, setData] = useState<ReportsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [revenueExpanded, setRevenueExpanded] = useState(false)
  const [customersExpanded, setCustomersExpanded] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [monthBreakdown, setMonthBreakdown] = useState<MonthlyRevenueBreakdown | null>(null)
  const [monthLoading, setMonthLoading] = useState(false)
  const workspaceId = useShellStore((s) => s.workspaceId)
  const userRole = useShellStore((s) => s.userRole)
  const router = useRouter()

  useEffect(() => {
    if (userRole === "TEAM_MEMBER") {
      router.replace("/crm/dashboard")
    }
  }, [userRole, router])

  useEffect(() => {
    if (!workspaceId || userRole === "TEAM_MEMBER") {
      setLoading(false)
      return
    }

    setLoading(true)
    setSelectedMonth(null)
    setMonthBreakdown(null)

    getReportsData(workspaceId, timeRange)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [workspaceId, timeRange, userRole])

  if (loading) {
    return (
      <div className="h-full min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 w-1/3 rounded-[18px] bg-secondary" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-28 rounded-[18px] bg-secondary" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!loading && !data) {
    return (
      <div className="h-full min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-8 max-w-7xl mx-auto w-full">
          <p className="text-muted-foreground">No workspace or unable to load reports.</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  const pipelineCount = data.deals.byStage
    .filter((stage) => ["New request", "Quote sent"].includes(stage.stage))
    .reduce((sum, stage) => sum + stage.count, 0)
  const scheduledCount = data.deals.byStage.find((stage) => stage.stage === "Scheduled")?.count ?? 0
  const hasRating = data.customers.satisfaction > 0

  const printReport = () => {
    const printWindow = window.open("", "_blank", "noopener,noreferrer")
    if (!printWindow) {
      window.print()
      return
    }

    const monthRows = data.revenue.monthly
      .map((month) => `<tr><td>${escapeHtml(month.month)}</td><td style="text-align:right">${formatCurrency(month.revenue)}</td></tr>`)
      .join("")
    const stageRows = data.deals.byStage
      .map((stage) => `<tr><td>${escapeHtml(stage.stage)}</td><td style="text-align:right">${stage.count}</td></tr>`)
      .join("")
    const feedbackRows = data.customers.latestFeedback.length
      ? data.customers.latestFeedback
          .map(
            (feedback) =>
              `<tr><td>${escapeHtml(feedback.contactName)}</td><td style="text-align:center">${feedback.score}/10</td><td>${escapeHtml(feedback.comment ?? "No comment")}</td><td>${escapeHtml(feedback.dealTitle)}</td><td style="text-align:right">${formatLongDate(feedback.createdAt)}</td></tr>`
          )
          .join("")
      : `<tr><td colspan="5" style="text-align:center;color:#64748b">No feedback in this range.</td></tr>`

    const monthBreakdownSection = monthBreakdown
      ? `
        <section>
          <h2>${escapeHtml(monthBreakdown.month)} Breakdown</h2>
          <div class="metrics">
            <div class="metric"><span>Revenue</span><strong>${formatCurrency(monthBreakdown.totalRevenue)}</strong></div>
            <div class="metric"><span>Jobs</span><strong>${monthBreakdown.dealCount}</strong></div>
            <div class="metric"><span>Avg deal</span><strong>${formatCurrency(monthBreakdown.avgDealValue)}</strong></div>
            <div class="metric"><span>Largest deal</span><strong>${monthBreakdown.largestDeal ? formatCurrency(monthBreakdown.largestDeal.revenue) : "-"}</strong></div>
          </div>
          <table>
            <thead><tr><th>Job</th><th>Contact</th><th>Source</th><th style="text-align:right">Revenue</th><th style="text-align:right">Completed</th></tr></thead>
            <tbody>
              ${monthBreakdown.deals
                .map(
                  (deal) =>
                    `<tr><td>${escapeHtml(deal.title)}</td><td>${escapeHtml(deal.contactName)}</td><td>${escapeHtml(deal.source)}</td><td style="text-align:right">${formatCurrency(deal.revenue)}</td><td style="text-align:right">${formatShortDate(deal.completedAt)}</td></tr>`
                )
                .join("")}
            </tbody>
          </table>
        </section>
      `
      : ""

    const printHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Analytics Report</title>
    <style>
      @page { size: A4; margin: 14mm; }
      * { box-sizing: border-box; }
      body {
        font-family: "Plus Jakarta Sans", system-ui, sans-serif;
        margin: 0;
        color: #0f172a;
        background: #ffffff;
      }
      .report {
        max-width: 980px;
        margin: 0 auto;
      }
      h1, h2 { margin: 0 0 12px; }
      h1 { font-size: 28px; line-height: 1.15; }
      h2 {
        font-size: 17px;
        line-height: 1.25;
        margin-top: 28px;
        padding-top: 10px;
        border-top: 1px solid #e2e8f0;
      }
      p { margin: 0; color: #475569; }
      .meta { margin-top: 6px; margin-bottom: 20px; font-size: 13px; }
      .metrics {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        margin: 18px 0 8px;
      }
      .metric {
        border: 1px solid #e2e8f0;
        border-radius: 18px;
        padding: 14px 16px;
        break-inside: avoid;
      }
      .metric span {
        display: block;
        font-size: 12px;
        color: #64748b;
        margin-bottom: 6px;
      }
      .metric strong { font-size: 22px; line-height: 1.15; }
      section { break-inside: avoid; }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 12px;
        table-layout: fixed;
      }
      th, td {
        border-bottom: 1px solid #e2e8f0;
        padding: 10px 8px;
        font-size: 12px;
        vertical-align: top;
        text-align: left;
        overflow-wrap: anywhere;
      }
      th { color: #475569; font-weight: 700; }
      .align-right { text-align: right; }
      .align-center { text-align: center; }
      .compact th:nth-child(1), .compact td:nth-child(1) { width: 52%; }
      .compact th:nth-child(2), .compact td:nth-child(2) { width: 48%; }
      .feedback th:nth-child(1), .feedback td:nth-child(1) { width: 16%; }
      .feedback th:nth-child(2), .feedback td:nth-child(2) { width: 10%; }
      .feedback th:nth-child(3), .feedback td:nth-child(3) { width: 34%; }
      .feedback th:nth-child(4), .feedback td:nth-child(4) { width: 24%; }
      .feedback th:nth-child(5), .feedback td:nth-child(5) { width: 16%; }
      @media print {
        .report { max-width: none; }
      }
    </style>
  </head>
  <body>
    <main class="report">
      <h1>Analytics Report</h1>
      <p class="meta">${escapeHtml(RANGE_LABELS[timeRange])} - Generated ${escapeHtml(new Date().toLocaleString("en-AU"))}</p>
      <div class="metrics">
        <div class="metric"><span>Revenue</span><strong>${formatCurrency(data.revenue.total)}</strong></div>
        <div class="metric"><span>Customers</span><strong>${data.customers.inRange}</strong></div>
        <div class="metric"><span>Jobs won with Tracey</span><strong>${data.jobs.wonWithTracey}</strong></div>
        <div class="metric"><span>Avg rating</span><strong>${hasRating ? `${data.customers.satisfaction}/10` : "-"}</strong></div>
      </div>
      <section>
        <h2>Revenue by Month</h2>
        <table class="compact">
          <thead><tr><th>Month</th><th class="align-right">Revenue</th></tr></thead>
          <tbody>${monthRows}</tbody>
        </table>
      </section>
      <section>
        <h2>Jobs by stage</h2>
        <table class="compact">
          <thead><tr><th>Stage</th><th class="align-right">Jobs</th></tr></thead>
          <tbody>${stageRows}</tbody>
        </table>
      </section>
      ${monthBreakdownSection}
      <section>
        <h2>Latest Feedback</h2>
        <table class="feedback">
          <thead><tr><th>Customer</th><th class="align-center">Score</th><th>Comment</th><th>Deal</th><th class="align-right">Date</th></tr></thead>
          <tbody>${feedbackRows}</tbody>
        </table>
      </section>
    </main>
  </body>
</html>`
    printWindow.document.open()
    printWindow.document.write(printHtml)
    printWindow.document.close()
    printWindow.onload = () => {
      printWindow.focus()
      printWindow.print()
      printWindow.onafterprint = () => printWindow.close()
    }
  }

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Select value={timeRange} onValueChange={(value) => setTimeRange(value as ReportRange)}>
                <SelectTrigger className="toolbar-pill w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="1y">LTM</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" className="rounded-full" onClick={printReport} title="Print report">
                <Printer className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className="cursor-pointer rounded-[18px] hover:shadow-md transition-shadow"
          onClick={() => {
            setRevenueExpanded(!revenueExpanded)
            if (revenueExpanded) {
              setSelectedMonth(null)
              setMonthBreakdown(null)
            }
          }}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="app-micro-label">Revenue</p>
              <DollarSign className="h-5 w-5 text-muted-foreground/40" />
            </div>
            <p className="text-3xl font-bold text-neutral-900">{formatCurrency(data.revenue.total)}</p>
            <div className="flex items-center gap-1 mt-2">
              {data.revenue.growth > 0 ? <TrendingUp className="h-3.5 w-3.5 text-primary" /> : <TrendingDown className="h-3.5 w-3.5 text-destructive" />}
              <span className={`text-xs font-medium ${data.revenue.growth > 0 ? "text-primary" : "text-destructive"}`}>
                {Math.abs(Math.round(data.revenue.growth))}% {COMPARISON_LABELS[timeRange]}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer rounded-[18px] hover:shadow-md transition-shadow" onClick={() => setCustomersExpanded(!customersExpanded)}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="app-micro-label">Customers</p>
              <Users className="h-5 w-5 text-muted-foreground/40" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-2xl font-bold text-neutral-900">{data.customers.inRange}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{RANGE_LABELS[timeRange]}</p>
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
                  <p className="text-sm font-medium text-muted-foreground mt-1">No ratings yet</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[18px]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="app-micro-label">Jobs won with Tracey</p>
              <LayoutList className="h-5 w-5 text-muted-foreground/40" />
            </div>
            <p className="text-3xl font-bold text-neutral-900">{data.jobs.wonWithTracey}</p>
          </CardContent>
        </Card>
          </div>

          {revenueExpanded && (
            <Card className="rounded-[18px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-neutral-900">
              <TrendingUp className="h-4 w-4" />
              Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(() => {
              const months = data.revenue.monthly
              const allZero = months.every((month) => month.revenue === 0)
              if (allZero) return <p className="text-center text-sm text-muted-foreground py-8">No revenue data yet</p>

              const W = 600
              const H = 200
              const PAD_TOP = 20
              const PAD_BOTTOM = 30
              const PAD_LEFT = 50
              const PAD_RIGHT = 20
              const maxRevenue = Math.max(...months.map((month) => month.revenue))
              const chartW = W - PAD_LEFT - PAD_RIGHT
              const chartH = H - PAD_TOP - PAD_BOTTOM
              const points = months.map((month, index) => ({
                x: PAD_LEFT + (months.length > 1 ? (index / (months.length - 1)) * chartW : chartW / 2),
                y: PAD_TOP + chartH - (maxRevenue > 0 ? (month.revenue / maxRevenue) * chartH : 0),
                ...month,
              }))
              const gridLines = Array.from({ length: 4 }, (_, index) => {
                const value = (maxRevenue / 3) * index
                const y = PAD_TOP + chartH - (maxRevenue > 0 ? (value / maxRevenue) * chartH : 0)
                return { y, value }
              })

              const handleMonthClick = async (month: string, start: string, end: string) => {
                if (!workspaceId) return
                if (selectedMonth === month) {
                  setSelectedMonth(null)
                  setMonthBreakdown(null)
                  return
                }
                setSelectedMonth(month)
                setMonthLoading(true)
                try {
                  const breakdown = await getMonthlyRevenueBreakdown(workspaceId, start, end)
                  setMonthBreakdown(breakdown)
                } catch (error) {
                  console.error(error)
                } finally {
                  setMonthLoading(false)
                }
              }

              return (
                <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-48">
                  {gridLines.map((line, index) => (
                    <g key={index}>
                      <line x1={PAD_LEFT} y1={line.y} x2={W - PAD_RIGHT} y2={line.y} stroke="#e2e8f0" strokeWidth={1} />
                      <text x={PAD_LEFT - 6} y={line.y + 4} textAnchor="end" className="fill-slate-400" fontSize={10}>
                        {formatCurrency(Math.round(line.value))}
                      </text>
                    </g>
                  ))}
                  <polyline points={points.map((point) => `${point.x},${point.y}`).join(" ")} fill="none" stroke="#00D28B" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
                  {points.map((point) => (
                    <g key={`${point.start}-${point.end}`} className="cursor-pointer" onClick={() => handleMonthClick(point.month, point.start, point.end)}>
                      <circle cx={point.x} cy={point.y} r={14} fill="transparent" />
                      <circle cx={point.x} cy={point.y} r={selectedMonth === point.month ? 7 : 4} fill={selectedMonth === point.month ? "#059669" : "#00D28B"} stroke="white" strokeWidth={2} />
                    </g>
                  ))}
                  {points.map((point) => (
                    <text
                      key={`${point.start}-${point.end}-label`}
                      x={point.x}
                      y={H - 6}
                      textAnchor="middle"
                      className={selectedMonth === point.month ? "fill-emerald-700 font-semibold cursor-pointer" : "fill-slate-500 cursor-pointer"}
                      fontSize={10}
                      onClick={() => handleMonthClick(point.month, point.start, point.end)}
                    >
                      {point.month}
                    </text>
                  ))}
                </svg>
              )
            })()}

            {selectedMonth && (
              <div className="border-t pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-neutral-900">{selectedMonth} breakdown</h3>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => { setSelectedMonth(null); setMonthBreakdown(null) }}>
                    Close
                  </Button>
                </div>

                {monthLoading && <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>}

                {!monthLoading && monthBreakdown && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="rounded-[18px] bg-secondary/30 p-3">
                        <p className="text-xs text-muted-foreground">Revenue</p>
                        <p className="text-lg font-bold text-neutral-900">{formatCurrency(monthBreakdown.totalRevenue)}</p>
                      </div>
                      <div className="rounded-[18px] bg-secondary/30 p-3">
                        <p className="text-xs text-muted-foreground">Jobs completed</p>
                        <p className="text-lg font-bold text-neutral-900">{monthBreakdown.dealCount}</p>
                      </div>
                      <div className="rounded-[18px] bg-secondary/30 p-3">
                        <p className="text-xs text-muted-foreground">Avg deal value</p>
                        <p className="text-lg font-bold text-neutral-900">{formatCurrency(monthBreakdown.avgDealValue)}</p>
                      </div>
                      {monthBreakdown.largestDeal && (
                        <div className="rounded-[18px] bg-secondary/30 p-3">
                          <p className="text-xs text-muted-foreground">Largest deal</p>
                          <p className="text-sm font-bold text-neutral-900">{formatCurrency(monthBreakdown.largestDeal.revenue)}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{monthBreakdown.largestDeal.title}</p>
                        </div>
                      )}
                    </div>

                    {monthBreakdown.bySource.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">By source</p>
                        <div className="flex gap-2 flex-wrap">
                          {monthBreakdown.bySource.map((source) => (
                            <div key={source.source} className="rounded-[18px] bg-secondary/40 px-3 py-2 text-xs">
                              <span className="font-medium text-neutral-900">{source.source}</span>
                              <span className="text-muted-foreground ml-2">{source.count} job{source.count !== 1 ? "s" : ""}</span>
                              <span className="text-emerald-700 ml-2 font-semibold">{formatCurrency(source.revenue)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Completed jobs</p>
                      <div className="max-h-64 overflow-auto space-y-2 pr-1">
                        {monthBreakdown.deals.length === 0 && <p className="text-sm text-muted-foreground py-4">No completed jobs this month.</p>}
                        {monthBreakdown.deals.map((deal) => (
                          <div key={deal.id} className="flex items-center justify-between rounded-[18px] bg-secondary/30 p-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-neutral-900 truncate">{deal.title}</p>
                              <p className="text-xs text-muted-foreground">{deal.contactName} - {deal.source}</p>
                            </div>
                            <div className="text-right shrink-0 ml-3">
                              <p className="text-sm font-semibold text-emerald-700">{formatCurrency(deal.revenue)}</p>
                              <p className="text-[11px] text-muted-foreground">{formatShortDate(deal.completedAt)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
            </Card>
          )}

          {customersExpanded && (
            <Card className="rounded-[18px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-neutral-900">
              <Star className="h-4 w-4 text-amber-500" />
              Customer Ratings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-[18px] bg-secondary/30 p-4">
                  <p className="text-xs font-medium text-neutral-500">Avg rating</p>
                  <p className="text-3xl font-bold text-neutral-900 mt-1">{data.customers.satisfaction}</p>
                </div>
                <div className="rounded-[18px] bg-secondary/30 p-4">
                  <p className="text-xs font-medium text-neutral-500">Total ratings</p>
                  <p className="text-3xl font-bold text-neutral-900 mt-1">{data.customers.ratingCount}</p>
                </div>
                <div className="rounded-[18px] bg-secondary/30 p-4">
                  <p className="text-xs font-medium text-neutral-500">New customers</p>
                  <p className="text-3xl font-bold text-neutral-900 mt-1">{data.customers.inRange}</p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-neutral-900">Ratings distribution</p>
                <div className="rounded-[18px] bg-secondary/30 p-3">
                  {(() => {
                    const distribution = data.customers.ratingDistribution
                    const maxCount = Math.max(...distribution.map((item) => item.count), 1)
                    const W = 640
                    const H = 180
                    const PAD_LEFT = 24
                    const PAD_RIGHT = 20
                    const PAD_TOP = 16
                    const PAD_BOTTOM = 28
                    const chartW = W - PAD_LEFT - PAD_RIGHT
                    const chartH = H - PAD_TOP - PAD_BOTTOM

                    const points = distribution.map(({ score, count }, index) => ({
                      x: PAD_LEFT + (distribution.length > 1 ? (index / (distribution.length - 1)) * chartW : chartW / 2),
                      y: PAD_TOP + (maxCount > 0 ? (1 - count / maxCount) * chartH : chartH),
                      score,
                      count,
                    }))

                    const fillPoly = `${PAD_LEFT},${PAD_TOP + chartH} ${points.map((point) => `${point.x},${point.y}`).join(" ")} ${PAD_LEFT + chartW},${PAD_TOP + chartH}`

                    return (
                      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-44">
                        <polygon points={fillPoly} fill="rgba(0,210,139,0.12)" />
                        <polyline
                          points={points.map((point) => `${point.x},${point.y}`).join(" ")}
                          fill="none"
                          stroke="#00D28B"
                          strokeWidth={2.2}
                          strokeLinejoin="round"
                          strokeLinecap="round"
                        />
                        {points.map((point) => (
                          <g key={point.score}>
                            <circle cx={point.x} cy={point.y} r={5} fill="#00D28B" stroke="white" strokeWidth={2} />
                            <text x={point.x} y={H - 8} textAnchor="middle" className="fill-slate-500" fontSize={11}>
                              {point.score}
                            </text>
                          </g>
                        ))}
                      </svg>
                    )
                  })()}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-neutral-900">Latest feedback</p>
                {data.customers.latestFeedback.length > 0 ? (
                  <div className="space-y-3 max-h-72 overflow-auto pr-1">
                    {data.customers.latestFeedback.map((feedback) => (
                      <div key={feedback.id} className="rounded-[18px] bg-secondary/30 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-medium text-neutral-900">{feedback.contactName}</p>
                          <p className="text-xs text-muted-foreground">{new Date(feedback.createdAt).toLocaleDateString("en-AU")}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Score {feedback.score}/10</p>
                        <p className="text-sm text-neutral-800 mt-2">{feedback.comment ? feedback.comment : "No comment provided"}</p>
                        <p className="text-xs text-muted-foreground mt-2">{feedback.dealTitle}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No feedback yet in this range.</p>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-neutral-900">Satisfaction trend</p>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                  {data.customers.monthlySatisfaction.map((month, index) => (
                    <div key={`${month.month}-${index}`} className="rounded-[18px] bg-secondary/30 p-3">
                      <p className="text-xs text-muted-foreground">{month.month}</p>
                      <p className="text-sm font-medium text-neutral-900 mt-1">{month.count > 0 ? month.avg : "-"}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">{month.count} rating{month.count === 1 ? "" : "s"}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
            </Card>
          )}

          <Card className="rounded-[18px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-neutral-900">
            <CheckCircle className="h-4 w-4" />
            Jobs overview
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Completed, scheduled, and new requests in the selected date range.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
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

          {data.team.performance.length > 0 && (
            <Card className="rounded-[18px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-neutral-900">
              <Users className="h-4 w-4" />
              Team Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.team.performance.map((member, index) => (
                <div key={index} className="flex items-center justify-between rounded-[18px] bg-secondary/50 p-3">
                  <div>
                    <p className="font-medium text-neutral-900">{member.name}</p>
                    <p className="text-sm text-muted-foreground">{member.jobs} jobs</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-primary">{formatCurrency(member.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
