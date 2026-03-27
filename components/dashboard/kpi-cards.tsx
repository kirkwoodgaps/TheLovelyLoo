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

  const cards: {
    label: string
    value: string
    icon: typeof Users
    showTrend: boolean
    change?: number
    sublabel?: string
  }[] = [
    {
      label: "All-Time Leads",
      value: formatNumber(data.totalLeads),
      icon: Users,
      showTrend: false,
      sublabel: "Lifetime total",
    },
    {
      label: "This Month",
      value: formatNumber(data.currentMonthLeads),
      icon: TrendingUp,
      showTrend: true,
      change: data.totalLeadsChange,
    },
    ...data.formCounts.map((form) => ({
      label: form.title,
      value: formatNumber(form.totalEntries),
      icon: formIcons[form.id] || FileText,
      showTrend: false,
      sublabel: "All time",
    })),
  ]

  // Add Google Ads KPIs if data exists
  if (data.hasGoogleAds && data.googleAdsSpend !== undefined) {
    cards.push({
      label: "Google Ad Spend",
      value: formatCurrency(data.googleAdsSpend),
      icon: DollarSign,
      showTrend: false,
      sublabel: rl,
    })
    cards.push({
      label: "Google Conversions",
      value: formatNumber(data.googleAdsConversions || 0),
      icon: Target,
      showTrend: false,
      sublabel: rl,
    })
  }

  // Determine grid cols based on card count
  const gridClass =
    cards.length <= 6
      ? "grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6"
      : "grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-8"

  return (
    <div className={gridClass}>
      {cards.map((card) => (
        <Card key={card.label} className="border-border/60 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {card.label}
              </span>
              <card.icon className="h-4 w-4 text-muted-foreground/60" />
            </div>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {card.value}
              </span>
            </div>
            {card.showTrend && card.change !== undefined && (
              <div className="mt-1">
                <TrendBadge value={card.change} />
                <span className="ml-1.5 text-xs text-muted-foreground">
                  vs last month
                </span>
              </div>
            )}
            {card.sublabel && !card.showTrend && (
              <p className="mt-1 text-xs text-muted-foreground/70">
                {card.sublabel}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
