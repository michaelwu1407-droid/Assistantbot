import { createReferralLink } from "@/actions/referral-actions"

interface ReferralFooterProps {
  userId: string
  className?: string
}

export async function ReferralFooter({ userId, className = "" }: ReferralFooterProps) {
  try {
    const { referralLink } = await createReferralLink({ userId })
    
    return (
      <div className={`text-center py-6 border-t border-gray-200 ${className}`}>
        <p className="text-sm text-gray-600 mb-3">
          Get <span className="font-semibold text-green-600">$29</span> by referring a friend
        </p>
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs text-gray-500">Share:</span>
          <a
            href={referralLink}
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            {referralLink}
          </a>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Your friend gets $10 off their first month
        </p>
      </div>
    )
  } catch (error) {
    console.error("Error creating referral footer:", error)
    return null
  }
}
