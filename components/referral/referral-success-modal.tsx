"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Copy, Share2, X, Twitter, Linkedin, MessageCircle } from "lucide-react"
import { toast } from "sonner"
import { createReferralLink, getReferralStats } from "@/actions/referral-actions"

interface ReferralSuccessModalProps {
  isOpen: boolean
  onClose: () => void
  trigger: "onboarding" | "keyAction" | "purchase"
  userId: string
}

export function ReferralSuccessModal({ isOpen, onClose, trigger, userId }: ReferralSuccessModalProps) {
  const [referralLink, setReferralLink] = useState("")
  const [referralStats, setReferralStats] = useState<any>(null)
  const [isCopied, setIsCopied] = useState(false)

  useEffect(() => {
    if (isOpen && userId) {
      loadReferralData()
    }
  }, [isOpen, userId])

  const loadReferralData = async () => {
    try {
      const { referralLink: link } = await createReferralLink({ userId })
      const stats = await getReferralStats(userId)
      
      setReferralLink(link)
      setReferralStats(stats)
    } catch (error) {
      console.error("Error loading referral data:", error)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      setIsCopied(true)
      toast.success("Referral link copied to clipboard!")
      
      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      toast.error("Failed to copy link")
    }
  }

  const shareOnSocial = (platform: string) => {
    const shareText = `Check out Earlymark - the AI-powered CRM that's transforming how businesses communicate! ${referralLink}`
    
    let url = ""
    switch (platform) {
      case "twitter":
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`
        break
      case "linkedin":
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`
        break
      case "whatsapp":
        url = `https://wa.me/?text=${encodeURIComponent(shareText)}`
        break
    }
    
    if (url) {
      window.open(url, "_blank", "width=600,height=400")
    }
  }

  const getTriggerMessage = () => {
    switch (trigger) {
      case "onboarding":
        return "🎉 Welcome to Earlymark! You're all set up."
      case "keyAction":
        return "🚀 Great job! You've unlocked a new milestone."
      case "purchase":
        return "💎 Thank you for upgrading to Earlymark Pro!"
      default:
        return "✨ You're doing great!"
    }
  }

  const getRewardText = () => {
    if (referralStats?.totalEarned > 0) {
      return `You've earned $${referralStats.totalEarned.toFixed(2)} so far!`
    }
    return "Get $29 for every friend who upgrades to Pro."
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-white">
        <CardHeader className="relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <CardTitle className="text-center">Share Earlymark & Earn Rewards</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">
              {getTriggerMessage()}
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {getRewardText()}
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Your referral link:</span>
              <Badge variant="secondary" className="text-xs">
                {referralStats?.totalReferrals || 0} referrals
              </Badge>
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

          <div className="space-y-2">
            <div className="text-sm font-medium text-center">Or share on social media:</div>
            <div className="flex justify-center gap-2">
              <Button
                onClick={() => shareOnSocial("twitter")}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Twitter className="h-4 w-4" />
                <span className="hidden sm:inline">X</span>
              </Button>
              <Button
                onClick={() => shareOnSocial("linkedin")}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Linkedin className="h-4 w-4" />
                <span className="hidden sm:inline">LinkedIn</span>
              </Button>
              <Button
                onClick={() => shareOnSocial("whatsapp")}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                <span className="hidden sm:inline">WhatsApp</span>
              </Button>
            </div>
          </div>

          {referralStats && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <div className="font-semibold text-green-900">
                    {referralStats.totalClicks}
                  </div>
                  <div className="text-green-600">Clicks</div>
                </div>
                <div>
                  <div className="font-semibold text-green-900">
                    {referralStats.totalSignups}
                  </div>
                  <div className="text-green-600">Signups</div>
                </div>
                <div>
                  <div className="font-semibold text-green-900">
                    ${referralStats.totalEarned.toFixed(0)}
                  </div>
                  <div className="text-green-600">Earned</div>
                </div>
              </div>
            </div>
          )}

          <div className="pt-2 border-t">
            <Button
              onClick={onClose}
              className="w-full"
              variant="outline"
            >
              Got it, thanks!
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
