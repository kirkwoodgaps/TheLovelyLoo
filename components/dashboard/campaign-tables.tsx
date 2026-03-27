"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface PlatformMetrics {
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

function PlatformSummary({ metrics, showPhoneCalls }: { metrics: PlatformMetrics; showPhoneCalls?: boolean }) {
  const totalPhoneCalls = metrics.campaigns.reduce((sum, c) => sum + (c.phoneCalls || 0), 0)
  const items = [
    { label: "Total Spend", value: `$${metrics.spend.toLocaleString()}` },
    { label: "Impressions", value: metrics.impressions.toLocaleString() },
    { label: "Clicks", value: metrics.clicks.toLocaleString() },
    { label: "CTR", value: `${metrics.ctr}%` },
    { label: "Conversions", value: metrics.conversions.toString() },
    { label: "Cost/Conv.", value: `$${metrics.costPerConversion.toFixed(2)}` },
  ]
  if (showPhoneCalls && totalPhoneCalls > 0) {
    items.push({ label: "Phone Calls", value: totalPhoneCalls.toLocaleString() })
  }
  return (
    <div className="mb-4 grid grid-cols-3 gap-4 lg:grid-cols-7">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg bg-secondary/50 p-3">
          <p className="text-xs font-medium text-muted-foreground">
            {item.label}
          </p>
          <p className="mt-0.5 text-lg font-bold text-foreground">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  )
}

function CampaignTable({
  campaigns,
  showPhoneCalls,
}: {
  campaigns: PlatformMetrics["campaigns"]
  showPhoneCalls?: boolean
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-border/60">
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Campaign
            </TableHead>
            <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Spend
            </TableHead>
            <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Impressions
            </TableHead>
            <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Clicks
            </TableHead>
            <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              CTR
            </TableHead>
            <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Conversions
            </TableHead>
            {showPhoneCalls && (
              <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Phone Calls
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map((campaign) => (
            <TableRow key={campaign.name} className="border-border/40">
              <TableCell className="font-medium text-foreground">
                {campaign.name}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                ${campaign.spend.toLocaleString()}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {campaign.impressions.toLocaleString()}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {campaign.clicks.toLocaleString()}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {campaign.ctr}%
              </TableCell>
              <TableCell className="text-right font-mono text-sm font-semibold">
                {campaign.conversions}
              </TableCell>
              {showPhoneCalls && (
                <TableCell className="text-right font-mono text-sm">
                  {(campaign.phoneCalls || 0).toLocaleString()}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function PendingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <p className="text-sm font-medium text-muted-foreground">
        No Google Ads data yet
      </p>
      <p className="mt-1 text-xs text-muted-foreground/70">
        Add your Google Ads data to the connected spreadsheet
      </p>
    </div>
  )
}

export function CampaignTables({
  googleMetrics,
}: {
  googleMetrics: PlatformMetrics | null
}) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div>
            <CardTitle className="text-base font-semibold">
              Google Ads Campaign Performance
            </CardTitle>
            <CardDescription>
              Detailed metrics by campaign
            </CardDescription>
          </div>
          {googleMetrics ? (
            <Badge
              variant="outline"
              className="border-primary/30 bg-primary/5 text-xs text-primary"
            >
              Live
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-xs text-muted-foreground border-border/60"
            >
              Pending
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {googleMetrics ? (
          <>
            <PlatformSummary metrics={googleMetrics} showPhoneCalls />
            <CampaignTable campaigns={googleMetrics.campaigns} showPhoneCalls />
          </>
        ) : (
          <PendingState />
        )}
      </CardContent>
    </Card>
  )
}
