import { createClient } from "@/lib/supabase/server"

interface ImportedMetric {
  date: string
  campaign: string
  cost: number
  clicks: number
  impressions: number
  conversions: number
  ctr: number
  cost_per_conversion: number
}

interface DailyData {
  date: string
  spend: number
  clicks: number
  impressions: number
  conversions: number
}

interface MonthlyData {
  month: string
  spend: number
  clicks: number
  impressions: number
  conversions: number
}

interface CampaignData {
  name: string
  spend: number
  impressions: number
  clicks: number
  conversions: number
  ctr: number
  phoneCalls: number
}

export interface ImportedGoogleAdsData {
  hasData: boolean
  totalSpend: number
  totalConversions: number
  totalClicks: number
  totalImpressions: number
  avgCtr: number
  costPerConversion: number
  daily: DailyData[]
  monthly: MonthlyData[]
  campaigns: CampaignData[]
  callRecords: never[]
}

export async function fetchImportedGoogleAdsMetrics(): Promise<ImportedGoogleAdsData | null> {
  try {
    const supabase = await createClient()
    
    // Supabase has a 1000 row default limit - paginate to get all rows
    const allMetrics: ImportedMetric[] = []
    let offset = 0
    const pageSize = 1000
    
    while (true) {
      const { data: page, error } = await supabase
        .from("google_ads_metrics")
        .select("*")
        .order("date", { ascending: true })
        .range(offset, offset + pageSize - 1)

      if (error) {
        console.error("Error fetching imported Google Ads metrics:", error)
        return null
      }

      if (!page || page.length === 0) {
        break
      }
      
      allMetrics.push(...(page as ImportedMetric[]))
      
      // If we got less than a full page, we're done
      if (page.length < pageSize) {
        break
      }
      
      offset += pageSize
    }
    
    const metrics = allMetrics

    if (!metrics || metrics.length === 0) {
      return null
    }
    
    console.log("[v0] Imported metrics count:", metrics.length)
    console.log("[v0] Imported metrics date range:", metrics[0]?.date, "to", metrics[metrics.length - 1]?.date)

    // Aggregate daily data (combine all campaigns per day)
    const dailyMap = new Map<string, DailyData>()
    for (const m of metrics as ImportedMetric[]) {
      const existing = dailyMap.get(m.date) || { date: m.date, spend: 0, clicks: 0, impressions: 0, conversions: 0 }
      existing.spend += Number(m.cost) || 0
      existing.clicks += Number(m.clicks) || 0
      existing.impressions += Number(m.impressions) || 0
      existing.conversions += Number(m.conversions) || 0
      dailyMap.set(m.date, existing)
    }
    const daily = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date))

    // Aggregate monthly data
    const monthlyMap = new Map<string, MonthlyData>()
    for (const d of daily) {
      const month = d.date.substring(0, 7) // YYYY-MM
      const existing = monthlyMap.get(month) || { month, spend: 0, clicks: 0, impressions: 0, conversions: 0 }
      existing.spend += d.spend
      existing.clicks += d.clicks
      existing.impressions += d.impressions
      existing.conversions += d.conversions
      monthlyMap.set(month, existing)
    }
    const monthly = Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month))

    // Aggregate by campaign
    const campaignMap = new Map<string, CampaignData>()
    for (const m of metrics as ImportedMetric[]) {
      const campaignName = m.campaign || "Unknown Campaign"
      const existing = campaignMap.get(campaignName) || { 
        name: campaignName, spend: 0, impressions: 0, clicks: 0, conversions: 0, ctr: 0, phoneCalls: 0 
      }
      existing.spend += Number(m.cost) || 0
      existing.clicks += Number(m.clicks) || 0
      existing.impressions += Number(m.impressions) || 0
      existing.conversions += Number(m.conversions) || 0
      campaignMap.set(campaignName, existing)
    }
    // Calculate CTR for each campaign
    const campaigns = Array.from(campaignMap.values()).map(c => ({
      ...c,
      ctr: c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,
    }))

    // Calculate totals
    const totalSpend = daily.reduce((s, d) => s + d.spend, 0)
    const totalClicks = daily.reduce((s, d) => s + d.clicks, 0)
    const totalImpressions = daily.reduce((s, d) => s + d.impressions, 0)
    const totalConversions = daily.reduce((s, d) => s + d.conversions, 0)

    return {
      hasData: true,
      totalSpend,
      totalConversions,
      totalClicks,
      totalImpressions,
      avgCtr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      costPerConversion: totalConversions > 0 ? totalSpend / totalConversions : 0,
      daily,
      monthly,
      campaigns,
      callRecords: [],
    }
  } catch (error) {
    console.error("Error in fetchImportedGoogleAdsMetrics:", error)
    return null
  }
}
