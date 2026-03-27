import { getValidAccessToken, isConnected } from "@/lib/google-oauth"

const SEARCH_CONSOLE_API = "https://www.googleapis.com/webmasters/v3"

export interface SearchConsoleData {
  hasData: boolean
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
      console.error("Search Console API error")
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

export async function getSearchConsoleSites(): Promise<string[]> {
  const accessToken = await getValidAccessToken("search_console")
  if (!accessToken) {
    return []
  }

  try {
    const response = await fetch(`${SEARCH_CONSOLE_API}/sites`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    return (data.siteEntry || []).map((site: any) => site.siteUrl)
  } catch (error) {
    console.error("Error fetching Search Console sites:", error)
    return []
  }
}
