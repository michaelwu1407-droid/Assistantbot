import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams
    const code = searchParams.get("code")
    const error = searchParams.get("error")

    if (error) {
        return NextResponse.redirect(new URL(`/dashboard/settings?error=${error}`, req.url))
    }

    if (!code) {
        return NextResponse.redirect(new URL("/dashboard/settings?error=no_code", req.url))
    }

    // STUB: Valid exchange logic would go here
    // 1. Exchange code for tokens
    // 2. Store tokens in DB (User/Workspace)
    // 3. Redirect to settings with success

    // Simulate success
    return NextResponse.redirect(new URL("/dashboard/settings?success=google_connected", req.url))
}
