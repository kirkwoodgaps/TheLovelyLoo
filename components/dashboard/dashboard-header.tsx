"use client"

import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useRouter, usePathname } from "next/navigation"

type SourceStatus = {
  name: string
  status: "live" | "pending" | "sample" | "error"
}

export function DashboardHeader({
  sources,
  currentRange = "6months",
}: {
  sources: SourceStatus[]
  currentRange?: string
}) {
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

  const rangeLabels: Record<string, string> = {
    "7days": "Last 7 days",
    "30days": "Last 30 days",
    "3months": "Last 3 months",
    "6months": "Last 6 months",
    "12months": "Last 12 months",
    "alltime": "All time",
  }

  return (
    <header className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Image
            src="/images/logo-main.png"
            alt="The Lovely Loo"
            width={180}
            height={50}
            className="w-[140px] sm:w-[180px]"
            style={{ width: "auto", height: "auto" }}
            priority
          />
          <div className="h-8 w-px bg-border/60 hidden sm:block" />
          <p className="text-sm text-muted-foreground hidden sm:block">
            Leads & Ad Spend Dashboard
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={currentRange} onValueChange={handleRangeChange}>
            <SelectTrigger className="w-[160px] border-border/60 bg-card text-sm">
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
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground mr-1">
          Data Sources:
        </span>
        {sources.map((s) => (
          <Badge
            key={s.name}
            variant="outline"
            className={
              s.status === "live"
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : s.status === "pending"
                  ? "border-amber-300 bg-amber-50 text-amber-700"
                  : s.status === "error"
                    ? "border-red-300 bg-red-50 text-red-700"
                    : "border-border bg-muted text-muted-foreground"
            }
          >
            <span className="relative mr-1.5 flex h-1.5 w-1.5">
              {s.status === "live" && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              )}
              <span
                className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
                  s.status === "live"
                    ? "bg-emerald-500"
                    : s.status === "pending"
                      ? "bg-amber-500"
                      : s.status === "error"
                        ? "bg-red-500"
                        : "bg-muted-foreground/50"
                }`}
              />
            </span>
            {s.name}
          </Badge>
        ))}
      </div>
    </header>
  )
}
