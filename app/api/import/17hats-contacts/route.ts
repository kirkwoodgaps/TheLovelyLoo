import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

interface ContactRecord {
  first_name: string
  last_name: string
  email: string
  phone: string
  company: string | null
  lead_source: string | null
  status: string | null
  tags: string | null
  notes: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  created_date: string | null
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

function parseDate(dateStr: string): string | null {
  if (!dateStr) return null
  
  try {
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) {
      return d.toISOString()
    }
  } catch {
    return null
  }
  
  return null
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] 17hats import: Starting...")
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      console.log("[v0] 17hats import: No file provided")
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }
    
    console.log("[v0] 17hats import: File received:", file.name, file.size, "bytes")

    const csvText = await file.text()
    const rows = parseCSV(csvText)

    if (rows.length === 0) {
      return NextResponse.json({ error: "No data found in CSV" }, { status: 400 })
    }

    // Map CSV columns to database columns
    // 17hats export columns vary but typically include:
    // First Name, Last Name, Email, Phone, Company, Lead Source, Status, Tags, Notes, etc.
    const records: ContactRecord[] = rows.map((row) => ({
      first_name:
        row["First Name"] || row["First name"] || row["first_name"] || row["FirstName"] || "",
      last_name:
        row["Last Name"] || row["Last name"] || row["last_name"] || row["LastName"] || "",
      email:
        row["Email"] || row["email"] || row["E-mail"] || row["Email Address"] || "",
      phone:
        row["Phone"] || row["phone"] || row["Phone Number"] || row["Mobile"] || row["Cell"] || "",
      company:
        row["Company"] || row["company"] || row["Business"] || row["Company Name"] || null,
      lead_source:
        row["Lead Source"] || row["Source"] || row["lead_source"] || row["Referral Source"] || null,
      status:
        row["Status"] || row["status"] || row["Contact Status"] || null,
      tags:
        row["Tags"] || row["tags"] || row["Categories"] || null,
      notes:
        row["Notes"] || row["notes"] || row["Comments"] || row["Description"] || null,
      address:
        row["Address"] || row["address"] || row["Street"] || row["Street Address"] || null,
      city:
        row["City"] || row["city"] || null,
      state:
        row["State"] || row["state"] || row["Province"] || null,
      zip:
        row["Zip"] || row["zip"] || row["ZIP"] || row["Postal Code"] || row["Zip Code"] || null,
      created_date: parseDate(
        row["Created Date"] || row["Created"] || row["Date Created"] || row["created_date"] || ""
      ),
    }))

    // Filter out records without email or phone
    const validRecords = records.filter((r) => r.email || r.phone)

    if (validRecords.length === 0) {
      console.log("[v0] 17hats import: No valid records (need email or phone)")
      return NextResponse.json(
        { error: "No valid records found (need email or phone)" },
        { status: 400 }
      )
    }

    console.log("[v0] 17hats import: Inserting", validRecords.length, "records")
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("contacts_17hats")
      .insert(validRecords)
      .select()

    if (error) {
      console.error("[v0] 17hats import error:", error)
      return NextResponse.json(
        { error: "Failed to import records", details: error.message },
        { status: 500 }
      )
    }
    
    console.log("[v0] 17hats import: Success, imported", data?.length)

    return NextResponse.json({
      success: true,
      imported: data?.length || validRecords.length,
      skipped: records.length - validRecords.length,
      message: `Successfully imported ${data?.length || validRecords.length} contacts`,
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
      .from("contacts_17hats")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ contacts: data })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
