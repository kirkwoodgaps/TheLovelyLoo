import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { KpiCards } from "@/components/dashboard/kpi-cards"
import { LeadsOverTimeChart } from "@/components/dashboard/leads-over-time-chart"
import { AdSpendChart } from "@/components/dashboard/ad-spend-chart"
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

  const [gfResult, googleAdsResult] = await Promise.allSettled([
    getDashboardData(),
    fetchGoogleAdsSummary(),
  ])

  const data = gfResult.status === "fulfilled" ? gfResult.value : null
  const googleAds = googleAdsResult.status === "fulfilled" ? googleAdsResult.value : null

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
  console.log("[v0] Cutoff date:", cutoffDate.toISOString())
  console.log("[v0] Google Ads daily count:", googleAds?.daily.length)
  console.log("[v0] Google Ads daily dates:", googleAds?.daily.slice(0, 5).map(d => d.date))
  console.log("[v0] Google Ads daily latest:", googleAds?.daily[googleAds.daily.length - 1]?.date)
  
  const filteredDaily = googleAds?.daily.filter(
    (d) => new Date(d.date) >= cutoffDate
  ) ?? []
  console.log("[v0] Filtered daily count:", filteredDaily.length)
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
  // monthlyData uses short month names but has a year field
  const filteredMonthlyLeads = (data?.monthlyData ?? []).filter((m) => {
    const d = new Date(m.month + "-01")
    return d >= cutoffDate
  })
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

  // ── Ad Spend chart from filtered monthly ─────────────────
  const adSpendData = googleAds?.hasData
    ? filteredMonthly.map((m) => ({
        month: formatMonthLabel(m.month),
        google: m.spend,
        facebook: 0,
      }))
    : []

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
            <LeadSourcesChart data={data?.formBreakdown ?? []} />
          </div>
        </section>

        {/* Ad Spend + Weekly Activity */}
        <section
          className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3"
          aria-label="Ad spend and weekly activity"
        >
          <div className="lg:col-span-2">
            <AdSpendChart
              data={adSpendData}
              hasGoogleData={googleAds?.hasData ?? false}
            />
          </div>
          <div>
            <WeeklyActivity data={data?.weeklyData ?? []} />
          </div>
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
