"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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

interface AnalyticsData {
  revenue: {
    total: number
    growth: number
    monthly: Array<{ month: string; revenue: number }>
  }
  deals: {
    total: number
    conversion: number
    byStage: Array<{ stage: string; count: number }>
  }
  customers: {
    total: number
    new: number
    satisfaction: number
  }
  jobs: {
    completed: number
    inProgress: number
    avgCompletionTime: number
  }
  team: {
    members: number
    productivity: number
    performance: Array<{ name: string; jobs: number; revenue: number }>
  }
}

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("30d")
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate loading analytics data
    const mockData: AnalyticsData = {
      revenue: {
        total: 245680,
        growth: 12.5,
        monthly: [
          { month: "Jan", revenue: 18000 },
          { month: "Feb", revenue: 22000 },
          { month: "Mar", revenue: 25000 },
          { month: "Apr", revenue: 28000 },
          { month: "May", revenue: 32000 },
          { month: "Jun", revenue: 35000 }
        ]
      },
      deals: {
        total: 156,
        conversion: 68.5,
        byStage: [
          { stage: "Lead", count: 45 },
          { stage: "Qualified", count: 32 },
          { stage: "Proposal", count: 28 },
          { stage: "Negotiation", count: 18 },
          { stage: "Closed Won", count: 33 }
        ]
      },
      customers: {
        total: 89,
        new: 12,
        satisfaction: 8.7
      },
      jobs: {
        completed: 142,
        inProgress: 8,
        avgCompletionTime: 4.2
      },
      team: {
        members: 5,
        productivity: 92,
        performance: [
          { name: "John Smith", jobs: 45, revenue: 67800 },
          { name: "Sarah Johnson", jobs: 38, revenue: 54200 },
          { name: "Mike Wilson", jobs: 32, revenue: 48500 },
          { name: "Emily Brown", jobs: 27, revenue: 41200 }
        ]
      }
    }

    setTimeout(() => {
      setData(mockData)
      setLoading(false)
    }, 1000)
  }, [timeRange])

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics & Reporting</h1>
          <p className="text-slate-500 text-sm mt-1">Monitor your business performance and team productivity.</p>
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
                <p className="text-sm font-medium text-slate-600">Total Revenue</p>
                <p className="text-2xl font-bold text-slate-900">${data.revenue.total.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-1">
                  {data.revenue.growth > 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  )}
                  <span className={`text-xs ${data.revenue.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(data.revenue.growth)}%
                  </span>
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Deals</p>
                <p className="text-2xl font-bold text-slate-900">{data.deals.total}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Target className="h-3 w-3 text-blue-600" />
                  <span className="text-xs text-blue-600">{data.deals.conversion}% conversion</span>
                </div>
              </div>
              <BarChart3 className="h-8 w-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Customers</p>
                <p className="text-2xl font-bold text-slate-900">{data.customers.total}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Users className="h-3 w-3 text-purple-600" />
                  <span className="text-xs text-purple-600">{data.customers.new} new this month</span>
                </div>
              </div>
              <Users className="h-8 w-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Satisfaction</p>
                <p className="text-2xl font-bold text-slate-900">{data.customers.satisfaction}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="h-3 w-3 text-amber-500" />
                  <span className="text-xs text-amber-600">Average rating</span>
                </div>
              </div>
              <Star className="h-8 w-8 text-slate-400" />
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
                  <div className="flex-1 bg-slate-100 rounded-full h-6 relative overflow-hidden">
                    <div 
                      className="absolute left-0 top-0 h-full bg-blue-500 rounded-full"
                      style={{ width: `${(month.revenue / Math.max(...data.revenue.monthly.map(m => m.revenue))) * 100}%` }}
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
                  <div className="flex-1 bg-slate-100 rounded-full h-6 relative overflow-hidden">
                    <div 
                      className={`absolute left-0 top-0 h-full rounded-full ${
                        stage.stage === 'Closed Won' ? 'bg-green-500' :
                        stage.stage === 'Negotiation' ? 'bg-blue-500' :
                        stage.stage === 'Proposal' ? 'bg-purple-500' :
                        stage.stage === 'Qualified' ? 'bg-amber-500' :
                        'bg-gray-500'
                      }`}
                      style={{ width: `${(stage.count / Math.max(...data.deals.byStage.map(s => s.count))) * 100}%` }}
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
                <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto mb-2">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-slate-900">{data.jobs.completed}</p>
                <p className="text-xs text-slate-600">Completed</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mx-auto mb-2">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-slate-900">{data.jobs.inProgress}</p>
                <p className="text-xs text-slate-600">In Progress</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mx-auto mb-2">
                  <Calendar className="h-6 w-6 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-slate-900">{data.jobs.avgCompletionTime}</p>
                <p className="text-xs text-slate-600">Avg Days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Performance */}
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
                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900">{member.name}</p>
                    <p className="text-sm text-slate-600">{member.jobs} jobs completed</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-green-600">${member.revenue.toLocaleString()}</p>
                    <p className="text-xs text-slate-600">revenue</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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
