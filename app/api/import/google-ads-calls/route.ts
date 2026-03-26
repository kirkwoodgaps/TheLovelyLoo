import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

interface CallRecord {
  start_time: string
  duration_seconds: number
  caller_country_code: string
  caller_area_code: string
  caller_phone_number: string
  recording_url: string | null
  status: string
  call_source: string
  call_type: string
  campaign: string
}

function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.trim().split("\n")
  if (lines.length < 2) return []

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""))
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((header, idx) => {
      row[header] = values[idx]?.trim().replace(/^"|"$/g, "") || ""
    })
    rows.push(row)
  }

  return rows
}

function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === "," && !inQuotes) {
      values.push(current)
      current = ""
    } else {
      current += char
    }
  }
  values.push(current)

  return values
}

function parseDuration(durationStr: string): number {
  // Handle formats like "452", "7:32", "00:07:32"
  if (!durationStr) return 0
  
  const cleaned = durationStr.replace(/[^0-9:]/g, "")
  
  if (cleaned.includes(":")) {
    const parts = cleaned.split(":").map(Number)
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2]
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1]
    }
  }
  
  return parseInt(cleaned, 10) || 0
}

function parseDateTime(dateStr: string): string {
  // Handle formats like "Feb 27, 2026, 5:00:00 AM" or "2026-02-27 05:00:00"
  if (!dateStr) return new Date().toISOString()
  
  try {
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) {
      return d.toISOString()
    }
  } catch {
    // Fall through to manual parsing
  }
  
  return new Date().toISOString()
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const csvText = await file.text()
    const rows = parseCSV(csvText)

    if (rows.length === 0) {
      return NextResponse.json({ error: "No data found in CSV" }, { status: 400 })
    }

    // Map CSV columns to database columns
    // Expected columns from Google Ads export:
    // Start time, Duration (seconds), Caller country code, Caller area code, 
    // Caller phone number, Recording, Status, Call source, Call type, Campaign
    const records: CallRecord[] = rows.map((row) => ({
      start_time: parseDateTime(
        row["Start time"] || row["Start Time"] || row["start_time"] || ""
      ),
      duration_seconds: parseDuration(
        row["Duration (seconds)"] || row["Duration"] || row["duration_seconds"] || row["duration"] || "0"
      ),
      caller_country_code:
        row["Caller country code"] || row["Country code"] || row["caller_country_code"] || "",
      caller_area_code:
        row["Caller area code"] || row["Area code"] || row["caller_area_code"] || "",
      caller_phone_number:
        row["Caller phone number"] || row["Phone number"] || row["caller_phone_number"] || "",
      recording_url: row["Recording"] || row["recording_url"] || null,
      status: row["Status"] || row["status"] || "",
      call_source: row["Call source"] || row["call_source"] || "",
      call_type: row["Call type"] || row["call_type"] || "",
      campaign: row["Campaign"] || row["campaign"] || "",
    }))

    const supabase = await createClient()

    // Insert records, skip duplicates based on start_time + phone number
    const { data, error } = await supabase
      .from("google_ads_calls")
      .upsert(records, {
        onConflict: "start_time,caller_phone_number",
        ignoreDuplicates: true,
      })
      .select()

    if (error) {
      // If upsert fails due to no unique constraint, just insert
      const { data: insertData, error: insertError } = await supabase
        .from("google_ads_calls")
        .insert(records)
        .select()

      if (insertError) {
        console.error("Import error:", insertError)
        return NextResponse.json(
          { error: "Failed to import records", details: insertError.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        imported: insertData?.length || records.length,
        message: `Successfully imported ${insertData?.length || records.length} call records`,
      })
    }

    return NextResponse.json({
      success: true,
      imported: data?.length || records.length,
      message: `Successfully imported ${data?.length || records.length} call records`,
    })
  } catch (error) {
    console.error("Import error:", error)
    return NextResponse.json(
      { error: "Failed to process CSV file", details: String(error) },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("google_ads_calls")
      .select("*")
      .order("start_time", { ascending: false })
      .limit(500)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ calls: data })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
