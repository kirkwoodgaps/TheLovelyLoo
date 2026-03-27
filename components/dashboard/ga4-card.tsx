"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { BarChart3 } from "lucide-react"
import type { GA4Data } from "@/lib/ga4"

interface GA4CardProps {
  data: GA4Data | null
  isConnected: boolean
}

export function GA4Card({ data, isConnected }: GA4CardProps) {
  if (!isConnected) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <BarChart3 className="h-5 w-5" />
            Google Analytics
          </CardTitle>
          <CardDescription>Website traffic and user behavior</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <p className="text-sm text-muted-foreground mb-4">
            Connect Google to view Analytics data
          </p>
          <Button asChild>
            <a href="/api/auth/google">
              Connect Google Account
            </a>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!data?.hasData) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <BarChart3 className="h-5 w-5" />
            Google Analytics
          </CardTitle>
          <CardDescription>Website traffic and user behavior</CardDescription>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No Analytics data available for this period.
          </p>
        </CardContent>
      </Card>
    )
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <BarChart3 className="h-5 w-5" />
          Google Analytics
        </CardTitle>
        <CardDescription>Website traffic and user behavior</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Summary Metrics */}
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="rounded-lg border border-border/40 bg-muted/20 p-3 text-center">
            <p className="text-xs font-medium text-muted-foreground uppercase">Sessions</p>
            <p className="mt-1 text-lg font-bold text-foreground">{data.totalSessions.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-border/40 bg-muted/20 p-3 text-center">
            <p className="text-xs font-medium text-muted-foreground uppercase">Users</p>
            <p className="mt-1 text-lg font-bold text-foreground">{data.totalUsers.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-border/40 bg-muted/20 p-3 text-center">
            <p className="text-xs font-medium text-muted-foreground uppercase">Page Views</p>
            <p className="mt-1 text-lg font-bold text-foreground">{data.totalPageViews.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-border/40 bg-muted/20 p-3 text-center">
            <p className="text-xs font-medium text-muted-foreground uppercase">Avg Duration</p>
            <p className="mt-1 text-lg font-bold text-foreground">{formatDuration(data.avgSessionDuration)}</p>
          </div>
          <div className="rounded-lg border border-border/40 bg-muted/20 p-3 text-center">
            <p className="text-xs font-medium text-muted-foreground uppercase">Bounce Rate</p>
            <p className="mt-1 text-lg font-bold text-foreground">{data.bounceRate}%</p>
          </div>
        </div>

        {/* Traffic Sources Table */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Traffic Sources</h4>
          <div className="overflow-x-auto max-h-[150px] overflow-y-auto rounded-md border border-border/40">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Source / Medium</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sessions</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Users</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.trafficSources.slice(0, 5).map((source, i) => (
                  <TableRow key={`${source.source}-${source.medium}-${i}`} className="border-border/40">
                    <TableCell className="font-medium text-foreground text-sm">
                      {source.source} / {source.medium}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{source.sessions}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{source.users}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Top Pages Table */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Top Pages</h4>
          <div className="overflow-x-auto max-h-[150px] overflow-y-auto rounded-md border border-border/40">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Page</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Views</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topPages.slice(0, 5).map((page) => (
                  <TableRow key={page.page} className="border-border/40">
                    <TableCell className="font-medium text-foreground text-sm truncate max-w-[250px]">{page.page}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{page.pageViews}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
