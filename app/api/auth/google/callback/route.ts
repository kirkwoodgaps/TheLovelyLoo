import { NextRequest, NextResponse } from "next/server"
import { exchangeCodeForTokens, saveTokens } from "@/lib/google-oauth"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  if (error) {
    return NextResponse.redirect(new URL(`/?error=${error}`, request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL("/?error=no_code", request.url))
  }

  try {
    // Use configured redirect URI or fall back to request URL
    const redirectUri = process.env.GOOGLE_REDIRECT_URI 
      || `${request.nextUrl.origin}/api/auth/google/callback`

    const tokens = await exchangeCodeForTokens(code, redirectUri)

    // Save tokens for both services (they share the same OAuth consent)
    await saveTokens("google_analytics", tokens.access_token, tokens.refresh_token, tokens.expires_in)
    await saveTokens("search_console", tokens.access_token, tokens.refresh_token, tokens.expires_in)

    return NextResponse.redirect(new URL("/?connected=google", request.url))
  } catch (err) {
    console.error("OAuth callback error:", err)
    return NextResponse.redirect(new URL("/?error=oauth_failed", request.url))
  }
}
