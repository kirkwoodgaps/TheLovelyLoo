import { createClient } from "@/lib/supabase/server"
import { getAllLeadsForMatching } from "@/lib/gravity-forms"
import { NextResponse } from "next/server"

// Normalize phone number for comparison (remove all non-digits)
function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return ""
  return phone.replace(/\D/g, "")
}

// Get last 10 digits for matching (handles country code variations)
function getPhoneKey(phone: string): string {
  const normalized = normalizePhone(phone)
  // Take last 10 digits for US numbers, or full number if shorter
  return normalized.length >= 10 ? normalized.slice(-10) : normalized
}

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Fetch all data sources in parallel
    const [contactsResult, callsResult, allLeads] = await Promise.all([
      supabase.from("contacts_17hats").select("id, first_name, last_name, email, phone, company, lead_source, status"),
      supabase.from("google_ads_calls").select("id, start_time, caller_phone_number, caller_name, campaign, status"),
      getAllLeadsForMatching(), // Get ALL leads for complete matching
    ])

    if (contactsResult.error) {
      return NextResponse.json({ error: "Failed to fetch contacts", details: contactsResult.error.message }, { status: 500 })
    }
    if (callsResult.error) {
      return NextResponse.json({ error: "Failed to fetch calls", details: callsResult.error.message }, { status: 500 })
    }

    const contacts = contactsResult.data || []
    const calls = callsResult.data || []

    // Build phone lookup maps
    const callPhoneMap = new Map<string, typeof calls[0][]>()
    for (const call of calls) {
      const key = getPhoneKey(call.caller_phone_number)
      if (key) {
        if (!callPhoneMap.has(key)) callPhoneMap.set(key, [])
        callPhoneMap.get(key)!.push(call)
      }
    }

    const leadPhoneMap = new Map<string, typeof allLeads[0][]>()
    for (const lead of allLeads) {
      const key = getPhoneKey(lead.phone)
      if (key) {
        if (!leadPhoneMap.has(key)) leadPhoneMap.set(key, [])
        leadPhoneMap.get(key)!.push(lead)
      }
    }

    // Find matches for each contact
    const matchedContacts: {
      contact: typeof contacts[0]
      matchedCalls: typeof calls
      matchedLeads: typeof allLeads
      matchSources: string[]
    }[] = []

    for (const contact of contacts) {
      const phoneKey = getPhoneKey(contact.phone)
      if (!phoneKey) continue

      const matchedCalls = callPhoneMap.get(phoneKey) || []
      const matchedLeads = leadPhoneMap.get(phoneKey) || []

      if (matchedCalls.length > 0 || matchedLeads.length > 0) {
        const matchSources: string[] = []
        if (matchedCalls.length > 0) matchSources.push("Call Records")
        if (matchedLeads.length > 0) matchSources.push("Recent Leads")
        
        matchedContacts.push({
          contact,
          matchedCalls,
          matchedLeads,
          matchSources,
        })
      }
    }

    // Sort by number of matches (most matches first)
    matchedContacts.sort((a, b) => 
      (b.matchedCalls.length + b.matchedLeads.length) - (a.matchedCalls.length + a.matchedLeads.length)
    )

    return NextResponse.json({
      matches: matchedContacts,
      totalContacts: contacts.length,
      totalMatched: matchedContacts.length,
      totalCalls: calls.length,
      totalLeads: allLeads.length,
    })
  } catch (error) {
    console.error("Matched contacts error:", error)
    return NextResponse.json(
      { error: "Failed to find matches", details: String(error) },
      { status: 500 }
    )
  }
}
