"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

interface MonthlyData {
  month: string
  contact: number
  quote: number
  newQuote: number
  popup: number
  total: number
}

function formatMonthTick(yyyyMm: string): string {
  if (!yyyyMm || !yyyyMm.includes("-")) return yyyyMm
  const [year, month] = yyyyMm.split("-")
  const d = new Date(parseInt(year), parseInt(month) - 1)
  return d.toLocaleDateString("en-US", { month: "short" })
}

export function LeadsOverTimeChart({ data }: { data: MonthlyData[] }) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          Leads Over Time
        </CardTitle>
        <CardDescription>
          Monthly leads by form (last 6 months) &mdash; Live from Gravity Forms
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorNewQuote" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-chart-1)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-chart-1)"
                    stopOpacity={0}
                  />
                </linearGradient>
                <linearGradient id="colorPopup" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-chart-2)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-chart-2)"
                    stopOpacity={0}
                  />
                </linearGradient>
                <linearGradient id="colorQuote" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-chart-3)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-chart-3)"
                    stopOpacity={0}
                  />
                </linearGradient>
                <linearGradient id="colorContact" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-chart-4)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-chart-4)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
              />
              <XAxis
                dataKey="month"
                tickFormatter={formatMonthTick}
                tick={{
                  fontSize: 12,
                  fill: "var(--color-muted-foreground)",
                }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{
                  fontSize: 12,
                  fill: "var(--color-muted-foreground)",
                }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
              />
              <Area
                type="monotone"
                dataKey="newQuote"
                name="New Quote"
                stroke="var(--color-chart-1)"
                fill="url(#colorNewQuote)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="popup"
                name="Quote Popup"
                stroke="var(--color-chart-2)"
                fill="url(#colorPopup)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="quote"
                name="Quote (Legacy)"
                stroke="var(--color-chart-3)"
                fill="url(#colorQuote)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="contact"
                name="Contact"
                stroke="var(--color-chart-4)"
                fill="url(#colorContact)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
