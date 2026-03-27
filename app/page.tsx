import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { KpiCards } from "@/components/dashboard/kpi-cards"
import { LeadsOverTimeChart } from "@/components/dashboard/leads-over-time-chart"

import { LeadSourcesChart } from "@/components/dashboard/lead-sources-chart"
import { WeeklyActivity } from "@/components/dashboard/weekly-activity"
import { CampaignTables } from "@/components/dashboard/campaign-tables"
import { RecentLeadsTable } from "@/components/dashboard/recent-leads-table"
import { DataImport } from "@/components/dashboard/data-import"
import { ImportedCallsTable } from "@/components/dashboard/imported-calls-table"
import { ImportedContactsTable } from "@/components/dashboard/imported-contacts-table"
import { MatchedContactsTable } from "@/components/dashboard/matched-contacts-table"
import { getDashboardData } from "@/lib/gravity-forms"
import { fetchGoogleAdsSummary } from "@/lib/google-ads"
import { fetchGoogleAdsData } from "@/lib/google-ads-api"
import { fetchImportedGoogleAdsMetrics } from "@/lib/google-ads-imported"

const RANGE_CONFIG: Record<string, { days: number; label: string }> = {
  "7days": { days: 7, label: "Last 7 days" },
  "30days": { days: 30, label: "Last 30 days" },
  "3months": { days: 90, label: "Last 3 months" },
  "6months": { days: 180, label: "Last 6 months" },
  "12months": { days: 365, label: "Last 12 months" },
  "alltime": { days: 99999, label: "All time" },
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const { range = "6months" } = await searchParams
  const { days: cutoffDays, label: rangeLabel } = RANGE_CONFIG[range] ?? RANGE_CONFIG["6months"]

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - cutoffDays)

  const [gfResult, googleAdsSheetResult, googleAdsApiResult, googleAdsImportedResult] = await Promise.allSettled([
    getDashboardData(),
    fetchGoogleAdsSummary(),
    fetchGoogleAdsData(), // Direct API (preferred if credentials configured)
    fetchImportedGoogleAdsMetrics(), // CSV imported data (second preference)
  ])

  const data = gfResult.status === "fulfilled" ? gfResult.value : null
  const googleAdsFromSheet = googleAdsSheetResult.status === "fulfilled" ? googleAdsSheetResult.value : null
  const googleAdsFromApi = googleAdsApiResult.status === "fulfilled" ? googleAdsApiResult.value : null
  const googleAdsFromImport = googleAdsImportedResult.status === "fulfilled" ? googleAdsImportedResult.value : null
  
  // Priority: Direct API > Imported CSV > Spreadsheet
  const useDirectApi = googleAdsFromApi?.hasData
  const useImported = !useDirectApi && googleAdsFromImport?.hasData
  
  const googleAds = useDirectApi ? {
    hasData: true,
    totalSpend: googleAdsFromApi.summary.totalSpend,
    totalConversions: googleAdsFromApi.summary.totalConversions,
    totalClicks: googleAdsFromApi.summary.totalClicks,
    totalImpressions: googleAdsFromApi.summary.totalImpressions,
    avgCtr: googleAdsFromApi.summary.totalImpressions > 0 
      ? (googleAdsFromApi.summary.totalClicks / googleAdsFromApi.summary.totalImpressions) * 100 
      : 0,
    costPerConversion: googleAdsFromApi.summary.totalConversions > 0
      ? googleAdsFromApi.summary.totalSpend / googleAdsFromApi.summary.totalConversions
      : 0,
    daily: googleAdsFromApi.daily.map(d => ({
      date: d.date,
      spend: d.cost,
      clicks: d.clicks,
      impressions: d.impressions,
      conversions: d.conversions,
    })),
    monthly: aggregateToMonthly(googleAdsFromApi.daily),
    campaigns: googleAdsFromApi.campaigns.map(c => ({
      name: c.campaign,
      spend: c.cost,
      impressions: c.impressions,
      clicks: c.clicks,
      conversions: c.conversions,
      ctr: c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,
      phoneCalls: 0,
    })),
    callRecords: [],
  } : useImported ? googleAdsFromImport : googleAdsFromSheet

  // If both sources failed, show error
  if (!data && !googleAds) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Unable to load dashboard</h1>
          <p className="mt-2 text-muted-foreground">Could not connect to any data source. Please try refreshing.</p>
        </div>
      </main>
    )
  }

  // ── Filter Google Ads to range ───────────────────────────
  const filteredDaily = googleAds?.daily.filter(
    (d) => new Date(d.date) >= cutoffDate
  ) ?? []
  const filteredMonthly = googleAds?.monthly.filter((m) => {
    const d = new Date(m.month + "-01")
    return d >= cutoffDate
  }) ?? []
  const filteredCallRecords = googleAds?.callRecords.filter(
    (c) => new Date(c.date) >= cutoffDate
  ) ?? []

  // Compute range-filtered Google Ads totals from daily data
  const rangeGoogleSpend = filteredDaily.reduce((s, d) => s + d.spend, 0)
  const rangeGoogleClicks = filteredDaily.reduce((s, d) => s + d.clicks, 0)
  const rangeGoogleImpressions = filteredDaily.reduce((s, d) => s + d.impressions, 0)
  const rangeGoogleConversions = filteredDaily.reduce((s, d) => s + d.conversions, 0)

  // ── Filter Gravity Forms leads to range ──────────────────
  // monthlyData uses YYYY-MM format
  const filteredMonthlyLeads = (data?.monthlyData ?? []).filter((m) => {
    const d = new Date(m.month + "-01")
    return d >= cutoffDate
  })
  
  console.log("[v0] monthlyData:", data?.monthlyData)
  console.log("[v0] filteredMonthlyLeads:", filteredMonthlyLeads)
  console.log("[v0] cutoffDate for leads:", cutoffDate)
  const rangeLeadTotal = filteredMonthlyLeads.reduce((s, m) => s + m.total, 0)

  // current month vs previous month (always uses current/prev regardless of range)
  const leadsChange =
    data && data.previousMonthLeads > 0
      ? Math.round(
          ((data.currentMonthLeads - data.previousMonthLeads) /
            data.previousMonthLeads) *
            1000
        ) / 10
      : 0

  // ── KPI data ─────────────────────────────────────────────
  const kpi = {
    totalLeads: data?.totalLeads ?? 0,
    rangeLeads: rangeLeadTotal,
    totalLeadsChange: leadsChange,
    currentMonthLeads: data?.currentMonthLeads ?? 0,
    previousMonthLeads: data?.previousMonthLeads ?? 0,
    formCounts: data?.forms ?? [],
    googleAdsSpend: rangeGoogleSpend,
    googleAdsConversions: rangeGoogleConversions,
    hasGoogleAds: googleAds?.hasData ?? false,
    rangeLabel,
  }

  // ── Google Ads campaign metrics (always 90-day from sheet) ──
  const googleMetrics = googleAds?.hasData
    ? {
        spend: googleAds.totalSpend,
        impressions: googleAds.totalImpressions,
        clicks: googleAds.totalClicks,
        ctr: Math.round(googleAds.avgCtr * 100) / 100,
        conversions: googleAds.totalConversions,
        costPerConversion: googleAds.costPerConversion,
        campaigns: googleAds.campaigns.map((c) => ({
          name: c.name,
          spend: c.spend,
          impressions: c.impressions,
          clicks: c.clicks,
          conversions: c.conversions,
          ctr: Math.round(c.ctr * 100) / 100,
          phoneCalls: c.phoneCalls,
        })),
      }
    : null

  // ── Data source statuses ─────────────────────────────────
  const sources = [
    { name: "Gravity Forms", status: data ? "live" as const : "error" as const },
    { name: "Google Ads", status: googleAds?.hasData ? "live" as const : "pending" as const },
  ]

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        <DashboardHeader sources={sources} currentRange={range} />

        {/* KPI Cards */}
        <section className="mt-6" aria-label="Key performance indicators">
          <KpiCards data={kpi} />
        </section>

        {/* Charts Row */}
        <section
          className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3"
          aria-label="Charts"
        >
          <div className="lg:col-span-2">
            <LeadsOverTimeChart data={filteredMonthlyLeads} />
          </div>
          <div>
            <LeadSourcesChart data={[...(data?.formBreakdown ?? [])].sort((a, b) => b.value - a.value)} />
          </div>
        </section>

        {/* Weekly Activity */}
        <section className="mt-4" aria-label="Weekly activity">
          <WeeklyActivity data={data?.weeklyData ?? []} />
        </section>

        {/* Campaign Performance */}
        <section className="mt-4" aria-label="Campaign performance">
          <CampaignTables googleMetrics={googleMetrics} />
        </section>

        {/* Recent Leads */}
        <section className="mt-4" aria-label="Recent leads">
          <RecentLeadsTable leads={data?.recentLeads ?? []} />
        </section>

        {/* Matched Contacts Section */}
        <section className="mt-8" aria-label="Matched contacts">
          <MatchedContactsTable />
        </section>

        {/* Imported Data Section */}
        <section className="mt-8 space-y-4" aria-label="Imported data">
          <h2 className="text-lg font-semibold text-foreground">Imported Data</h2>
          
          {/* Import Tool */}
          <DataImport />
          
          {/* Imported Call Records (shows only if data exists) */}
          <ImportedCallsTable />
          
          {/* Imported 17hats Contacts (shows only if data exists) */}
          <ImportedContactsTable />
        </section>

        {/* Footer */}
        <footer className="mt-8 border-t border-border/40 pt-4 pb-6">
          <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              Data refreshes every 5 minutes
            </p>
            <p className="text-xs text-muted-foreground">
              thelovelyloo.com &middot; (904) 315-7027
            </p>
          </div>
        </footer>
      </div>
    </main>
  )
}

function formatMonthLabel(yyyyMm: string): string {
  const [year, month] = yyyyMm.split("-")
  const date = new Date(parseInt(year), parseInt(month) - 1)
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
}

// Helper to aggregate daily data to monthly for API data
function aggregateToMonthly(daily: { date: string; cost: number; clicks: number; impressions: number; conversions: number }[]) {
  const monthlyMap = new Map<string, { month: string; spend: number; clicks: number; impressions: number; conversions: number }>()
  
  for (const d of daily) {
    const month = d.date.substring(0, 7) // YYYY-MM
    const existing = monthlyMap.get(month) || { month, spend: 0, clicks: 0, impressions: 0, conversions: 0 }
    existing.spend += d.cost
    existing.clicks += d.clicks
    existing.impressions += d.impressions
    existing.conversions += d.conversions
    monthlyMap.set(month, existing)
  }
  
  return Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month))
}
