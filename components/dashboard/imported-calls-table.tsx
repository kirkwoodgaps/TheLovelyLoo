"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Phone, PhoneIncoming, PhoneMissed, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CallRecord {
  id: string
  start_time: string
  duration_seconds: number
  caller_country_code: string
  caller_area_code: string
  caller_phone_number: string
  status: string
  call_source: string
  call_type: string
  campaign: string
}

function formatDuration(seconds: number): string {
  if (!seconds) return "0:00"
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatPhoneNumber(phone: string): string {
  if (!phone) return "-"
  // Already formatted like "+1 904-294-4215"
  if (phone.includes("-") || phone.includes(" ")) return phone
  // Format raw numbers
  const cleaned = phone.replace(/\D/g, "")
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  if (cleaned.length === 11) {
    return `+${cleaned[0]} (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
  }
  return phone
}

export function ImportedCallsTable() {
  const [calls, setCalls] = useState<CallRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCalls = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/import/google-ads-calls")
      const data = await response.json()
      if (response.ok) {
        setCalls(data.calls || [])
      } else {
        setError(data.error || "Failed to fetch calls")
      }
    } catch (err) {
      setError("Failed to fetch calls")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCalls()
  }, [])

  const totalCalls = calls.length
  const answeredCalls = calls.filter((c) => c.status?.toLowerCase() === "received").length
  const missedCalls = totalCalls - answeredCalls
  const totalDuration = calls.reduce((sum, c) => sum + (c.duration_seconds || 0), 0)
  const avgDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0

  if (calls.length === 0 && !isLoading) {
    return null // Don't show empty table
  }

  return (
    <Card className="border-border/60 bg-card shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">
              Imported Call Records
            </CardTitle>
            <CardDescription className="mt-1">
              Google Ads call details with full phone numbers
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchCalls}
              disabled={isLoading}
              className="h-8 px-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            <Badge variant="outline" className="font-mono">
              {totalCalls} calls
            </Badge>
          </div>
        </div>

        {totalCalls > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                Total Calls
              </div>
              <div className="mt-1 text-xl font-bold text-foreground">{totalCalls}</div>
            </div>
            <div className="rounded-lg bg-emerald-50 p-3">
              <div className="flex items-center gap-2 text-xs text-emerald-700">
                <PhoneIncoming className="h-3.5 w-3.5" />
                Answered
              </div>
              <div className="mt-1 text-xl font-bold text-emerald-700">{answeredCalls}</div>
            </div>
            <div className="rounded-lg bg-red-50 p-3">
              <div className="flex items-center gap-2 text-xs text-red-700">
                <PhoneMissed className="h-3.5 w-3.5" />
                Missed
              </div>
              <div className="mt-1 text-xl font-bold text-red-700">{missedCalls}</div>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="text-xs text-muted-foreground">Avg Duration</div>
              <div className="mt-1 text-xl font-bold text-foreground">
                {formatDuration(avgDuration)}
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
            {error}
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Loading calls...
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <div className="inline-block min-w-full align-middle px-6">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[160px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Date/Time
                    </TableHead>
                    <TableHead className="w-[150px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Phone Number
                    </TableHead>
                    <TableHead className="w-[80px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Duration
                    </TableHead>
                    <TableHead className="w-[100px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Status
                    </TableHead>
                    <TableHead className="min-w-[200px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Campaign
                    </TableHead>
                    <TableHead className="w-[120px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Call Type
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calls.slice(0, 50).map((call) => (
                    <TableRow key={call.id} className="group">
                      <TableCell className="py-3 text-sm text-foreground">
                        {formatDateTime(call.start_time)}
                      </TableCell>
                      <TableCell className="py-3 font-mono text-sm font-medium text-foreground">
                        {formatPhoneNumber(call.caller_phone_number)}
                      </TableCell>
                      <TableCell className="py-3 font-mono text-sm text-muted-foreground">
                        {formatDuration(call.duration_seconds)}
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge
                          variant="outline"
                          className={
                            call.status?.toLowerCase() === "received"
                              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                              : "border-red-300 bg-red-50 text-red-700"
                          }
                        >
                          {call.status || "Unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 text-sm text-muted-foreground max-w-[200px] truncate">
                        {call.campaign || "-"}
                      </TableCell>
                      <TableCell className="py-3 text-sm text-muted-foreground">
                        {call.call_type || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {calls.length > 50 && (
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  Showing 50 of {calls.length} records
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
