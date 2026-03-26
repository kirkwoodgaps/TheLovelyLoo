"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Phone } from "lucide-react"

interface CallRecord {
  date: string
  campaign: string
  adGroup: string
  callType: string
  callerCountry: string
  callerAreaCode: string
  durationSec: number
  startTime: string
  endTime: string
  callStatus: string
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

function formatCallDate(dateStr: string): string {
  if (!dateStr) return ""
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return dateStr
  }
}

function formatCallTime(timeStr: string): string {
  if (!timeStr) return ""
  try {
    const d = new Date(timeStr)
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  } catch {
    return timeStr
  }
}

function getStatusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  const s = status.toLowerCase()
  if (s.includes("received") || s.includes("answered")) return "default"
  if (s.includes("missed")) return "destructive"
  return "secondary"
}

export function PhoneCallLog({ calls }: { calls: CallRecord[] }) {
  if (calls.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Phone className="h-4 w-4 text-primary" />
            Phone Call Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 py-10 text-center">
            <Phone className="h-8 w-8 text-muted-foreground/40" />
            <p className="mt-2 text-sm font-medium text-muted-foreground">
              Awaiting phone call data
            </p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground/70">
              Run the updated Google Ads Script to export call detail records to
              the &quot;PhoneCalls&quot; sheet tab.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Summary stats
  const totalCalls = calls.length
  const totalDuration = calls.reduce((s, c) => s + c.durationSec, 0)
  const avgDuration =
    totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0
  const answered = calls.filter(
    (c) =>
      c.callStatus.toLowerCase().includes("received") ||
      c.callStatus.toLowerCase().includes("answered")
  ).length
  const answerRate =
    totalCalls > 0 ? Math.round((answered / totalCalls) * 100) : 0

  // Calls by campaign
  const byCampaign: Record<string, number> = {}
  for (const c of calls) {
    byCampaign[c.campaign] = (byCampaign[c.campaign] || 0) + 1
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Phone className="h-4 w-4 text-primary" />
          Phone Call Log
          <Badge variant="secondary" className="ml-auto text-xs font-normal">
            {totalCalls} calls (last 90 days)
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-secondary/50 px-3 py-2">
            <p className="text-xs text-muted-foreground">Total Calls</p>
            <p className="text-lg font-bold text-foreground">{totalCalls}</p>
          </div>
          <div className="rounded-lg bg-secondary/50 px-3 py-2">
            <p className="text-xs text-muted-foreground">Answered</p>
            <p className="text-lg font-bold text-foreground">
              {answered}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                ({answerRate}%)
              </span>
            </p>
          </div>
          <div className="rounded-lg bg-secondary/50 px-3 py-2">
            <p className="text-xs text-muted-foreground">Avg Duration</p>
            <p className="text-lg font-bold text-foreground">
              {formatDuration(avgDuration)}
            </p>
          </div>
          <div className="rounded-lg bg-secondary/50 px-3 py-2">
            <p className="text-xs text-muted-foreground">Campaigns</p>
            <p className="text-lg font-bold text-foreground">
              {Object.keys(byCampaign).length}
            </p>
          </div>
        </div>

        {/* Call Records Table */}
        <div className="overflow-x-auto rounded-lg border border-border/60">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-[100px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Date
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Time
                </TableHead>
                <TableHead className="min-w-[180px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Campaign
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Area Code
                </TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Duration
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Type
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calls.slice(0, 50).map((call, i) => (
                <TableRow key={i} className="hover:bg-muted/20">
                  <TableCell className="whitespace-nowrap text-sm">
                    {formatCallDate(call.date)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatCallTime(call.startTime)}
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate text-sm font-medium">
                    {call.campaign}
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-sm">
                    {call.callerAreaCode || "--"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right font-mono text-sm">
                    {formatDuration(call.durationSec)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={getStatusVariant(call.callStatus)}
                      className="whitespace-nowrap text-xs"
                    >
                      {call.callStatus || "Unknown"}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {call.callType || "--"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {calls.length > 50 && (
          <p className="text-center text-xs text-muted-foreground">
            Showing 50 of {calls.length} calls
          </p>
        )}
      </CardContent>
    </Card>
  )
}
