import { createClient } from "@/lib/supabase/server"

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!

// Scopes for Search Console and GA4
const SCOPES = [
  "https://www.googleapis.com/auth/webmasters.readonly", // Search Console
  "https://www.googleapis.com/auth/analytics.readonly", // GA4
].join(" ")

export function getGoogleAuthUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to exchange code: ${error}`)
  }

  return response.json()
}

export async function refreshAccessToken(refreshToken: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: "refresh_token",
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to refresh token: ${error}`)
  }

  return response.json()
}

export async function getValidAccessToken(service: string): Promise<string | null> {
  const supabase = await createClient()
  
  const { data: tokenData, error } = await supabase
    .from("google_oauth_tokens")
    .select("*")
    .eq("service", service)
    .single()

  if (error || !tokenData) {
    return null
  }

  // Check if token is expired (with 5 min buffer)
  const expiresAt = new Date(tokenData.expires_at)
  const now = new Date()
  const bufferMs = 5 * 60 * 1000

  if (expiresAt.getTime() - bufferMs > now.getTime()) {
    return tokenData.access_token
  }

  // Token expired, refresh it
  try {
    const newTokens = await refreshAccessToken(tokenData.refresh_token)
    const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000)

    await supabase
      .from("google_oauth_tokens")
      .update({
        access_token: newTokens.access_token,
        expires_at: newExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("service", service)

    return newTokens.access_token
  } catch (error) {
    console.error("Failed to refresh token:", error)
    return null
  }
}

export async function saveTokens(
  service: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number
) {
  const supabase = await createClient()
  const expiresAt = new Date(Date.now() + expiresIn * 1000)

  const { error } = await supabase
    .from("google_oauth_tokens")
    .upsert({
      service,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "service" })

  if (error) {
    throw new Error(`Failed to save tokens: ${error.message}`)
  }
}

export async function isConnected(service: string): Promise<boolean> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("google_oauth_tokens")
    .select("id")
    .eq("service", service)
    .single()

  return !error && !!data
}
