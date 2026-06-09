"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useRouter, usePathname, useSearchParams } from "next/navigation"

const rangeLabels: Record<string, string> = {
  "7days": "Last 7 days",
  "30days": "Last 30 days",
  "3months": "Last 3 months",
  "6months": "Last 6 months",
  "12months": "Last 12 months",
  "alltime": "All time",
}

const DEFAULT_RANGE = "7days"

export function RangeSelector({ className }: { className?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentRange = searchParams.get("range") || DEFAULT_RANGE

  function handleRangeChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === DEFAULT_RANGE) {
      params.delete("range")
    } else {
      params.set("range", value)
    }
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  return (
    <Select value={currentRange} onValueChange={handleRangeChange}>
      <SelectTrigger className={className ?? "w-[150px] border-border/60 bg-card text-sm"}>
        <SelectValue>{rangeLabels[currentRange] || rangeLabels[DEFAULT_RANGE]}</SelectValue>
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
  )
}
