import { getValidAccessToken, isConnected } from "@/lib/google-oauth"

const GA4_API = "https://analyticsdata.googleapis.com/v1beta"

export interface GA4Data {
  hasData: boolean
  totalSessions: number
  totalUsers: number
  newUsers: number
  totalPageViews: number
  avgSessionDuration: number
  bounceRate: number
  daily: {
    date: string
    sessions: number
    users: number
    pageViews: number
  }[]
  trafficSources: {
    source: string
    medium: string
    sessions: number
    users: number
  }[]
  topPages: {
    page: string
    pageViews: number
    avgTimeOnPage: number
  }[]
}

export async function fetchGA4Data(
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<GA4Data | null> {
  const connected = await isConnected("google_analytics")
  if (!connected) {
    return null
  }

  const accessToken = await getValidAccessToken("google_analytics")
  if (!accessToken) {
    return null
  }

  try {
    // Fetch daily metrics
    const dailyResponse = await fetch(
      `${GA4_API}/properties/${propertyId}:runReport`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "date" }],
          metrics: [
            { name: "sessions" },
            { name: "totalUsers" },
            { name: "screenPageViews" },
          ],
          orderBys: [{ dimension: { dimensionName: "date" } }],
        }),
      }
    )

    // Fetch traffic sources
    const sourcesResponse = await fetch(
      `${GA4_API}/properties/${propertyId}:runReport`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate }],
          dimensions: [
            { name: "sessionSource" },
            { name: "sessionMedium" },
          ],
          metrics: [
            { name: "sessions" },
            { name: "totalUsers" },
          ],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: 10,
        }),
      }
    )

    // Fetch top pages
    const pagesResponse = await fetch(
      `${GA4_API}/properties/${propertyId}:runReport`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "pagePath" }],
          metrics: [
            { name: "screenPageViews" },
            { name: "averageSessionDuration" },
          ],
          orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
          limit: 10,
        }),
      }
    )

    // Fetch overall metrics
    const overallResponse = await fetch(
      `${GA4_API}/properties/${propertyId}:runReport`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate }],
          metrics: [
            { name: "sessions" },
            { name: "totalUsers" },
            { name: "newUsers" },
            { name: "screenPageViews" },
            { name: "averageSessionDuration" },
            { name: "bounceRate" },
          ],
        }),
      }
    )

    if (!dailyResponse.ok || !sourcesResponse.ok || !pagesResponse.ok || !overallResponse.ok) {
      return null
    }

    const dailyData = await dailyResponse.json()
    const sourcesData = await sourcesResponse.json()
    const pagesData = await pagesResponse.json()
    const overallData = await overallResponse.json()

    const daily = (dailyData.rows || []).map((row: any) => {
      const dateStr = row.dimensionValues[0].value
      const formattedDate = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
      return {
        date: formattedDate,
        sessions: parseInt(row.metricValues[0].value) || 0,
        users: parseInt(row.metricValues[1].value) || 0,
        pageViews: parseInt(row.metricValues[2].value) || 0,
      }
    })

    const trafficSources = (sourcesData.rows || []).map((row: any) => ({
      source: row.dimensionValues[0].value || "(direct)",
      medium: row.dimensionValues[1].value || "(none)",
      sessions: parseInt(row.metricValues[0].value) || 0,
      users: parseInt(row.metricValues[1].value) || 0,
    }))

    const topPages = (pagesData.rows || []).map((row: any) => ({
      page: row.dimensionValues[0].value,
      pageViews: parseInt(row.metricValues[0].value) || 0,
      avgTimeOnPage: parseFloat(row.metricValues[1].value) || 0,
    }))

    const overallRow = overallData.rows?.[0]
    const totalSessions = overallRow ? parseInt(overallRow.metricValues[0].value) || 0 : 0
    const totalUsers = overallRow ? parseInt(overallRow.metricValues[1].value) || 0 : 0
    const newUsers = overallRow ? parseInt(overallRow.metricValues[2].value) || 0 : 0
    const totalPageViews = overallRow ? parseInt(overallRow.metricValues[3].value) || 0 : 0
    const avgSessionDuration = overallRow ? parseFloat(overallRow.metricValues[4].value) || 0 : 0
    const bounceRate = overallRow ? parseFloat(overallRow.metricValues[5].value) * 100 || 0 : 0

    return {
      hasData: daily.length > 0,
      totalSessions,
      totalUsers,
      newUsers,
      totalPageViews,
      avgSessionDuration: Math.round(avgSessionDuration),
      bounceRate: Math.round(bounceRate * 100) / 100,
      daily,
      trafficSources,
      topPages,
    }
  } catch (error) {
    console.error("Error fetching GA4 data:", error)
    return null
  }
}

export async function getGA4Properties(): Promise<{ id: string; name: string }[]> {
  const accessToken = await getValidAccessToken("google_analytics")
  if (!accessToken) {
    return []
  }

  try {
    // First get account summaries
    const response = await fetch(
      "https://analyticsadmin.googleapis.com/v1beta/accountSummaries",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    const properties: { id: string; name: string }[] = []

    for (const account of data.accountSummaries || []) {
      for (const property of account.propertySummaries || []) {
        // Extract property ID from resource name (e.g., "properties/123456789")
        const propertyId = property.property.split("/")[1]
        properties.push({
          id: propertyId,
          name: property.displayName,
        })
      }
    }

    return properties
  } catch (error) {
    console.error("Error fetching GA4 properties:", error)
    return []
  }
}
