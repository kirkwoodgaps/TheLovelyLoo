"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

interface SpendData {
  month: string
  google: number
  facebook: number
}

export function AdSpendChart({
  data,
  hasGoogleData,
}: {
  data: SpendData[]
  hasGoogleData: boolean
}) {
  const hasAnyData = data.length > 0

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">
              Ad Spend by Platform
            </CardTitle>
            <CardDescription>
              Monthly ad spend comparison
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {hasGoogleData ? (
              <Badge
                variant="outline"
                className="border-primary/30 bg-primary/5 text-xs text-primary"
              >
                Google Ads Live
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-xs text-muted-foreground border-border/60"
              >
                Awaiting Data
              </Badge>
            )}
            <Badge
              variant="outline"
              className="text-xs text-muted-foreground border-border/60"
            >
              Facebook Sample
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {hasAnyData ? (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                />
                <XAxis
                  dataKey="month"
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
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip
                  formatter={(value: number) => [
                    `$${value.toLocaleString()}`,
                    undefined,
                  ]}
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
                <Bar
                  dataKey="google"
                  name="Google Ads"
                  fill="var(--color-chart-2)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="facebook"
                  name="Facebook Ads"
                  fill="var(--color-chart-3)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-[300px] flex-col items-center justify-center rounded-lg bg-secondary/30">
            <p className="text-sm font-medium text-muted-foreground">
              No ad data yet
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Run the Google Ads Script to populate this chart
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
