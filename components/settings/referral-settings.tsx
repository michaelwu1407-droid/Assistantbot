"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Copy, Users, DollarSign, TrendingUp } from "lucide-react"
import { toast } from "sonner"
import { createReferralLink, getReferralStats, getActiveReferralProgram } from "@/actions/referral-actions"

export function ReferralSettings({ userId }: { userId: string }) {
  const [stats, setStats] = useState<any>(null)
  const [referralLink, setReferralLink] = useState("")
  const [program, setProgram] = useState<any>(null)
  const [isCopied, setIsCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadReferralData()
  }, [userId])

  const loadReferralData = async () => {
    setIsLoading(true)
    try {
      const [statsData, linkData, programData] = await Promise.all([
        getReferralStats(userId),
        createReferralLink({ userId }),
        getActiveReferralProgram(),
      ])

      setStats(statsData)
      setReferralLink(linkData.referralLink)
      setProgram(programData)
    } catch (error) {
      console.error("Error loading referral data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      setIsCopied(true)
      toast.success("Referral link copied to clipboard!")
      setTimeout(() => setIsCopied(false), 2000)
    } catch {
      toast.error("Failed to copy link")
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-8 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Referral Program
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {program ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-green-900">{program.name}</h3>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Active
                </Badge>
              </div>
              <p className="text-sm text-green-700">
                Refer a tradie and both accounts get 50% off. Every successful referral adds one more month at half-price for you.
              </p>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <div className="text-xs text-green-600">You earn</div>
                  <div className="font-semibold text-green-900">50% off for 1 month per referral</div>
                </div>
                <div>
                  <div className="text-xs text-green-600">They get</div>
                  <div className="font-semibold text-green-900">50% off first month</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-4">No active referral program</div>
          )}
        </CardContent>
      </Card>

      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Your Referral Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-900">{stats.totalClicks}</div>
                <div className="text-xs text-gray-600">Total Clicks</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-900">{stats.totalSignups}</div>
                <div className="text-xs text-gray-600">Signups</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-900">{stats.totalConversions}</div>
                <div className="text-xs text-gray-600">Conversions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-900">{stats.totalConversions}</div>
                <div className="text-xs text-gray-600">Months at 50% off</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-600" />
            Your Referral Link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Share this link:</span>
              <Badge variant="secondary">{stats?.totalReferrals || 0} referrals</Badge>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={referralLink}
                readOnly
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white"
              />
              <Button
                onClick={copyToClipboard}
                variant={isCopied ? "default" : "outline"}
                size="sm"
                className="shrink-0"
              >
                {isCopied ? (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="text-xs text-gray-500">
            Share this link with friends. Each successful referral adds one more month at 50% off your subscription.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
