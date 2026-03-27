import { NextRequest, NextResponse } from "next/server"
import { getGoogleAuthUrl } from "@/lib/google-oauth"

export async function GET(request: NextRequest) {
  // Use configured redirect URI or fall back to request URL
  const redirectUri = process.env.GOOGLE_REDIRECT_URI 
    || `${request.nextUrl.origin}/api/auth/google/callback`
  
  const authUrl = getGoogleAuthUrl(redirectUri)
  return NextResponse.redirect(authUrl)
}
