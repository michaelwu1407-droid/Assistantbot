import { NextRequest, NextResponse } from "next/server"
import { trackReferralClick } from "@/actions/referral-actions"

export async function middleware(request: NextRequest) {
  const url = request.nextUrl
  const { searchParams } = url

  // Check for referral parameter
  const refCode = searchParams.get('ref')
  
  if (refCode) {
    // Track the referral click
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const referrer = request.headers.get('referer') || 'direct'
    
    // Extract UTM parameters
    const utmSource = searchParams.get('utm_source') || undefined
    const utmMedium = searchParams.get('utm_medium') || undefined
    const utmCampaign = searchParams.get('utm_campaign') || undefined

    try {
      await trackReferralClick({
        referralCode: refCode,
        ipAddress,
        userAgent,
        referrer,
        utmSource,
        utmMedium,
        utmCampaign
      })
    } catch (error) {
      console.error("Error tracking referral click:", error)
      // Don't block the request if tracking fails
    }

    // Store referral info in session cookie for later use
    const response = NextResponse.next()
    response.cookies.set('referral_code', refCode, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 // 30 days
    })
    
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
