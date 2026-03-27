import { NextRequest, NextResponse } from "next/server"
import { getGoogleAuthUrl } from "@/lib/google-oauth"

export async function GET(request: NextRequest) {
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const redirectUri = `${baseUrl}/api/auth/google/callback`
  
  const authUrl = getGoogleAuthUrl(redirectUri)
  return NextResponse.redirect(authUrl)
}
