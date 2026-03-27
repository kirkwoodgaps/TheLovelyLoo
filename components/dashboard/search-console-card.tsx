"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Search, ExternalLink } from "lucide-react"
import type { SearchConsoleData } from "@/lib/search-console"

interface SearchConsoleCardProps {
  data: SearchConsoleData | null
  isConnected: boolean
}

export function SearchConsoleCard({ data, isConnected }: SearchConsoleCardProps) {
  if (!isConnected) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Search className="h-5 w-5" />
            Google Search Console
          </CardTitle>
          <CardDescription>Organic search performance</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <p className="text-sm text-muted-foreground mb-4">
            Connect Google to view Search Console data
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
            <Search className="h-5 w-5" />
            Google Search Console
          </CardTitle>
          <CardDescription>Organic search performance</CardDescription>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No Search Console data available for this period.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Search className="h-5 w-5" />
          Google Search Console
        </CardTitle>
        <CardDescription>Organic search performance</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Summary Metrics */}
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-border/40 bg-muted/20 p-3 text-center">
            <p className="text-xs font-medium text-muted-foreground uppercase">Clicks</p>
            <p className="mt-1 text-lg font-bold text-foreground">{data.totalClicks.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-border/40 bg-muted/20 p-3 text-center">
            <p className="text-xs font-medium text-muted-foreground uppercase">Impressions</p>
            <p className="mt-1 text-lg font-bold text-foreground">{data.totalImpressions.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-border/40 bg-muted/20 p-3 text-center">
            <p className="text-xs font-medium text-muted-foreground uppercase">CTR</p>
            <p className="mt-1 text-lg font-bold text-foreground">{data.avgCtr}%</p>
          </div>
          <div className="rounded-lg border border-border/40 bg-muted/20 p-3 text-center">
            <p className="text-xs font-medium text-muted-foreground uppercase">Avg Position</p>
            <p className="mt-1 text-lg font-bold text-foreground">{data.avgPosition}</p>
          </div>
        </div>

        {/* Top Queries Table */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Top Search Queries</h4>
          <div className="overflow-x-auto max-h-[200px] overflow-y-auto rounded-md border border-border/40">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Query</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Clicks</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Impr</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topQueries.slice(0, 5).map((query) => (
                  <TableRow key={query.query} className="border-border/40">
                    <TableCell className="font-medium text-foreground text-sm truncate max-w-[200px]">{query.query}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{query.clicks}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{query.impressions}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{query.position}</TableCell>
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
