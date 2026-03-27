import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

interface GoogleAdsRow {
  date: string
  campaign: string
  cost: number
  clicks: number
  impressions: number
  conversions: number
  ctr: number
  cost_per_conversion: number
}

// Common column name variations for Google Ads exports
const COLUMN_MAPPINGS: Record<string, string[]> = {
  date: ["date", "day", "report date"],
  campaign: ["campaign", "campaign name"],
  cost: ["cost", "spend", "cost (usd)", "amount spent", "cost (all)"],
  clicks: ["clicks", "link clicks"],
  impressions: ["impressions", "impr", "impr."],
  conversions: ["conversions", "conv", "conv.", "all conv.", "all conversions", "results"],
  ctr: ["ctr", "click-through rate", "click through rate"],
  cost_per_conversion: ["cost / conv.", "cost per conversion", "cost/conv", "cost per result"],
}

function findColumn(headers: string[], fieldName: string): number {
  const variations = COLUMN_MAPPINGS[fieldName] || [fieldName]
  for (const variation of variations) {
    const index = headers.findIndex(h => h.toLowerCase().trim() === variation.toLowerCase())
    if (index !== -1) return index
  }
  return -1
}

function parseNumber(value: string): number {
  if (!value) return 0
  // Remove currency symbols, commas, and percentage signs
  const cleaned = value.replace(/[$,€£%]/g, "").trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

function parseDate(value: string): string | null {
  if (!value) return null
  
  // Try various date formats
  const cleaned = value.trim()
  
  // Format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned
  }
  
  // Format: MM/DD/YYYY or M/D/YYYY
  const slashMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slashMatch) {
    const [, month, day, year] = slashMatch
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
  }
  
  // Format: MMM DD, YYYY (e.g., "Mar 15, 2026")
  const dateObj = new Date(cleaned)
  if (!isNaN(dateObj.getTime())) {
    return dateObj.toISOString().split("T")[0]
  }
  
  return null
}

export async function POST(request: Request) {
  try {
    const { csvData } = await request.json()

    if (!csvData || typeof csvData !== "string") {
      return NextResponse.json({ error: "No CSV data provided" }, { status: 400 })
    }

    // Parse CSV
    const lines = csvData.split(/\r?\n/).filter(line => line.trim())
    
    if (lines.length < 2) {
      return NextResponse.json({ error: "CSV must have headers and at least one data row" }, { status: 400 })
    }

    // Find header row (skip any summary rows at the top)
    let headerIndex = 0
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const lowerLine = lines[i].toLowerCase()
      if (lowerLine.includes("date") || lowerLine.includes("campaign") || lowerLine.includes("day")) {
        headerIndex = i
        break
      }
    }

    const headers = lines[headerIndex].split(",").map(h => h.replace(/"/g, "").trim())
    
    // Find column indices
    const dateIdx = findColumn(headers, "date")
    const campaignIdx = findColumn(headers, "campaign")
    const costIdx = findColumn(headers, "cost")
    const clicksIdx = findColumn(headers, "clicks")
    const impressionsIdx = findColumn(headers, "impressions")
    const conversionsIdx = findColumn(headers, "conversions")
    const ctrIdx = findColumn(headers, "ctr")
    const costPerConvIdx = findColumn(headers, "cost_per_conversion")

    if (dateIdx === -1) {
      return NextResponse.json({ 
        error: "Could not find Date column. Expected columns: Date, Campaign, Cost, Clicks, Impressions, Conversions" 
      }, { status: 400 })
    }

    // Parse data rows
    const rows: GoogleAdsRow[] = []
    for (let i = headerIndex + 1; i < lines.length; i++) {
      const line = lines[i]
      if (!line.trim()) continue
      
      // Handle CSV with quoted fields
      const values: string[] = []
      let current = ""
      let inQuotes = false
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === "," && !inQuotes) {
          values.push(current.trim())
          current = ""
        } else {
          current += char
        }
      }
      values.push(current.trim())

      const date = parseDate(values[dateIdx])
      if (!date) continue // Skip rows without valid date
      
      // Skip summary/total rows
      const campaignValue = campaignIdx !== -1 ? values[campaignIdx]?.replace(/"/g, "") : ""
      if (campaignValue?.toLowerCase().includes("total")) continue

      rows.push({
        date,
        campaign: campaignValue || "All Campaigns",
        cost: costIdx !== -1 ? parseNumber(values[costIdx]) : 0,
        clicks: clicksIdx !== -1 ? parseNumber(values[clicksIdx]) : 0,
        impressions: impressionsIdx !== -1 ? parseNumber(values[impressionsIdx]) : 0,
        conversions: conversionsIdx !== -1 ? parseNumber(values[conversionsIdx]) : 0,
        ctr: ctrIdx !== -1 ? parseNumber(values[ctrIdx]) : 0,
        cost_per_conversion: costPerConvIdx !== -1 ? parseNumber(values[costPerConvIdx]) : 0,
      })
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: "No valid data rows found in CSV" }, { status: 400 })
    }

    // Insert into database
    const supabase = await createClient()
    
    // Upsert rows (update if date+campaign exists, insert if not)
    const { error } = await supabase
      .from("google_ads_metrics")
      .upsert(rows, { 
        onConflict: "date,campaign",
        ignoreDuplicates: false 
      })

    if (error) {
      console.error("Supabase error:", error)
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      imported: rows.length,
      dateRange: {
        from: rows.reduce((min, r) => r.date < min ? r.date : min, rows[0].date),
        to: rows.reduce((max, r) => r.date > max ? r.date : max, rows[0].date),
      }
    })
  } catch (error) {
    console.error("Import error:", error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to import data" 
    }, { status: 500 })
  }
}
