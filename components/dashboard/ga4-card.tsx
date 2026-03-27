"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BarChart3, TrendingUp, TrendingDown, Users, Eye, Clock, ArrowUpRight } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import type { GA4Data } from "@/lib/ga4"

interface GA4CardProps {
  data: GA4Data | null
  isConnected: boolean
  currentRange?: string
}

const rangeLabels: Record<string, string> = {
  "7days": "Last 7 days",
  "30days": "Last 30 days",
  "3months": "Last 3 months",
  "6months": "Last 6 months",
  "12months": "Last 12 months",
  "alltime": "All time",
}

export function GA4Card({ data, isConnected, currentRange = "6months" }: GA4CardProps) {
  const router = useRouter()
  const pathname = usePathname()

  function handleRangeChange(value: string) {
    const params = new URLSearchParams()
    if (value !== "6months") {
      params.set("range", value)
    }
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <BarChart3 className="h-5 w-5" />
                Google Analytics
              </CardTitle>
              <CardDescription>Website traffic and user behavior</CardDescription>
            </div>
            <Select value={currentRange} onValueChange={handleRangeChange}>
              <SelectTrigger className="w-[140px] border-border/60 bg-card text-sm">
                <SelectValue>{rangeLabels[currentRange] || "Last 6 months"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 days</SelectItem>
                <SelectItem value="30days">Last 30 days</SelectItem>
                <SelectItem value="3months">Last 3 months</SelectItem>
                <SelectItem value="6months">Last 6 months</SelectItem>
                <SelectItem value="12months">Last 12 months</SelectItem>
                <SelectItem value="alltime">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No Analytics data available for this period. Make sure the Google Analytics Data API is enabled in your Google Cloud Console.
          </p>
          <Button variant="outline" className="mt-4" asChild>
            <a href="https://console.developers.google.com/apis/api/analyticsdata.googleapis.com/overview" target="_blank" rel="noopener noreferrer">
              Enable GA4 API
              <ArrowUpRight className="ml-1 h-4 w-4" />
            </a>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Calculate insights
  const avgPagesPerSession = data.totalSessions > 0 
    ? (data.totalPageViews / data.totalSessions).toFixed(1) 
    : "0"
  
  const newUserPercent = data.totalUsers > 0 
    ? Math.round((data.newUsers / data.totalUsers) * 100) 
    : 0
  
  const topSource = data.trafficSources[0]
  const topPage = data.topPages[0]

  // Determine engagement quality
  const engagementScore = (() => {
    let score = 0
    if (data.bounceRate < 50) score += 2
    else if (data.bounceRate < 70) score += 1
    if (data.avgSessionDuration > 120) score += 2
    else if (data.avgSessionDuration > 60) score += 1
    if (parseFloat(avgPagesPerSession) > 2) score += 2
    else if (parseFloat(avgPagesPerSession) > 1.5) score += 1
    return score
  })()

  const engagementLevel = engagementScore >= 5 ? "Excellent" : engagementScore >= 3 ? "Good" : "Needs improvement"
  const engagementColor = engagementScore >= 5 ? "text-emerald-600" : engagementScore >= 3 ? "text-amber-600" : "text-red-600"

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <BarChart3 className="h-5 w-5" />
              Google Analytics
            </CardTitle>
            <CardDescription>Website traffic and user behavior</CardDescription>
          </div>
          <Select value={currentRange} onValueChange={handleRangeChange}>
            <SelectTrigger className="w-[140px] border-border/60 bg-card text-sm">
              <SelectValue>{rangeLabels[currentRange] || "Last 6 months"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="3months">Last 3 months</SelectItem>
              <SelectItem value="6months">Last 6 months</SelectItem>
              <SelectItem value="12months">Last 12 months</SelectItem>
              <SelectItem value="alltime">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <p className="text-xs font-medium uppercase">Sessions</p>
            </div>
            <p className="mt-1 text-xl font-bold text-foreground">{data.totalSessions.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <p className="text-xs font-medium uppercase">Users</p>
            </div>
            <p className="mt-1 text-xl font-bold text-foreground">{data.totalUsers.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{newUserPercent}% new</p>
          </div>
          <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Eye className="h-3.5 w-3.5" />
              <p className="text-xs font-medium uppercase">Page Views</p>
            </div>
            <p className="mt-1 text-xl font-bold text-foreground">{data.totalPageViews.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{avgPagesPerSession} per session</p>
          </div>
          <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <p className="text-xs font-medium uppercase">Avg Duration</p>
            </div>
            <p className="mt-1 text-xl font-bold text-foreground">{formatDuration(data.avgSessionDuration)}</p>
          </div>
          <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              {data.bounceRate < 50 ? (
                <TrendingDown className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
              )}
              <p className="text-xs font-medium uppercase">Bounce Rate</p>
            </div>
            <p className="mt-1 text-xl font-bold text-foreground">{data.bounceRate}%</p>
            <p className="text-xs text-muted-foreground">{data.bounceRate < 50 ? "Good" : data.bounceRate < 70 ? "Average" : "High"}</p>
          </div>
          <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <BarChart3 className="h-3.5 w-3.5" />
              <p className="text-xs font-medium uppercase">Engagement</p>
            </div>
            <p className={`mt-1 text-xl font-bold ${engagementColor}`}>{engagementLevel}</p>
          </div>
        </div>

        {/* Insights Section */}
        <div className="rounded-lg border border-border/40 bg-gradient-to-r from-muted/30 to-muted/10 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">Key Insights</h4>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {topSource && (
              <li className="flex items-start gap-2">
                <span className="text-foreground font-medium">Top traffic source:</span>
                {topSource.source} / {topSource.medium} ({topSource.sessions} sessions, {data.totalSessions > 0 ? Math.round((topSource.sessions / data.totalSessions) * 100) : 0}% of total)
              </li>
            )}
            {topPage && (
              <li className="flex items-start gap-2">
                <span className="text-foreground font-medium">Most viewed page:</span>
                <span className="truncate">{topPage.page}</span> ({topPage.pageViews} views)
              </li>
            )}
            <li className="flex items-start gap-2">
              <span className="text-foreground font-medium">Visitor profile:</span>
              {newUserPercent > 70 ? "Mostly new visitors - focus on conversion" : newUserPercent > 40 ? "Healthy mix of new and returning visitors" : "Strong returning visitor base - focus on retention"}
            </li>
          </ul>
        </div>

        {/* Tables Row */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Traffic Sources Table */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Traffic Sources</h4>
            <div className="overflow-x-auto max-h-[180px] overflow-y-auto rounded-md border border-border/40">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Source / Medium</TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sessions</TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.trafficSources.slice(0, 6).map((source, i) => (
                    <TableRow key={`${source.source}-${source.medium}-${i}`} className="border-border/40">
                      <TableCell className="font-medium text-foreground text-sm">
                        {source.source} / {source.medium}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{source.sessions}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-muted-foreground">
                        {data.totalSessions > 0 ? Math.round((source.sessions / data.totalSessions) * 100) : 0}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Top Pages Table */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Top Pages</h4>
            <div className="overflow-x-auto max-h-[180px] overflow-y-auto rounded-md border border-border/40">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Page</TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Views</TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topPages.slice(0, 6).map((page) => (
                    <TableRow key={page.page} className="border-border/40">
                      <TableCell className="font-medium text-foreground text-sm truncate max-w-[200px]" title={page.page}>{page.page}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{page.pageViews}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-muted-foreground">
                        {data.totalPageViews > 0 ? Math.round((page.pageViews / data.totalPageViews) * 100) : 0}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
