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
import { Users, RefreshCw, Mail, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Contact {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  company: string | null
  lead_source: string | null
  status: string | null
  tags: string | null
  city: string | null
  state: string | null
  created_date: string | null
  imported_at: string
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-"
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatPhoneNumber(phone: string): string {
  if (!phone) return "-"
  const cleaned = phone.replace(/\D/g, "")
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  if (cleaned.length === 11) {
    return `+${cleaned[0]} (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
  }
  return phone
}

export function ImportedContactsTable() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchContacts = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/import/17hats-contacts")
      const data = await response.json()
      if (response.ok) {
        setContacts(data.contacts || [])
      } else {
        setError(data.error || "Failed to fetch contacts")
      }
    } catch (err) {
      setError("Failed to fetch contacts")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchContacts()
  }, [])

  const totalContacts = contacts.length
  const withEmail = contacts.filter((c) => c.email).length
  const withPhone = contacts.filter((c) => c.phone).length

  // Get unique lead sources
  const leadSources = Array.from(
    new Set(contacts.map((c) => c.lead_source).filter(Boolean))
  ).slice(0, 5)

  if (contacts.length === 0 && !isLoading) {
    return null // Don't show empty table
  }

  return (
    <Card className="border-border/60 bg-card shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">
              17hats Contacts
            </CardTitle>
            <CardDescription className="mt-1">
              Imported CRM contacts from 17hats
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchContacts}
              disabled={isLoading}
              className="h-8 px-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            <Badge variant="outline" className="font-mono">
              {totalContacts} contacts
            </Badge>
          </div>
        </div>

        {totalContacts > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                Total Contacts
              </div>
              <div className="mt-1 text-xl font-bold text-foreground">{totalContacts}</div>
            </div>
            <div className="rounded-lg bg-blue-50 p-3">
              <div className="flex items-center gap-2 text-xs text-blue-700">
                <Mail className="h-3.5 w-3.5" />
                With Email
              </div>
              <div className="mt-1 text-xl font-bold text-blue-700">{withEmail}</div>
            </div>
            <div className="rounded-lg bg-emerald-50 p-3">
              <div className="flex items-center gap-2 text-xs text-emerald-700">
                <Phone className="h-3.5 w-3.5" />
                With Phone
              </div>
              <div className="mt-1 text-xl font-bold text-emerald-700">{withPhone}</div>
            </div>
          </div>
        )}

        {leadSources.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground">Lead Sources:</span>
            {leadSources.map((source) => (
              <Badge key={source} variant="secondary" className="text-xs">
                {source}
              </Badge>
            ))}
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
            Loading contacts...
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 max-h-[400px] overflow-y-auto">
            <div className="inline-block min-w-full align-middle px-6">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[180px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Name
                    </TableHead>
                    <TableHead className="w-[200px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Email
                    </TableHead>
                    <TableHead className="w-[140px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Phone
                    </TableHead>
                    <TableHead className="w-[120px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Source
                    </TableHead>
                    <TableHead className="w-[100px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Status
                    </TableHead>
                    <TableHead className="w-[120px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Location
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.slice(0, 50).map((contact) => (
                    <TableRow key={contact.id} className="group">
                      <TableCell className="py-3">
                        <div className="font-medium text-foreground">
                          {contact.first_name} {contact.last_name}
                        </div>
                        {contact.company && (
                          <div className="text-xs text-muted-foreground">
                            {contact.company}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-3 text-sm text-muted-foreground">
                        {contact.email || "-"}
                      </TableCell>
                      <TableCell className="py-3 font-mono text-sm text-muted-foreground">
                        {formatPhoneNumber(contact.phone)}
                      </TableCell>
                      <TableCell className="py-3">
                        {contact.lead_source ? (
                          <Badge variant="secondary" className="text-xs">
                            {contact.lead_source}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3">
                        {contact.status ? (
                          <Badge variant="outline" className="text-xs">
                            {contact.status}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 text-sm text-muted-foreground">
                        {contact.city && contact.state
                          ? `${contact.city}, ${contact.state}`
                          : contact.city || contact.state || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {contacts.length > 50 && (
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  Showing 50 of {contacts.length} contacts
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
