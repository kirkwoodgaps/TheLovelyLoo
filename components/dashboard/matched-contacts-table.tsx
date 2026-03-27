"use client"

import { useState, useEffect } from "react"
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
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw, Phone, Users, FileText } from "lucide-react"

interface Contact {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  company: string | null
  lead_source: string | null
  status: string | null
}

interface Call {
  id: string
  start_time: string
  caller_phone_number: string
  caller_name: string | null
  campaign: string | null
  status: string | null
}

interface Lead {
  id: string
  name: string
  email: string
  phone: string
  formName: string
  dateCreated: string
}

interface MatchedContact {
  contact: Contact
  matchedCalls: Call[]
  matchedLeads: Lead[]
  matchSources: string[]
}

interface MatchData {
  matches: MatchedContact[]
  totalContacts: number
  totalMatched: number
  totalCalls: number
  totalLeads: number
}

function formatPhone(phone: string | null): string {
  if (!phone) return "-"
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  return phone
}

function formatDate(dateStr: string): string {
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

export function MatchedContactsTable() {
  const [data, setData] = useState<MatchData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const fetchMatches = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/matched-contacts")
      const result = await response.json()
      if (response.ok) {
        setData(result)
      } else {
        setError(result.error || "Failed to fetch matches")
      }
    } catch (err) {
      setError("Failed to fetch matches")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMatches()
  }, [])

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  if (isLoading) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Finding matched contacts...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardContent className="py-8 text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchMatches}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.matches.length === 0) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Matched Contacts</CardTitle>
              <CardDescription>
                17hats contacts matched to Call Records or Recent Leads by phone number
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchMatches}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm py-8 text-center">
            No matches found between 17hats contacts and call records or leads.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Matched Contacts</CardTitle>
            <CardDescription>
              17hats contacts matched to Call Records or Recent Leads by phone number
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {data.totalMatched} matched
              </span>
              <span className="flex items-center gap-1">
                <Phone className="h-4 w-4" />
                {data.totalCalls} calls
              </span>
              <span className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                {data.totalLeads} leads
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={fetchMatches}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-x-auto -mx-6 px-6">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[180px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Contact Name
                </TableHead>
                <TableHead className="w-[140px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Phone
                </TableHead>
                <TableHead className="w-[200px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Email
                </TableHead>
                <TableHead className="w-[150px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Company
                </TableHead>
                <TableHead className="w-[150px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Match Sources
                </TableHead>
                <TableHead className="w-[80px] text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
                  Matches
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.matches.map((match) => (
                <>
                  <TableRow 
                    key={match.contact.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleRow(match.contact.id)}
                  >
                    <TableCell className="py-3">
                      <div className="font-medium text-foreground">
                        {match.contact.first_name} {match.contact.last_name}
                      </div>
                      {match.contact.lead_source && (
                        <div className="text-xs text-muted-foreground">
                          {match.contact.lead_source}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-3 font-mono text-sm">
                      {formatPhone(match.contact.phone)}
                    </TableCell>
                    <TableCell className="py-3 text-sm text-muted-foreground truncate max-w-[200px]">
                      {match.contact.email || "-"}
                    </TableCell>
                    <TableCell className="py-3 text-sm text-muted-foreground truncate max-w-[150px]">
                      {match.contact.company || "-"}
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex flex-wrap gap-1">
                        {match.matchSources.map((source) => (
                          <Badge
                            key={source}
                            variant="outline"
                            className={
                              source === "Call Records"
                                ? "border-blue-300 bg-blue-50 text-blue-700 text-xs"
                                : "border-emerald-300 bg-emerald-50 text-emerald-700 text-xs"
                            }
                          >
                            {source}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      <Badge variant="secondary" className="text-xs">
                        {match.matchedCalls.length + match.matchedLeads.length}
                      </Badge>
                    </TableCell>
                  </TableRow>
                  {expandedRows.has(match.contact.id) && (
                    <TableRow key={`${match.contact.id}-details`} className="bg-muted/30">
                      <TableCell colSpan={6} className="py-4">
                        <div className="space-y-4 pl-4">
                          {match.matchedCalls.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                Matched Call Records ({match.matchedCalls.length})
                              </h4>
                              <div className="space-y-1 text-sm">
                                {match.matchedCalls.slice(0, 5).map((call) => (
                                  <div key={call.id} className="flex items-center gap-4 text-muted-foreground">
                                    <span className="font-mono">{formatDate(call.start_time)}</span>
                                    <span>{call.caller_name || "-"}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {call.status || "Unknown"}
                                    </Badge>
                                    <span className="text-xs">{call.campaign || "-"}</span>
                                  </div>
                                ))}
                                {match.matchedCalls.length > 5 && (
                                  <div className="text-xs text-muted-foreground">
                                    +{match.matchedCalls.length - 5} more calls
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          {match.matchedLeads.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Matched Recent Leads ({match.matchedLeads.length})
                              </h4>
                              <div className="space-y-1 text-sm">
                                {match.matchedLeads.slice(0, 5).map((lead) => (
                                  <div key={lead.id} className="flex items-center gap-4 text-muted-foreground">
                                    <span className="font-mono">{formatDate(lead.dateCreated)}</span>
                                    <span>{lead.name}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {lead.formName}
                                    </Badge>
                                    <span className="text-xs truncate max-w-[200px]">{lead.email}</span>
                                  </div>
                                ))}
                                {match.matchedLeads.length > 5 && (
                                  <div className="text-xs text-muted-foreground">
                                    +{match.matchedLeads.length - 5} more leads
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
        {data.matches.length > 50 && (
          <p className="text-xs text-muted-foreground text-center mt-4">
            Showing first 50 of {data.matches.length} matched contacts
          </p>
        )}
      </CardContent>
    </Card>
  )
}
