import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// Allow larger file uploads - App Router uses route segment config
export const maxDuration = 60
export const dynamic = 'force-dynamic'

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
  const lines = csv.split(/\r?\n/)
  if (lines.length < 2) return []

  // First, detect the delimiter and parse headers properly
  // 17hats exports can use commas with quoted fields containing commas
  const headerLine = lines[0]
  
  // Parse the header line handling quoted fields
  const headers = parseCSVLine(headerLine).map((h) => h.trim().replace(/^"|"$/g, ""))
  
  console.log("[v0] Detected", headers.length, "columns in CSV")
  console.log("[v0] First few headers:", headers.slice(0, 10))
  
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line || !line.trim()) continue
    
    try {
      const values = parseCSVLine(line)
      
      const row: Record<string, string> = {}
      headers.forEach((header, idx) => {
        if (header) {
          row[header] = values[idx]?.trim().replace(/^"|"$/g, "") || ""
        }
      })
      rows.push(row)
    } catch (e) {
      console.log("[v0] Skipping malformed row", i, e)
      continue
    }
  }

  console.log("[v0] Parsed", rows.length, "rows from CSV")
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
    let formData: FormData
    try {
      formData = await request.formData()
    } catch (formError) {
      return NextResponse.json(
        { error: "Failed to read form data. File may be too large (max 4MB).", details: String(formError) },
        { status: 413 }
      )
    }
    
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }
    
    // Check file size (10MB limit with config)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 10MB.` },
        { status: 413 }
      )
    }

    const csvText = await file.text()
    const rows = parseCSV(csvText)

    if (rows.length === 0) {
      return NextResponse.json({ error: "No data found in CSV" }, { status: 400 })
    }

    // Map CSV columns to database columns
    // 17hats export has: Full Name, First Name, Last Name, Company Name, Type, Email, then many specific person email/phone columns
    // Column indices: 0=Full Name, 1=First Name, 2=Last Name, 3=Company Name, 4=Type, 5=Email
    // Then columns 6+ are named like "Person Name Email" or "Primary Email"
    // Phone columns appear later in the file
    const records: ContactRecord[] = rows.map((row) => {
      // Find the first non-empty email
      // Priority: Email column (6th column) > Primary Email > any column with "Email" containing @
      let email = row["Email"] || ""
      if (!email || !email.includes("@")) {
        email = row["Primary Email"] || ""
      }
      if (!email || !email.includes("@")) {
        // Look for any column ending with "Email" that has a valid value
        for (const [key, value] of Object.entries(row)) {
          if (key.endsWith("Email") && value && value.includes("@")) {
            email = value
            break
          }
        }
      }
      
      // Find the first non-empty phone
      // Look for "Primary Phone" first, then any column ending with "Phone"
      let phone = row["Phone"] || ""
      if (!phone || !phone.match(/\d/)) {
        phone = row["Primary Phone"] || ""
      }
      if (!phone || !phone.match(/\d/)) {
        for (const [key, value] of Object.entries(row)) {
          if (key.endsWith("Phone") && value && value.match(/\d/)) {
            phone = value
            break
          }
        }
      }
      
      // Get address from the end of the file where location data tends to be
      const address = row["Address"] || row["Street Address"] || null
      
      return {
        first_name:
          row["First Name"] || row["First name"] || row["first_name"] || row["FirstName"] || "",
        last_name:
          row["Last Name"] || row["Last name"] || row["last_name"] || row["LastName"] || "",
        email: email || "",
        phone: phone || "",
        company:
          row["Company Name"] || row["Company"] || row["company"] || row["Business"] || null,
        lead_source:
          row["Lead Source"] || row["Source"] || row["lead_source"] || row["Referral Source"] || null,
        status:
          row["Type"] || row["Status"] || row["status"] || row["Contact Status"] || null,
        tags:
          row["Tags"] || row["tags"] || row["Categories"] || null,
        notes:
          row["Notes"] || row["notes"] || row["Comments"] || row["Description"] || null,
        address,
        city:
          row["City"] || row["city"] || null,
        state:
          row["State"] || row["state"] || row["Province"] || null,
        zip:
          row["Zip"] || row["zip"] || row["ZIP"] || row["Postal Code"] || row["Zip Code"] || null,
        created_date: parseDate(
          row["Created Date"] || row["Created"] || row["Date Created"] || row["created_date"] || ""
        ),
      }
    })

    console.log("[v0] Sample record:", JSON.stringify(records[0], null, 2))

    // Filter out records without email or phone
    const validRecords = records.filter((r) => r.email || r.phone)

    if (validRecords.length === 0) {
      return NextResponse.json(
        { error: "No valid records found (need email or phone)" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from("contacts")
      .insert(validRecords)
      .select()

    if (error) {
      return NextResponse.json(
        { error: "Failed to import records", details: error.message },
        { status: 500 }
      )
    }

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
      .from("contacts")
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
