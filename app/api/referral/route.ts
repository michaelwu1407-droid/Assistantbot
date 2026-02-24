import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { createReferralLink, getReferralStats, trackReferralClick, getActiveReferralProgram } from "@/actions/referral-actions"

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'stats':
        const stats = await getReferralStats(user.id)
        return NextResponse.json(stats)
      
      case 'program':
        const program = await getActiveReferralProgram()
        return NextResponse.json(program)
      
      default:
        // Return referral link and stats
        const [userStats, activeProgram] = await Promise.all([
          getReferralStats(user.id),
          getActiveReferralProgram()
        ])
        
        const { referralLink } = await createReferralLink({ userId: user.id })
        
        return NextResponse.json({
          referralLink,
          stats: userStats,
          program: activeProgram
        })
    }
  } catch (error) {
    console.error("Referral API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'create-link':
        const { referralLink } = await createReferralLink({ userId: user.id })
        return NextResponse.json({ referralLink })
      
      case 'track-click':
        const { referralCode, ipAddress, userAgent, referrer, utmSource, utmMedium, utmCampaign } = body
        const result = await trackReferralClick({
          referralCode,
          ipAddress,
          userAgent,
          referrer,
          utmSource,
          utmMedium,
          utmCampaign
        })
        return NextResponse.json(result)
      
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Referral API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
