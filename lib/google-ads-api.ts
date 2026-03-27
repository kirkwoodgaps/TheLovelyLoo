// Direct Google Ads API integration
// Uses OAuth 2.0 with refresh token for authentication

interface GoogleAdsCredentials {
  clientId: string
  clientSecret: string
  developerToken: string
  customerId: string
  managerCustomerId: string
  refreshToken: string
}

interface CampaignMetrics {
  campaign: string
  impressions: number
  clicks: number
  cost: number
  conversions: number
}

interface DailyMetrics {
  date: string
  impressions: number
  clicks: number
  cost: number
  conversions: number
}

export interface GoogleAdsData {
  hasData: boolean
  summary: {
    totalSpend: number
    totalConversions: number
    totalClicks: number
    totalImpressions: number
  }
  campaigns: CampaignMetrics[]
  daily: DailyMetrics[]
}

async function getAccessToken(credentials: GoogleAdsCredentials): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      refresh_token: credentials.refreshToken,
      grant_type: "refresh_token",
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get access token: ${error}`)
  }

  const data = await response.json()
  return data.access_token
}

async function queryGoogleAds(
  credentials: GoogleAdsCredentials,
  accessToken: string,
  query: string
): Promise<any[]> {
  const customerId = credentials.customerId.replace(/-/g, "")
  const managerCustomerId = credentials.managerCustomerId.replace(/-/g, "")
  
  // Try multiple API versions in case one works
  const apiVersions = ["v16", "v15", "v14"]
  
  for (const version of apiVersions) {
    const url = `https://googleads.googleapis.com/${version}/customers/${customerId}/googleAds:search`
    
    const headers: Record<string, string> = {
      "Authorization": `Bearer ${accessToken}`,
      "developer-token": credentials.developerToken,
      "Content-Type": "application/json",
    }
    
    // Add manager customer ID header if provided (required for MCC accounts)
    if (managerCustomerId) {
      headers["login-customer-id"] = managerCustomerId
    }
    
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ query }),
    })
    
    if (response.ok) {
      const data = await response.json()
      return data.results || []
    }
    
    // If 404, try next version
    if (response.status === 404) {
      continue
    }
    
    // For other errors, get details
    const error = await response.text()
    
    // If it's an auth/permission error, don't try other versions
    if (response.status === 401 || response.status === 403) {
      throw new Error(`Google Ads API auth error: ${error}`)
    }
  }
  
  throw new Error("All Google Ads API versions failed")
}

export async function fetchGoogleAdsData(): Promise<GoogleAdsData | null> {
  const credentials: GoogleAdsCredentials = {
    clientId: process.env.GOOGLE_ADS_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET || "",
    developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "",
    customerId: process.env.GOOGLE_ADS_CUSTOMER_ID || "",
    managerCustomerId: process.env.GOOGLE_ADS_MANAGER_CUSTOMER_ID || "",
    refreshToken: process.env.GOOGLE_ADS_REFRESH_TOKEN || "",
  }

  // Check if all credentials are configured
  if (!credentials.clientId || !credentials.clientSecret || !credentials.developerToken || 
      !credentials.customerId || !credentials.refreshToken) {
    return null
  }

  try {
    const accessToken = await getAccessToken(credentials)

    // Query for campaign metrics (last 90 days)
    const campaignQuery = `
      SELECT
        campaign.name,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions
      FROM campaign
      WHERE segments.date DURING LAST_90_DAYS
        AND campaign.status = 'ENABLED'
    `

    // Query for daily metrics (last 90 days)
    const dailyQuery = `
      SELECT
        segments.date,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions
      FROM customer
      WHERE segments.date DURING LAST_90_DAYS
    `

    const [campaignResults, dailyResults] = await Promise.all([
      queryGoogleAds(credentials, accessToken, campaignQuery),
      queryGoogleAds(credentials, accessToken, dailyQuery),
    ])

    // Aggregate campaign metrics
    const campaignMap = new Map<string, CampaignMetrics>()
    for (const result of campaignResults) {
      const name = result.campaign?.name || "Unknown"
      const existing = campaignMap.get(name) || {
        campaign: name,
        impressions: 0,
        clicks: 0,
        cost: 0,
        conversions: 0,
      }
      existing.impressions += parseInt(result.metrics?.impressions || "0", 10)
      existing.clicks += parseInt(result.metrics?.clicks || "0", 10)
      existing.cost += parseInt(result.metrics?.costMicros || "0", 10) / 1_000_000
      existing.conversions += parseFloat(result.metrics?.conversions || "0")
      campaignMap.set(name, existing)
    }
    const campaigns = Array.from(campaignMap.values())

    // Aggregate daily metrics
    const dailyMap = new Map<string, DailyMetrics>()
    for (const result of dailyResults) {
      const date = result.segments?.date || ""
      const existing = dailyMap.get(date) || {
        date,
        impressions: 0,
        clicks: 0,
        cost: 0,
        conversions: 0,
      }
      existing.impressions += parseInt(result.metrics?.impressions || "0", 10)
      existing.clicks += parseInt(result.metrics?.clicks || "0", 10)
      existing.cost += parseInt(result.metrics?.costMicros || "0", 10) / 1_000_000
      existing.conversions += parseFloat(result.metrics?.conversions || "0")
      dailyMap.set(date, existing)
    }
    const daily = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date))

    // Calculate summary
    const totalSpend = daily.reduce((sum, d) => sum + d.cost, 0)
    const totalConversions = daily.reduce((sum, d) => sum + d.conversions, 0)
    const totalClicks = daily.reduce((sum, d) => sum + d.clicks, 0)
    const totalImpressions = daily.reduce((sum, d) => sum + d.impressions, 0)

    return {
      hasData: daily.length > 0 || campaigns.length > 0,
      summary: {
        totalSpend,
        totalConversions,
        totalClicks,
        totalImpressions,
      },
      campaigns,
      daily,
    }
  } catch {
    return null
  }
}
