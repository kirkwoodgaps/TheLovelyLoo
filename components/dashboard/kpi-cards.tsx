"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Users,
  TrendingUp,
  CalendarCheck,
  FileText,
  MessageSquare,
  ClipboardList,
  DollarSign,
  Target,
} from "lucide-react"

interface CampaignMetrics {
  spend: number
  impressions: number
  clicks: number
  ctr: number
  conversions: number
  costPerConversion: number
  campaigns: {
    name: string
    spend: number
    impressions: number
    clicks: number
    conversions: number
    ctr: number
    phoneCalls?: number
  }[]
}

interface KpiData {
  totalLeads: number
  rangeLeads: number
  totalLeadsChange: number
  currentMonthLeads: number
  previousMonthLeads: number
  formCounts: { id: string; title: string; totalEntries: number }[]
  googleAdsSpend?: number
  googleAdsConversions?: number
  hasGoogleAds?: boolean
  rangeLabel?: string
  currentRange?: string
}

function TrendBadge({ value }: { value: number }) {
  const isPositive = value > 0
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${
        isPositive
          ? "bg-primary/10 text-primary"
          : "bg-destructive/10 text-destructive"
      }`}
    >
      {isPositive ? "+" : ""}
      {value}%
    </span>
  )
}

function formatNumber(value: number) {
  return value.toLocaleString()
}

function formatCurrency(value: number) {
  return "$" + value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

// Money with cents: thousands separators + exactly 2 decimal places.
function formatMoney(value: number) {
  return "$" + value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const formIcons: Record<string, typeof Users> = {
  "1": MessageSquare,
  "2": ClipboardList,
  "3": FileText,
  "4": CalendarCheck,
}

const rangeLabels: Record<string, string> = {
  "7days": "Last 7 days",
  "30days": "Last 30 days",
  "3months": "Last 3 months",
  "6months": "Last 6 months",
  "12months": "Last 12 months",
  "alltime": "All time",
}

export function KpiCards({
  data,
  googleMetrics,
  adsIsLive = false,
  adsConnected = false,
}: {
  data: KpiData
  googleMetrics: CampaignMetrics | null
  adsIsLive?: boolean
  adsConnected?: boolean
}) {
  const currentRange = data.currentRange || "6months"
  const rl = data.rangeLabel || "Last 6 months"

  function handleConnectAds() {
    const url = "/api/auth/google"
    // Google blocks its sign-in page from loading inside an iframe (like the
    // v0 preview). If we're framed, break out into a new top-level tab.
    if (typeof window !== "undefined" && window.self !== window.top) {
      window.open(url, "_blank", "noopener,noreferrer")
    } else {
      window.location.href = url
    }
  }

  // Lifetime/All-Time metrics (never change with date range)
  const lifetimeCards: {
    label: string
    value: string
    icon: typeof Users
    sublabel: string
  }[] = [
    {
      label: "All-Time Leads",
      value: formatNumber(data.totalLeads),
      icon: Users,
      sublabel: "Lifetime total",
    },
    ...data.formCounts.map((form) => ({
      label: form.title,
      value: formatNumber(form.totalEntries),
      icon: formIcons[form.id] || FileText,
      sublabel: "All time",
    })),
  ]

  // Dynamic metrics (change based on selected date range)
  const dynamicCards: {
    label: string
    value: string
    icon: typeof Users
    showTrend: boolean
    change?: number
    sublabel: string
  }[] = [
    {
      label: "Website Leads",
      value: formatNumber(data.rangeLeads),
      icon: TrendingUp,
      showTrend: true,
      change: data.totalLeadsChange,
      sublabel: "vs prior period",
    },
  ]

  // Add Google Ads KPIs if data exists
  if (data.hasGoogleAds && data.googleAdsSpend !== undefined) {
    dynamicCards.push({
      label: "Google Ad Spend",
      value: formatMoney(data.googleAdsSpend),
      icon: DollarSign,
      showTrend: false,
      sublabel: rl,
    })
    dynamicCards.push({
      label: "Google Conversions",
      value: formatNumber(Math.round(data.googleAdsConversions || 0)),
      icon: Target,
      showTrend: false,
      sublabel: rl,
    })
  }

  return (
    <div className="space-y-6">
      {/* Lifetime Totals Section */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Lifetime Totals</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {lifetimeCards.map((card) => (
            <Card key={card.label} className="border-border/60 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {card.label}
                  </span>
                  <card.icon className="h-4 w-4 text-muted-foreground/60" />
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold tracking-tight text-foreground">
                    {card.value}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  {card.sublabel}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Dynamic Timeframe Section with Campaign Performance */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground">Selected Period</h3>
          <span className="text-sm font-medium text-foreground">{rangeLabels[currentRange] || rl}</span>
        </div>
        {/* KPI Cards - Horizontal Row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-4">
          {dynamicCards.map((card) => (
            <Card key={card.label} className="border-border/60 shadow-sm bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {card.label}
                  </span>
                  <card.icon className="h-4 w-4 text-muted-foreground/60" />
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold tracking-tight text-foreground">
                    {card.value}
                  </span>
                </div>
                {card.showTrend && card.change !== undefined ? (
                  <div className="mt-1">
                    <TrendBadge value={card.change} />
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      {card.sublabel}
                    </span>
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    {card.sublabel}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Google Ads Campaign Performance */}
        <div>
          {googleMetrics ? (
              <Card className="border-border/60 shadow-sm h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base font-semibold">
                        Google Ads Campaign Performance
                      </CardTitle>
                      <CardDescription>
                        Detailed metrics by campaign (enabled campaigns only)
                      </CardDescription>
                    </div>
                    {!adsIsLive && (
                      <Button size="sm" variant="outline" onClick={handleConnectAds} className="shrink-0">
                        {adsConnected ? "Reconnect Google Ads" : "Connect Google Ads"}
                      </Button>
                    )}
                  </div>
                  {!adsIsLive && (
                    <p className="mt-2 text-xs text-muted-foreground/80">
                      Showing imported data. Connect your Google account to pull live, up-to-date campaign metrics.
                    </p>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  {/* Summary Row */}
                  <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div className="rounded-lg border border-border/40 bg-muted/20 p-3 text-center">
                      <p className="text-xs font-medium text-muted-foreground uppercase">Total Spend</p>
                      <p className="mt-1 text-lg font-bold text-foreground">{formatMoney(googleMetrics.spend)}</p>
                    </div>
                    <div className="rounded-lg border border-border/40 bg-muted/20 p-3 text-center">
                      <p className="text-xs font-medium text-muted-foreground uppercase">Clicks</p>
                      <p className="mt-1 text-lg font-bold text-foreground">{googleMetrics.clicks.toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg border border-border/40 bg-muted/20 p-3 text-center">
                      <p className="text-xs font-medium text-muted-foreground uppercase">Conversions</p>
                      <p className="mt-1 text-lg font-bold text-foreground">{Math.round(googleMetrics.conversions)}</p>
                    </div>
                    <div className="rounded-lg border border-border/40 bg-muted/20 p-3 text-center">
                      <p className="text-xs font-medium text-muted-foreground uppercase">Cost/Conv.</p>
                      <p className="mt-1 text-lg font-bold text-foreground">${googleMetrics.costPerConversion.toFixed(2)}</p>
                    </div>
                  </div>
                  
                  {/* Campaign Table */}
                  <div className="overflow-x-auto max-h-[200px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border/60">
                          <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Campaign</TableHead>
                          <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Spend</TableHead>
                          <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Clicks</TableHead>
                          <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Conversions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {googleMetrics.campaigns.map((campaign) => (
                          <TableRow key={campaign.name} className="border-border/40">
                            <TableCell className="font-medium text-foreground">{campaign.name}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{formatMoney(campaign.spend)}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{campaign.clicks.toLocaleString()}</TableCell>
                            <TableCell className="text-right font-mono text-sm font-semibold">{Math.round(campaign.conversions)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/60 shadow-sm h-full flex items-center justify-center">
                <CardContent className="py-12 text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    Google Ads data not available. Connect your Google account to pull live campaign metrics, or import CSV data.
                  </p>
                  <Button variant="outline" onClick={handleConnectAds}>
                    {adsConnected ? "Reconnect Google Ads" : "Connect Google Ads"}
                  </Button>
                </CardContent>
              </Card>
          )}
        </div>
      </div>
    </div>
  )
}
