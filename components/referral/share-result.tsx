"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Share2, Copy } from "lucide-react"
import { toast } from "sonner"
import { createReferralLink } from "@/actions/referral-actions"

interface ShareResultProps {
  title?: string
  description?: string
  className?: string
  userId: string
  variant?: "inline" | "button" | "link"
}

export function ShareResult({ 
  title = "Share this result", 
  description, 
  className = "",
  userId,
  variant = "link"
}: ShareResultProps) {
  const [referralLink, setReferralLink] = useState("")
  const [isSharing, setIsSharing] = useState(false)

  const handleShare = async () => {
    setIsSharing(true)
    try {
      const { referralLink: link } = await createReferralLink({ userId })
      setReferralLink(link)
      
      if (navigator.share) {
        await navigator.share({
          title: title,
          text: description || `Check out this result from Earlymark!`,
          url: link,
        })
      } else {
        // Fallback to copying to clipboard
        await navigator.clipboard.writeText(link)
        toast.success("Link copied to clipboard!")
      }
    } catch (error) {
      console.error("Error sharing:", error)
      toast.error("Failed to share")
    } finally {
      setIsSharing(false)
    }
  }

  const copyLink = async () => {
    if (!referralLink) {
      try {
        const { referralLink: link } = await createReferralLink({ userId })
        setReferralLink(link)
        await navigator.clipboard.writeText(link)
        toast.success("Link copied to clipboard!")
      } catch (error) {
        console.error("Error copying link:", error)
        toast.error("Failed to copy link")
      }
    } else {
      await navigator.clipboard.writeText(referralLink)
      toast.success("Link copied to clipboard!")
    }
  }

  if (variant === "inline") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-sm text-gray-600">{title}:</span>
        <Button
          onClick={copyLink}
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
        >
          <Copy className="h-3 w-3 mr-1" />
          Copy link
        </Button>
      </div>
    )
  }

  if (variant === "button") {
    return (
      <Button
        onClick={handleShare}
        variant="outline"
        size="sm"
        disabled={isSharing}
        className={className}
      >
        <Share2 className="h-4 w-4 mr-2" />
        {isSharing ? "Sharing..." : title}
      </Button>
    )
  }

  return (
    <button
      onClick={copyLink}
      className={`text-blue-600 hover:text-blue-800 underline text-sm ${className}`}
    >
      {title}
    </button>
  )
}
