import { getValidAccessToken, isConnected } from "@/lib/google-oauth"

const SEARCH_CONSOLE_API = "https://www.googleapis.com/webmasters/v3"

export interface SearchConsoleData {
  hasData: boolean
  // When set, explains why no data could be loaded so the UI can guide the user.
  error?: "api_disabled" | "no_property" | "request_failed"
  totalClicks: number
  totalImpressions: number
  avgCtr: number
  avgPosition: number
  topQueries: {
    query: string
    clicks: number
    impressions: number
    ctr: number
    position: number
  }[]
  topPages: {
    page: string
    clicks: number
    impressions: number
    ctr: number
    position: number
  }[]
  daily: {
    date: string
    clicks: number
    impressions: number
  }[]
}

export async function fetchSearchConsoleData(
  siteUrl: string,
  startDate: string,
  endDate: string
): Promise<SearchConsoleData | null> {
  const connected = await isConnected("search_console")
  if (!connected) {
    return null
  }

  const accessToken = await getValidAccessToken("search_console")
  if (!accessToken) {
    return null
  }

  try {
    // Fetch overall metrics with date breakdown
    const dateResponse = await fetch(
      `${SEARCH_CONSOLE_API}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions: ["date"],
          rowLimit: 1000,
        }),
      }
    )

    // Fetch top queries
    const queryResponse = await fetch(
      `${SEARCH_CONSOLE_API}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions: ["query"],
          rowLimit: 10,
        }),
      }
    )

    // Fetch top pages
    const pageResponse = await fetch(
      `${SEARCH_CONSOLE_API}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions: ["page"],
          rowLimit: 10,
        }),
      }
    )

    if (!dateResponse.ok || !queryResponse.ok || !pageResponse.ok) {
      const failed = !dateResponse.ok ? dateResponse : !queryResponse.ok ? queryResponse : pageResponse
      const errorBody = await failed.text().catch(() => "")
      console.error(
        `[v0] Search Console API error: ${failed.status} for site "${siteUrl}" -`,
        errorBody
      )
      return null
    }

    const dateData = await dateResponse.json()
    const queryData = await queryResponse.json()
    const pageData = await pageResponse.json()

    const daily = (dateData.rows || []).map((row: any) => ({
      date: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
    }))

    const topQueries = (queryData.rows || []).map((row: any) => ({
      query: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: Math.round(row.ctr * 10000) / 100,
      position: Math.round(row.position * 10) / 10,
    }))

    const topPages = (pageData.rows || []).map((row: any) => ({
      page: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: Math.round(row.ctr * 10000) / 100,
      position: Math.round(row.position * 10) / 10,
    }))

    const totalClicks = daily.reduce((sum: number, d: any) => sum + d.clicks, 0)
    const totalImpressions = daily.reduce((sum: number, d: any) => sum + d.impressions, 0)
    const avgCtr = totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 10000) / 100 : 0
    const avgPosition = topQueries.length > 0 
      ? Math.round(topQueries.reduce((sum: number, q: any) => sum + q.position, 0) / topQueries.length * 10) / 10 
      : 0

    return {
      hasData: daily.length > 0,
      totalClicks,
      totalImpressions,
      avgCtr,
      avgPosition,
      topQueries,
      topPages,
      daily,
    }
  } catch (error) {
    console.error("Error fetching Search Console data:", error)
    return null
  }
}

// Resolves the right site URL automatically, then fetches data.
// Search Console properties are identified as either a URL-prefix property
// ("https://thelovelyloo.com/") or a domain property ("sc-domain:thelovelyloo.com").
// A bare domain like "thelovelyloo.com" is INVALID and returns 403, so we always
// validate against the account's actual verified properties.
export async function fetchSearchConsoleDataAuto(
  startDate: string,
  endDate: string
): Promise<SearchConsoleData | null> {
  const connected = await isConnected("search_console")
  if (!connected) {
    return null
  }

  const emptyData: SearchConsoleData = {
    hasData: false,
    totalClicks: 0,
    totalImpressions: 0,
    avgCtr: 0,
    avgPosition: 0,
    topQueries: [],
    topPages: [],
    daily: [],
  }

  // Get the list of properties this account actually has verified access to.
  const { sites, apiDisabled } = await getSearchConsoleSites()
  console.log("[v0] Search Console verified sites:", sites, "apiDisabled:", apiDisabled)

  if (apiDisabled) {
    return { ...emptyData, error: "api_disabled" }
  }

  if (sites.length === 0) {
    console.log("[v0] Search Console: no verified sites found for this account")
    return { ...emptyData, error: "no_property" }
  }

  const envSite = (process.env.SEARCH_CONSOLE_SITE_URL || "").trim()

  // Normalize a candidate to compare against the verified list (strip protocol,
  // trailing slash, and the sc-domain: prefix, lowercased).
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/^sc-domain:/, "")
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "")

  let siteUrl = ""

  if (envSite) {
    // Try to match the env var to a real verified property, regardless of the
    // exact format the user entered (bare domain, with/without protocol, etc.).
    const target = normalize(envSite)
    siteUrl =
      // exact match first
      sites.find((s) => s === envSite) ||
      // then match by normalized host
      sites.find((s) => normalize(s) === target) ||
      ""
    if (!siteUrl) {
      console.log(
        `[v0] Search Console: env SEARCH_CONSOLE_SITE_URL="${envSite}" did not match any verified property; falling back to auto-detect`
      )
    }
  }

  if (!siteUrl) {
    // Prefer a property matching the business domain, then a domain property,
    // then the first verified property.
    siteUrl =
      sites.find((s) => normalize(s).includes("thelovelyloo")) ||
      sites.find((s) => s.startsWith("sc-domain:")) ||
      sites[0]
  }

  console.log("[v0] Search Console: querying property:", siteUrl)
  return fetchSearchConsoleData(siteUrl, startDate, endDate)
}

export async function getSearchConsoleSites(): Promise<{
  sites: string[]
  apiDisabled: boolean
}> {
  const accessToken = await getValidAccessToken("search_console")
  if (!accessToken) {
    return { sites: [], apiDisabled: false }
  }

  try {
    const response = await fetch(`${SEARCH_CONSOLE_API}/sites`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "")
      console.error(`[v0] Search Console /sites error: ${response.status} -`, errorBody)
      // A 403 mentioning the API being disabled / not enabled means the
      // Search Console API hasn't been turned on in the Google Cloud project.
      const apiDisabled =
        response.status === 403 &&
        /searchconsole\.googleapis\.com|accessNotConfigured|has not been used|disabled/i.test(errorBody)
      return { sites: [], apiDisabled }
    }

    const data = await response.json()
    return {
      sites: (data.siteEntry || []).map((site: any) => site.siteUrl),
      apiDisabled: false,
    }
  } catch (error) {
    console.error("Error fetching Search Console sites:", error)
    return { sites: [], apiDisabled: false }
  }
}
