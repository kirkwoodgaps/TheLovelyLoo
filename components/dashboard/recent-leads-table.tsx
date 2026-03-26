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
import type { NormalizedEntry } from "@/lib/gravity-forms"

function getFormBadgeClasses(formId: string) {
  switch (formId) {
    case "1":
      return "bg-chart-4/10 text-chart-4 border-chart-4/20"
    case "2":
      return "bg-chart-3/10 text-chart-3 border-chart-3/20"
    case "3":
      return "bg-chart-1/10 text-chart-1 border-chart-1/20"
    case "4":
      return "bg-chart-2/10 text-chart-2 border-chart-2/20"
    default:
      return "bg-secondary text-secondary-foreground border-border"
  }
}

function getStatusClasses(status: string) {
  switch (status) {
    case "New":
      return "bg-primary/10 text-primary border-primary/20"
    case "Read":
      return "bg-muted text-muted-foreground border-border"
    default:
      return "bg-secondary text-secondary-foreground border-border"
  }
}

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr + " UTC")
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return dateStr
  }
}

function formatTime(dateStr: string) {
  try {
    const d = new Date(dateStr + " UTC")
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })
  } catch {
    return ""
  }
}

export function RecentLeadsTable({ leads }: { leads: NormalizedEntry[] }) {
  if (leads.length === 0) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
            Recent Leads
          </CardTitle>
          <CardDescription>
            No leads data available
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">
              Recent Leads
            </CardTitle>
            <CardDescription>
              Latest inquiries from Gravity Forms (live)
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs">
            {leads.length} shown
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-x-auto -mx-6 px-6">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow className="border-border/60">
                <TableHead className="w-[180px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Name
                </TableHead>
                <TableHead className="w-[110px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Form
                </TableHead>
                <TableHead className="w-[100px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Event Date
                </TableHead>
                <TableHead className="w-[140px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Location
                </TableHead>
                <TableHead className="w-[160px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Details
                </TableHead>
                <TableHead className="w-[70px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </TableHead>
                <TableHead className="w-[110px] text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Received
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id} className="border-border/40">
                  <TableCell className="max-w-[180px]">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground text-sm">
                        {lead.name || "N/A"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {lead.email}
                      </p>
                      {lead.phone && (
                        <p className="truncate text-xs text-muted-foreground">
                          {lead.phone}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[110px]">
                    <Badge
                      variant="outline"
                      className={`whitespace-nowrap text-xs ${getFormBadgeClasses(lead.formId)}`}
                    >
                      {lead.formName}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[100px] text-sm text-muted-foreground whitespace-nowrap">
                    {lead.eventDate || "--"}
                  </TableCell>
                  <TableCell className="max-w-[140px]">
                    <p className="truncate text-sm text-muted-foreground" title={lead.location}>
                      {lead.location || "--"}
                    </p>
                  </TableCell>
                  <TableCell className="max-w-[160px]">
                    <p className="truncate text-sm text-muted-foreground" title={lead.details}>
                      {lead.details || "--"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`whitespace-nowrap text-xs ${getStatusClasses(lead.status)}`}
                    >
                      {lead.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <div className="text-sm font-mono text-muted-foreground">
                      {formatDate(lead.dateCreated)}
                    </div>
                    <div className="text-xs font-mono text-muted-foreground/70">
                      {formatTime(lead.dateCreated)}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
