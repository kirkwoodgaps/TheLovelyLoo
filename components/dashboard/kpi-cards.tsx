"use client"

import { Card, CardContent } from "@/components/ui/card"
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

const formIcons: Record<string, typeof Users> = {
  "1": MessageSquare,
  "2": ClipboardList,
  "3": FileText,
  "4": CalendarCheck,
}

export function KpiCards({ data }: { data: KpiData }) {
  const rl = data.rangeLabel || "Last 6 months"

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
      label: "This Month",
      value: formatNumber(data.currentMonthLeads),
      icon: TrendingUp,
      showTrend: true,
      change: data.totalLeadsChange,
      sublabel: "vs last month",
    },
  ]

  // Add Google Ads KPIs if data exists
  if (data.hasGoogleAds && data.googleAdsSpend !== undefined) {
    dynamicCards.push({
      label: "Google Ad Spend",
      value: formatCurrency(data.googleAdsSpend),
      icon: DollarSign,
      showTrend: false,
      sublabel: rl,
    })
    dynamicCards.push({
      label: "Google Conversions",
      value: formatNumber(data.googleAdsConversions || 0),
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

      {/* Dynamic Timeframe Section */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Selected Period</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
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
      </div>
    </div>
  )
}
